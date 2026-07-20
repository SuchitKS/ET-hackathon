"""Vision-LLM P&ID structural extractor.

Sends a P&ID diagram image to a vision-capable model and extracts the
*topology* of the process flow: equipment nodes, directed connections
between them, instruments, and safety devices.  Plain OCR (image_extractor)
captures tag text but has no concept of what connects to what — this module
fills that gap.

The extraction prompt mirrors the structured-JSON approach already used in
llm_entity_extraction.py, just applied to images instead of text.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from agents.llm_client import call_llm_vision_json
from ingestion.extractors.image_extractor import extract_image


# ---------------------------------------------------------------------------
# System prompt — instructs the vision model what to extract and how
# ---------------------------------------------------------------------------
PID_VISION_SYSTEM_PROMPT = """You are an expert P&ID (Piping and Instrumentation Diagram) analyst for an oil refinery.

Given an image of a P&ID drawing, extract the process structure and return ONLY valid JSON in this exact shape:

{
  "equipment": [
    {"tag": "V-204", "type": "storage tank", "description": "Crude oil feed tank"}
  ],
  "connections": [
    {"from_tag": "V-204", "to_tag": "P-101", "line_type": "process_pipe", "label": "PL-07", "flow_direction": "V-204 to P-101"}
  ],
  "instruments": [
    {"tag": "PI-07", "attached_to": "PL-07", "measures": "pressure"}
  ],
  "safety_devices": [
    {"tag": "PSV-110", "attached_to": "C-110", "type": "relief valve", "protects_against": "overpressure"}
  ],
  "diagram_summary": "One paragraph plain-English description of the overall process flow shown in this diagram."
}

Rules:
- Extract ONLY what is visually legible in the image. Never invent tags or connections not shown.
- If a tag or label is partially illegible, write "unreadable" rather than guessing.
- Equipment types should use standard P&ID terminology: vessel, pump, heat exchanger, compressor, tower/column, tank, valve, filter, etc.
- For connections, identify the direction of flow from pipe arrows, gravity flow indicators, or pump discharge direction.
- line_type should be one of: process_pipe, utility_pipe, instrument_signal, electrical, pneumatic.
- For instruments, use ISA tag conventions if visible (e.g. PI = pressure indicator, TI = temperature indicator, FIC = flow indicating controller, LT = level transmitter).
- For safety_devices, capture relief valves (PSV), rupture discs, flame arrestors, emergency shutdown valves, etc.
- Return valid JSON only, no explanation or commentary outside the JSON.
"""

PID_VISION_USER_PROMPT = (
    "Analyze this P&ID diagram image. Extract all equipment, connections, "
    "instruments, and safety devices visible in the drawing. Return the "
    "structured JSON as specified."
)


# ---------------------------------------------------------------------------
# Empty/fallback result shape
# ---------------------------------------------------------------------------
def _empty_result() -> dict:
    """Return the canonical empty P&ID extraction result."""
    return {
        "equipment": [],
        "connections": [],
        "instruments": [],
        "safety_devices": [],
        "diagram_summary": "",
        "raw_ocr_text": "",
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def extract_pid_structure(image_path: str) -> dict:
    """Extract P&ID topology from a diagram image using vision-LLM.

    Always runs OCR (via extract_image) for reliable tag spelling, then
    attempts the vision-LLM call for structural/connection information.
    If the vision call fails (no API key, network error, model unavailable),
    returns OCR-only results with empty structural fields so ingestion
    never hard-fails on this step.

    Returns a dict with keys: equipment, connections, instruments,
    safety_devices, diagram_summary, raw_ocr_text.
    """
    result = _empty_result()

    # --- OCR pass (always runs — more reliable for exact tag spelling) ---
    try:
        raw_ocr = extract_image(image_path)
    except Exception:
        raw_ocr = ""
    result["raw_ocr_text"] = raw_ocr

    # --- Vision-LLM pass (structural extraction) ---
    try:
        vision_data = call_llm_vision_json(
            PID_VISION_SYSTEM_PROMPT,
            PID_VISION_USER_PROMPT,
            image_path,
            timeout=120,
            temperature=0.1,
            max_tokens=4096,
        )

        if not isinstance(vision_data, dict):
            print(f"  [WARN] P&ID vision returned non-dict for {image_path}")
            return result

        # Merge vision results into our canonical shape, validating types
        for list_key in ("equipment", "connections", "instruments", "safety_devices"):
            val = vision_data.get(list_key)
            if isinstance(val, list):
                result[list_key] = val

        summary = vision_data.get("diagram_summary")
        if isinstance(summary, str):
            result["diagram_summary"] = summary

    except RuntimeError as e:
        # Vision API unavailable — fall back to OCR-only result
        print(f"  [WARN] P&ID vision extraction failed for {image_path}: {e}")
    except Exception as e:
        # Unexpected error — still don't crash the pipeline
        print(f"  [WARN] Unexpected error in P&ID vision for {image_path}: {e}")

    return result
