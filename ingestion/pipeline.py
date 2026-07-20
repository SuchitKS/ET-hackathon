"""Ingestion pipeline: walk the corpus, extract text + entities, populate the
knowledge graph and vector store.
"""
import os
import sys
import re

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ingestion.extractors.docx_extractor import extract_docx
from ingestion.extractors.xlsx_extractor import extract_xlsx
from ingestion.extractors.txt_extractor import extract_txt
from ingestion.extractors.image_extractor import extract_image
from ingestion.extractors.pid_vision_extractor import extract_pid_structure
from ingestion.entity_extraction import extract_entities, extract_entities_enhanced
from graph.knowledge_graph import KnowledgeGraph
from retrieval.vector_store import VectorStore

EXTRACTORS = {
    ".docx": extract_docx,
    ".xlsx": extract_xlsx,
    ".txt": extract_txt,
    ".png": extract_image,
}

# Map corpus subfolder -> doc_type label used throughout the graph/agents
FOLDER_TO_DOC_TYPE = {
    "pids": "pid_drawing",
    "work_orders": "work_order",
    "inspections": "inspection_report",
    "sops_permits": "sop_permit",
    "incidents": "incident_report",
    "emails": "email_thread",
    "compliance": "compliance_doc",
}

# Doc types that are likely to contain failure/maintenance information
# — these get LLM-enhanced extraction, others just use regex (faster)
FAILURE_RELEVANT_DOC_TYPES = {
    "work_order", "inspection_report", "incident_report", "compliance_doc",
}


def _extract_first_date(text: str) -> str | None:
    """Extract the first YYYY-MM-DD date from text."""
    match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    return match.group(0) if match else None


