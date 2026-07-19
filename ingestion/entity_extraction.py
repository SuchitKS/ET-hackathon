"""Rule-based entity extraction.

Deliberately regex/lookup-based rather than LLM-based: deterministic, fast,
and good enough for a bounded 26-doc demo corpus where the entity vocabulary
is known in advance. Swap in an LLM-based extractor later only if you need to
generalise beyond this fixed vocabulary.
"""
import re

# Ground-truth entity lists for Suryanagar Refinery (see corpus content plan)
KNOWN_EQUIPMENT = ["V-204", "P-101", "E-305", "C-110", "T-402", "PL-07"]
KNOWN_PERSONNEL = ["R. Sharma", "A. Nair", "M. Iyer", "S. Verma", "D. Rao"]

# Document ID patterns, one per document family used in the corpus
DOC_ID_PATTERNS = [
    r"\bWO-\d{4}-\d{4}\b",     # work orders
    r"\bINS-\d{4}-\d{4}\b",    # inspection reports
    r"\bHWP-\d{4}-\d{4}\b",    # hot work permits
    r"\bINC-\d{4}-\d{4}\b",    # incident reports
    r"\bAUD-\d{4}-\d{4}\b",    # compliance audits
    r"\bQR-\d{4}-\d{4}\b",     # quality reviews
    r"\bLIC-\d{4}-\d{4}\b",    # licensing docs
    r"\bCHK-\d{4}-Q\d\b",      # quarterly checklists
    r"\bSOP-[A-Z0-9]+-\d+\b",  # SOPs
    r"\bPID-[A-Z0-9]+-\d+\b",  # P&ID drawing refs
]

DATE_PATTERN = r"\b\d{4}-\d{2}-\d{2}\b"

# Generic equipment tag pattern as a fallback / cross-check against KNOWN_EQUIPMENT
EQUIPMENT_TAG_PATTERN = r"\b[A-Z]{1,3}-\d{2,4}[A-Z]?\b"


def extract_entities(text: str) -> dict:
    """Return a dict of entity_type -> list of unique matches found in text.

    `document_refs` is ordered by first appearance in the text (not
    alphabetically) because every corpus document states its own ID in the
    metadata table at the very top -- so document_refs[0] reliably identifies
    "this document's own ID" as opposed to IDs of other documents it merely
    references further down. Callers that just need the full set can wrap
    the result in set().
    """
    found_equipment = sorted(set(
        tag for tag in re.findall(EQUIPMENT_TAG_PATTERN, text)
        if tag in KNOWN_EQUIPMENT
    ))

    found_personnel = sorted(set(
        name for name in KNOWN_PERSONNEL if name in text
    ))

    # Collect (match, position) across all patterns, then sort by position to
    # get first-occurrence order, deduping while preserving that order.
    matches_with_pos = []
    for pattern in DOC_ID_PATTERNS:
        for m in re.finditer(pattern, text):
            matches_with_pos.append((m.start(), m.group(0)))
    matches_with_pos.sort(key=lambda x: x[0])

    seen = set()
    found_doc_ids_ordered = []
    for _, doc_id in matches_with_pos:
        if doc_id not in seen:
            seen.add(doc_id)
            found_doc_ids_ordered.append(doc_id)

    found_dates = sorted(set(re.findall(DATE_PATTERN, text)))

    return {
        "equipment": found_equipment,
        "personnel": found_personnel,
        "document_refs": found_doc_ids_ordered,
        "dates": found_dates,
    }


def extract_entities_enhanced(text: str) -> dict:
    """Merge regex-based extraction (authoritative for structured fields) with
    LLM-based extraction (semantic fields regex can't capture).

    Returns a single dict combining both. Regex results are never overridden
    by the LLM — the LLM only fills in additional semantic fields.
    """
    from ingestion.llm_entity_extraction import extract_entities_llm

    regex_result = extract_entities(text)
    llm_result = extract_entities_llm(text)

    # Merge: regex fields are authoritative, LLM fields are additive
    merged = dict(regex_result)
    merged.update({
        "failure_mode": llm_result.get("failure_mode"),
        "severity": llm_result.get("severity"),
        "root_cause_category": llm_result.get("root_cause_category"),
        "action_taken": llm_result.get("action_taken"),
        "recommended_action": llm_result.get("recommended_action"),
        "labour_hours": llm_result.get("labour_hours"),
        "downtime_hours": llm_result.get("downtime_hours"),
        "cost_estimate": llm_result.get("cost_estimate"),
        "risk_level": llm_result.get("risk_level"),
        "compliance_refs": llm_result.get("compliance_refs", []),
    })
    return merged
