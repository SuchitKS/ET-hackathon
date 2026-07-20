"""Step 6 -- End-to-end test of P&ID architecture pipeline.

Since Groq vision models require a paid API key (403 on free tier), this test
simulates the vision extraction output to verify the full pipeline:
  graph edges -> get_downstream/upstream -> architecture agent -> supervisor routing

When the API key supports vision models, extract_pid_structure will produce
this data automatically from the P&ID images.
"""
import os
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)


# ── Simulated P&ID extraction data ──────────────────────────────────────
# This mirrors exactly what extract_pid_structure would return from the
# vision model for each P&ID image in corpus/pids/.

SIMULATED_PID_DATA = {
    "pid_unit2_overview.png": {
        "equipment": [
            {"tag": "V-204", "type": "storage tank", "description": "Crude oil feed tank"},
            {"tag": "P-101", "type": "centrifugal pump", "description": "Feed pump"},
            {"tag": "E-305", "type": "shell-and-tube heat exchanger", "description": "Crude preheater"},
            {"tag": "T-402", "type": "distillation tower", "description": "Atmospheric distillation column"},
            {"tag": "C-110", "type": "compressor", "description": "Overhead vapor compressor"},
        ],
        "connections": [
            {"from_tag": "V-204", "to_tag": "P-101", "line_type": "process_pipe", "label": "PL-01", "flow_direction": "V-204 to P-101"},
            {"from_tag": "P-101", "to_tag": "E-305", "line_type": "process_pipe", "label": "PL-02", "flow_direction": "P-101 to E-305"},
            {"from_tag": "E-305", "to_tag": "T-402", "line_type": "process_pipe", "label": "PL-03", "flow_direction": "E-305 to T-402"},
            {"from_tag": "T-402", "to_tag": "C-110", "line_type": "process_pipe", "label": "PL-04", "flow_direction": "T-402 to C-110"},
        ],
        "instruments": [
            {"tag": "PI-01", "attached_to": "PL-01", "measures": "pressure"},
            {"tag": "FI-02", "attached_to": "PL-02", "measures": "flow"},
            {"tag": "TI-03", "attached_to": "PL-03", "measures": "temperature"},
        ],
        "safety_devices": [
            {"tag": "PSV-110", "attached_to": "C-110", "type": "pressure safety valve", "protects_against": "overpressure"},
        ],
        "diagram_summary": "Unit 2 overview showing the main crude oil processing flow: crude from storage tank V-204 is pumped by P-101 through heat exchanger E-305 for preheating, then fed to atmospheric distillation tower T-402. Overhead vapors from T-402 are compressed by C-110.",
        "raw_ocr_text": "UNIT 2 OVERVIEW P&ID V-204 P-101 E-305 T-402 C-110 PSV-110",
    },
    "pid_pump_p101_detail.png": {
        "equipment": [
            {"tag": "V-204", "type": "storage tank", "description": "Feed tank"},
            {"tag": "P-101", "type": "centrifugal pump", "description": "Main feed pump"},
            {"tag": "P-101A", "type": "centrifugal pump", "description": "Standby feed pump"},
        ],
        "connections": [
            {"from_tag": "V-204", "to_tag": "P-101", "line_type": "process_pipe", "label": "PL-01", "flow_direction": "V-204 to P-101"},
            {"from_tag": "V-204", "to_tag": "P-101A", "line_type": "process_pipe", "label": "PL-01A", "flow_direction": "V-204 to P-101A"},
        ],
        "instruments": [
            {"tag": "PI-101", "attached_to": "P-101", "measures": "discharge pressure"},
        ],
        "safety_devices": [],
        "diagram_summary": "Detail drawing of pump P-101 and its standby P-101A, both drawing suction from storage tank V-204.",
        "raw_ocr_text": "P-101 DETAIL P&ID V-204 P-101 P-101A PI-101",
    },
    "pid_exchanger_e305.png": {
        "equipment": [
            {"tag": "P-101", "type": "centrifugal pump", "description": "Feed pump"},
            {"tag": "E-305", "type": "shell-and-tube heat exchanger", "description": "Crude preheater"},
            {"tag": "E-306", "type": "shell-and-tube heat exchanger", "description": "Hot oil exchanger"},
            {"tag": "T-402", "type": "distillation tower", "description": "Distillation column"},
        ],
        "connections": [
            {"from_tag": "P-101", "to_tag": "E-305", "line_type": "process_pipe", "label": "PL-02", "flow_direction": "P-101 to E-305"},
            {"from_tag": "E-305", "to_tag": "E-306", "line_type": "process_pipe", "label": "PL-02A", "flow_direction": "E-305 to E-306"},
            {"from_tag": "E-306", "to_tag": "T-402", "line_type": "process_pipe", "label": "PL-03", "flow_direction": "E-306 to T-402"},
        ],
        "instruments": [
            {"tag": "TI-305", "attached_to": "E-305", "measures": "outlet temperature"},
            {"tag": "TI-306", "attached_to": "E-306", "measures": "outlet temperature"},
        ],
        "safety_devices": [],
        "diagram_summary": "Heat exchanger train showing crude flow from P-101 through E-305 (crude preheater) and E-306 (hot oil exchanger) before entering distillation tower T-402.",
        "raw_ocr_text": "E-305 DETAIL P&ID P-101 E-305 E-306 T-402 TI-305 TI-306",
    },
    "pid_compressor_c110.png": {
        "equipment": [
            {"tag": "T-402", "type": "distillation tower", "description": "Atmospheric column"},
            {"tag": "C-110", "type": "reciprocating compressor", "description": "Overhead vapor compressor"},
            {"tag": "D-111", "type": "knockout drum", "description": "Compressor suction drum"},
        ],
        "connections": [
            {"from_tag": "T-402", "to_tag": "D-111", "line_type": "process_pipe", "label": "PL-04A", "flow_direction": "T-402 to D-111"},
            {"from_tag": "D-111", "to_tag": "C-110", "line_type": "process_pipe", "label": "PL-04B", "flow_direction": "D-111 to C-110"},
        ],
        "instruments": [
            {"tag": "PI-110", "attached_to": "C-110", "measures": "discharge pressure"},
            {"tag": "TI-110", "attached_to": "C-110", "measures": "discharge temperature"},
        ],
        "safety_devices": [
            {"tag": "PSV-110", "attached_to": "C-110", "type": "pressure safety valve", "protects_against": "overpressure"},
            {"tag": "PSV-111", "attached_to": "D-111", "type": "pressure safety valve", "protects_against": "overpressure"},
        ],
        "diagram_summary": "Compressor C-110 detail showing overhead vapor from T-402 passing through knockout drum D-111 before compression. Safety valves PSV-110 and PSV-111 protect against overpressure.",
        "raw_ocr_text": "C-110 DETAIL P&ID T-402 D-111 C-110 PSV-110 PSV-111",
    },
    "pid_tower_t402.png": {
        "equipment": [
            {"tag": "E-305", "type": "heat exchanger", "description": "Crude preheater"},
            {"tag": "T-402", "type": "distillation tower", "description": "Atmospheric distillation column"},
            {"tag": "C-110", "type": "compressor", "description": "Overhead compressor"},
            {"tag": "R-403", "type": "reboiler", "description": "Tower reboiler"},
        ],
        "connections": [
            {"from_tag": "E-305", "to_tag": "T-402", "line_type": "process_pipe", "label": "PL-03", "flow_direction": "E-305 to T-402"},
            {"from_tag": "T-402", "to_tag": "C-110", "line_type": "process_pipe", "label": "PL-04", "flow_direction": "T-402 to C-110"},
            {"from_tag": "T-402", "to_tag": "R-403", "line_type": "process_pipe", "label": "PL-05", "flow_direction": "T-402 to R-403"},
            {"from_tag": "R-403", "to_tag": "T-402", "line_type": "process_pipe", "label": "PL-05R", "flow_direction": "R-403 to T-402"},
        ],
        "instruments": [
            {"tag": "LI-402", "attached_to": "T-402", "measures": "level"},
            {"tag": "TI-402", "attached_to": "T-402", "measures": "tray temperature"},
        ],
        "safety_devices": [
            {"tag": "PSV-402", "attached_to": "T-402", "type": "pressure safety valve", "protects_against": "overpressure"},
        ],
        "diagram_summary": "Distillation tower T-402 detail showing feed from E-305, overhead vapor to compressor C-110, and reboiler R-403 circulation loop. PSV-402 provides overpressure protection.",
        "raw_ocr_text": "T-402 DETAIL P&ID E-305 T-402 C-110 R-403 PSV-402 LI-402 TI-402",
    },
}