def ingest_corpus(corpus_dir: str, use_llm: bool = True):
    """Walk corpus_dir, extract every supported file, and return a populated
    (KnowledgeGraph, VectorStore) pair plus a per-file entity report for debugging.

    Args:
        corpus_dir: Path to the corpus directory.
        use_llm: If True, use LLM-enhanced entity extraction for failure-relevant
                 documents. If False, use regex-only extraction (faster, no API calls).
    """
    kg = KnowledgeGraph()
    vs = VectorStore()
    report = []

    # Pass 1: extract text + entities for every file, register doc + entity nodes
    file_records = []  # (doc_id/filename, doc_type, text, entities, pid_data)
    official_id_to_filename = {}  # e.g. "WO-2026-0142" -> "wo_2026_0142_..."

    for folder, doc_type in FOLDER_TO_DOC_TYPE.items():
        folder_path = os.path.join(corpus_dir, folder)
        if not os.path.isdir(folder_path):
            continue

        for fname in sorted(os.listdir(folder_path)):
            ext = os.path.splitext(fname)[1].lower()
            extractor = EXTRACTORS.get(ext)
            if not extractor:
                continue

            filepath = os.path.join(folder_path, fname)

            # Robust per-file extraction — one file failing shouldn't crash the pipeline
            try:
                text = extractor(filepath)
            except Exception as e:
                print(f"  [WARN] Failed to extract {fname}: {e}")
                text = ""

            # Use enhanced (regex + LLM) extraction for failure-relevant docs,
            # plain regex for everything else (SOPs, P&IDs, emails — faster)
            if use_llm and doc_type in FAILURE_RELEVANT_DOC_TYPES:
                entities = extract_entities_enhanced(text)
                print(f"  [LLM] {fname}: failure_mode={entities.get('failure_mode')}, "
                      f"severity={entities.get('severity')}, "
                      f"downtime_h={entities.get('downtime_hours')}")
            else:
                entities = extract_entities(text)

            # --- P&ID vision extraction (structural topology) ---
            pid_data = None
            if use_llm and doc_type == "pid_drawing" and ext in (".png", ".jpg", ".jpeg"):
                try:
                    pid_data = extract_pid_structure(filepath)
                    n_conn = len(pid_data.get("connections", []))
                    n_equip = len(pid_data.get("equipment", []))
                    print(f"  [PID] {fname}: {n_equip} equipment, {n_conn} connections")
                except Exception as e:
                    print(f"  [WARN] P&ID vision failed for {fname}: {e}")

            doc_node_id = fname  # filename is the canonical graph node id
            official_id = entities["document_refs"][0] if entities["document_refs"] else None

            kg.add_document(doc_node_id, doc_type, fname, official_id)

            # Register this file under every doc ID it contains as its "self" id
            # -- the doc's own reference number is normally the first one that
            # appears near the top (Report/Work Order/Document Number field).
            if official_id:
                official_id_to_filename[official_id] = doc_node_id

            file_records.append((doc_node_id, doc_type, text, entities, pid_data))
            report.append({"file": fname, "doc_type": doc_type, **entities})

    # Pass 2: add equipment/person nodes, mention edges, cross-document reference
    # edges, failure events, and populate the vector store. Two passes because we
    # need every official_id -> filename mapping built before we can link references.
    for doc_node_id, doc_type, text, entities, pid_data in file_records:
        for tag in entities["equipment"]:
            kg.add_equipment(tag)
            kg.link_mentions(doc_node_id, tag, relation="mentions_equipment")

            # If this doc has a failure event for this equipment, register it
            failure_mode = entities.get("failure_mode")
            if failure_mode and doc_type in FAILURE_RELEVANT_DOC_TYPES:
                kg.add_failure_event(
                    equipment_tag=tag,
                    doc_id=doc_node_id,
                    failure_mode=failure_mode,
                    severity=entities.get("severity"),
                    root_cause_category=entities.get("root_cause_category"),
                    action_taken=entities.get("action_taken"),
                    recommended_action=entities.get("recommended_action"),
                    labour_hours=entities.get("labour_hours"),
                    downtime_hours=entities.get("downtime_hours"),
                    cost_estimate=entities.get("cost_estimate"),
                    risk_level=entities.get("risk_level"),
                    date=_extract_first_date(text),
                )

        # --- P&ID connection edges ---
        if pid_data and doc_type == "pid_drawing":
            for conn in pid_data.get("connections", []):
                from_tag = conn.get("from_tag", "")
                to_tag = conn.get("to_tag", "")
                if from_tag and to_tag:
                    kg.link_equipment_connection(
                        from_tag=from_tag,
                        to_tag=to_tag,
                        connection_type=conn.get("line_type", "process_pipe"),
                        label=conn.get("label"),
                        source_doc_id=doc_node_id,
                    )

        for person in entities["personnel"]:
            kg.add_person(person)
            kg.link_mentions(doc_node_id, person, relation="mentions_person")

        for ref_id in entities["document_refs"]:
            target_filename = official_id_to_filename.get(ref_id)
            if target_filename and target_filename != doc_node_id:
                kg.link_documents(doc_node_id, target_filename, relation="references")

        # Append P&ID diagram summary to text so semantic search finds it
        embed_text = text
        if pid_data and pid_data.get("diagram_summary"):
            embed_text = text + "\n\n[P&ID Summary] " + pid_data["diagram_summary"]

        vs.add_chunked(
            doc_id=doc_node_id,
            text=embed_text,
            metadata={
                "doc_type": doc_type,
                "equipment": entities["equipment"],
                "personnel": entities["personnel"],
                "document_refs": entities["document_refs"],
                "dates": entities["dates"],
                "failure_mode": entities.get("failure_mode"),
                "severity": entities.get("severity"),
                "labour_hours": entities.get("labour_hours"),
                "downtime_hours": entities.get("downtime_hours"),
            },
        )

    vs.build()
    return kg, vs, report

