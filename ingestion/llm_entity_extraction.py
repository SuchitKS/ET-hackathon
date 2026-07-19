"""LLM-based structured entity extraction using Grok.

Extracts semantic fields that regex cannot capture: failure_mode, severity,
root_cause_category, action_taken, recommended_action, labour_hours,
downtime_hours, cost_estimate.

Used as a second-pass enrichment layer on top of the deterministic regex
extraction — regex results remain authoritative for equipment tags, doc IDs,
dates, and personnel names.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.llm_client import call_llm_json

EXTRACTION_SYSTEM_PROMPT = """You are an industrial document entity extractor for a refinery.
Given a document's text, extract the following fields as a JSON object.
Return ONLY valid JSON, no explanation.

{
  "failure_mode": "string or null — the type of failure described (e.g., 'corrosion', 'seal leak', 'fouling', 'valve failure', 'tray damage')",
  "severity": "string or null — 'critical', 'high', 'medium', 'low', or null if not mentioned",
  "root_cause_category": "string or null — the underlying cause category (e.g., 'material degradation', 'operational wear', 'design deficiency', 'procedural gap')",
  "action_taken": "string or null — brief summary of corrective action taken",
  "recommended_action": "string or null — brief summary of recommended future action",
  "labour_hours": "number or null — total labour/man-hours mentioned",
  "downtime_hours": "number or null — equipment downtime hours mentioned",
  "cost_estimate": "number or null — cost in INR if mentioned",
  "risk_level": "string or null — 'high', 'medium', 'low', or null",
  "compliance_refs": ["list of regulatory references mentioned, e.g., 'OISD-105 Section 6.3', 'PESO Rule 12'"]
}

Rules:
- Extract ONLY what is explicitly stated or clearly implied in the text.
- Do NOT guess or fabricate values.
- If a field is not mentioned, set it to null.
- For labour_hours and downtime_hours, extract the numeric value only.
- compliance_refs should capture any mention of OISD, PESO, Factory Act, or other regulatory references with their section/clause numbers if stated.
"""


def extract_entities_llm(text: str) -> dict:
    """Extract semantic entities from document text using Grok.

    Returns a dict with semantic fields. On LLM failure, returns a dict
    with all fields set to None so callers can safely merge with regex results.
    """
    empty_result = {
        "failure_mode": None,
        "severity": None,
        "root_cause_category": None,
        "action_taken": None,
        "recommended_action": None,
        "labour_hours": None,
        "downtime_hours": None,
        "cost_estimate": None,
        "risk_level": None,
        "compliance_refs": [],
    }

    try:
        # Truncate very long docs to stay within token limits
        truncated = text[:3000] if len(text) > 3000 else text
        user_prompt = f"DOCUMENT TEXT:\n{truncated}\n\nExtract entities as JSON:"

        result = call_llm_json(EXTRACTION_SYSTEM_PROMPT, user_prompt,
                               timeout=60, temperature=0.1)

        if not isinstance(result, dict):
            return empty_result

        # Validate and sanitize each field
        sanitized = {}
        for key in empty_result:
            if key == "compliance_refs":
                val = result.get(key, [])
                sanitized[key] = val if isinstance(val, list) else []
            elif key in ("labour_hours", "downtime_hours", "cost_estimate"):
                val = result.get(key)
                if val is not None:
                    try:
                        sanitized[key] = float(val)
                    except (ValueError, TypeError):
                        sanitized[key] = None
                else:
                    sanitized[key] = None
            else:
                val = result.get(key)
                sanitized[key] = str(val) if val is not None else None

        return sanitized

    except (RuntimeError, Exception):
        # LLM unavailable — return empty semantic fields, pipeline continues
        return empty_result