def test_graph_edges():
    """Test: Load simulated P&ID data into the knowledge graph and verify connectivity."""
    print("=" * 70)
    print("TEST 1: Load P&ID connections into Knowledge Graph")
    print("=" * 70)

    from graph.knowledge_graph import KnowledgeGraph

    kg = KnowledgeGraph()

    # Load connections from all simulated P&IDs
    total_connections = 0
    for fname, pid_data in SIMULATED_PID_DATA.items():
        for conn in pid_data.get("connections", []):
            from_tag = conn.get("from_tag", "")
            to_tag = conn.get("to_tag", "")
            if from_tag and to_tag:
                kg.link_equipment_connection(
                    from_tag=from_tag,
                    to_tag=to_tag,
                    connection_type=conn.get("line_type", "process_pipe"),
                    label=conn.get("label"),
                    source_doc_id=fname,
                )
                total_connections += 1
        print(f"  Loaded {len(pid_data.get('connections', []))} connections from {fname}")

    print(f"\n  Total connections loaded: {total_connections}")

    # Also register P&ID documents
    for fname, pid_data in SIMULATED_PID_DATA.items():
        kg.add_document(fname, "pid_drawing", fname, None)

    # Verify downstream/upstream queries
    print(f"\n--- Downstream queries ---")
    for tag in ["V-204", "P-101", "E-305", "T-402", "C-110"]:
        downstream = kg.get_downstream(tag, hops=5)
        if downstream:
            flow = " -> ".join([tag] + [d["tag"] for d in downstream])
            print(f"  {tag} downstream: {flow}")
        else:
            print(f"  {tag} downstream: (none)")

    print(f"\n--- Upstream queries ---")
    for tag in ["V-204", "P-101", "E-305", "T-402", "C-110"]:
        upstream = kg.get_upstream(tag, hops=5)
        if upstream:
            flow = " -> ".join([u["tag"] for u in reversed(upstream)] + [tag])
            print(f"  {tag} upstream: {flow}")
        else:
            print(f"  {tag} upstream: (none)")

    print(f"\n--- Graph summary ---")
    print(json.dumps(kg.summary(), indent=2))

    return kg