def ingest_single_file(filepath: str, doc_type: str, kg, vs, use_llm: bool = True) -> dict:
    fname = os.path.basename(filepath)
    ext = os.path.splitext(fname)[1].lower()
    extractor = EXTRACTORS.get(ext)
    if not extractor:
        raise ValueError(f"Unsupported extension: {ext}")
        
    try:
        text = extractor(filepath)
    except Exception as e:
        raise RuntimeError(f"Failed to extract {fname}: {e}")
        
    if use_llm and doc_type in FAILURE_RELEVANT_DOC_TYPES:
        entities = extract_entities_enhanced(text)
    else:
        entities = extract_entities(text)

    # --- P&ID vision extraction for single-file uploads ---
    pid_data = None
    if use_llm and doc_type == "pid_drawing" and ext in (".png", ".jpg", ".jpeg"):
        try:
            pid_data = extract_pid_structure(filepath)
            print(f"  [PID] {fname}: {len(pid_data.get('equipment', []))} equipment, "
                  f"{len(pid_data.get('connections', []))} connections")
        except Exception as e:
            print(f"  [WARN] P&ID vision failed for {fname}: {e}")

    doc_node_id = fname
    official_id = entities["document_refs"][0] if entities["document_refs"] else None
    
    kg.add_document(doc_node_id, doc_type, fname, official_id)
    
    known_official_ids = {}
    for data in kg.get_all_documents():
        if data.get("official_id"):
            known_official_ids[data["official_id"]] = data["id"]

    for tag in entities["equipment"]:
        kg.add_equipment(tag)
        kg.link_mentions(doc_node_id, tag, relation="mentions_equipment")
        
        failure_mode = entities.get("failure_mode")
        if failure_mode and doc_type in FAILURE_RELEVANT_DOC_TYPES:
            kg.add_failure_event(
                equipment_tag=tag,
                doc_id=doc_node_id,
                failure_mode=failure_mode,
                severity=entities.get("severity"),
                root_cause_category=entities.get("root_cause_category"),
                action_taken=entities.get("action_taken"),
                recommended_action=entities.get("recommended_action"),
                labour_hours=entities.get("labour_hours"),
                downtime_hours=entities.get("downtime_hours"),
                cost_estimate=entities.get("cost_estimate"),
                risk_level=entities.get("risk_level"),
                date=_extract_first_date(text),
            )

    # --- P&ID connection edges (single-file) ---
    if pid_data and doc_type == "pid_drawing":
        for conn in pid_data.get("connections", []):
            from_tag = conn.get("from_tag", "")
            to_tag = conn.get("to_tag", "")
            if from_tag and to_tag:
                kg.link_equipment_connection(
                    from_tag=from_tag,
                    to_tag=to_tag,
                    connection_type=conn.get("line_type", "process_pipe"),
                    label=conn.get("label"),
                    source_doc_id=doc_node_id,
                )

    for person in entities["personnel"]:
        kg.add_person(person)
        kg.link_mentions(doc_node_id, person, relation="mentions_person")
        
    for ref_id in entities["document_refs"]:
        target_filename = known_official_ids.get(ref_id)
        if target_filename and target_filename != doc_node_id:
            kg.link_documents(doc_node_id, target_filename, relation="references")

    # Append P&ID diagram summary to text so semantic search finds it
    embed_text = text
    if pid_data and pid_data.get("diagram_summary"):
        embed_text = text + "\n\n[P&ID Summary] " + pid_data["diagram_summary"]

    vs.add_single_document(
        doc_id=doc_node_id,
        text=embed_text,
        metadata={
            "doc_type": doc_type,
            "equipment": entities["equipment"],
            "personnel": entities["personnel"],
            "document_refs": entities["document_refs"],
            "dates": entities["dates"],
            "failure_mode": entities.get("failure_mode"),
            "severity": entities.get("severity"),
            "labour_hours": entities.get("labour_hours"),
            "downtime_hours": entities.get("downtime_hours"),
        },
    )
    
    return {"file": fname, "doc_type": doc_type, **entities}


if __name__ == "__main__":
    corpus_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "corpus")

    print("Ingesting corpus with LLM-enhanced extraction...")
    kg, vs, report = ingest_corpus(corpus_path, use_llm=True)

    print("\n=== Knowledge graph summary ===")
    print(kg.summary())

    print("\n=== V-204 neighbourhood (1 hop) ===")
    print(sorted(kg.neighbors_of("V-204", hops=1)))

    print("\n=== Documents mentioning V-204 ===")
    print(kg.documents_mentioning("V-204"))

    print("\n=== V-204 failure history ===")
    for event in kg.get_failure_history("V-204"):
        print(f"  [{event['date']}] {event['failure_mode']} "
              f"(severity={event['severity']}, downtime={event['downtime_hours']}h) "
              f"— {event['source_doc']}")