def test_full_pipeline():
    """Test: Full ingestion pipeline with simulated P&ID data."""
    print(f"\n\n{'=' * 70}")
    print("TEST 2: Full Pipeline Ingestion (P&ID vision simulated)")
    print("=" * 70)

    # Monkey-patch extract_pid_structure to return simulated data
    import ingestion.extractors.pid_vision_extractor as pve
    original_fn = pve.extract_pid_structure

    def mock_extract_pid_structure(image_path):
        fname = os.path.basename(image_path)
        if fname in SIMULATED_PID_DATA:
            print(f"  [PID-SIM] Using simulated data for {fname}")
            return SIMULATED_PID_DATA[fname]
        return original_fn(image_path)

    pve.extract_pid_structure = mock_extract_pid_structure

    # Also patch it in pipeline module
    import ingestion.pipeline as pipeline
    pipeline.extract_pid_structure = mock_extract_pid_structure

    corpus_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "corpus")
    print(f"\nIngesting corpus from: {corpus_path}\n")

    kg, vs, report = pipeline.ingest_corpus(corpus_path, use_llm=False)

    print(f"\n--- Knowledge Graph Summary ---")
    print(json.dumps(kg.summary(), indent=2))

    print(f"\n--- CONNECTS_TO edges ---")
    for tag in ["V-204", "P-101", "E-305", "T-402", "C-110"]:
        downstream = kg.get_downstream(tag, hops=5)
        if downstream:
            flow = " -> ".join([tag] + [d["tag"] for d in downstream])
            print(f"  {tag}: {flow}")

    return kg, vs


def test_supervisor_routing():
    """Test: Verify architecture intent routing in the supervisor."""
    print(f"\n\n{'=' * 70}")
    print("TEST 3: Supervisor Intent Routing")
    print("=" * 70)

    from agents.supervisor import classify_node

    test_queries = [
        ("What is downstream of V-204?", "architecture"),
        ("What connects to E-305?", "architecture"),
        ("Trace the flow from the tank to the tower", "architecture"),
        ("What is upstream of C-110?", "architecture"),
        ("What safety devices are on C-110?", "retrieval"),  # no architecture keyword
        ("Why did P-101 fail?", "rca"),
        ("Generate work order for V-204", "workorder"),
        ("Show compliance gaps", "compliance"),
        ("What feeds into T-402?", "architecture"),
        ("process flow diagram", "architecture"),
    ]

    all_pass = True
    for query, expected in test_queries:
        state = {"query": query}
        result = classify_node(state)
        actual = result["intent"]
        status = "PASS" if actual == expected else "FAIL"
        if actual != expected:
            all_pass = False
        print(f"  {status} \"{query}\"  ->  {actual}  (expected: {expected})")

    print(f"\n  {'ALL ROUTING TESTS PASSED' if all_pass else 'SOME ROUTING TESTS FAILED'}")


def test_architecture_queries(kg, vs):
    """Test: Architecture agent with simulated graph data."""
    print(f"\n\n{'=' * 70}")
    print("TEST 4: Architecture Agent Queries")
    print("=" * 70)

    from agents.architecture_agent import run_architecture_query

    queries = [
        "What is downstream of V-204?",
        "What connects to E-305?",
        "Trace the flow from the tank to the distillation tower",
    ]

    for q in queries:
        print(f"\n{'-' * 60}")
        print(f"QUERY: {q}")
        print("-" * 60)
        try:
            result = run_architecture_query(q, kg, vs)
            print(f"  Sources: {result.get('sources', [])}")
            if result.get("downstream"):
                tags = [d["tag"] for d in result["downstream"]]
                print(f"  Downstream: {' -> '.join(tags)}")
            if result.get("upstream"):
                tags = [u["tag"] for u in result["upstream"]]
                print(f"  Upstream: {' -> '.join(tags)}")
            answer = result.get("answer", "No answer")
            # Show first 500 chars of the answer
            print(f"\n  Answer:\n  {answer[:500]}{'...' if len(answer) > 500 else ''}")
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()


def test_raw_extraction_json():
    """Show the raw JSON for one P&ID (simulated) as requested."""
    print(f"\n\n{'=' * 70}")
    print("RAW EXTRACTED JSON -- pid_unit2_overview.png (simulated)")
    print("=" * 70)
    display = {k: v for k, v in SIMULATED_PID_DATA["pid_unit2_overview.png"].items()
               if k != "raw_ocr_text"}
    display["raw_ocr_text_length"] = len(
        SIMULATED_PID_DATA["pid_unit2_overview.png"].get("raw_ocr_text", ""))
    print(json.dumps(display, indent=2))


if __name__ == "__main__":
    # Show raw JSON for one P&ID
    test_raw_extraction_json()

    # Test 1: Graph edges (direct, no pipeline)
    kg = test_graph_edges()

    # Test 2: Full pipeline with simulated vision
    kg2, vs2 = test_full_pipeline()

    # Test 3: Supervisor routing (no API needed)
    test_supervisor_routing()

    # Test 4: Architecture agent queries (may need LLM API for synthesis)
    test_architecture_queries(kg, vs2)

    print(f"\n\n{'=' * 70}")
    print("ALL TESTS COMPLETE")
    print("=" * 70)
