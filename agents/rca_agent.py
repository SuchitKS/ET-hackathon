"""RCA agent: given an equipment tag, build a chronologically ordered history
from all linked documents, compute concrete downtime metrics, and ask the LLM
to summarise root cause / pattern with numbers.
"""
import sys
import os
import re
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.llm_client import call_llm

SYSTEM_PROMPT = (
    "You are a root cause analysis assistant for industrial maintenance. "
    "Given a chronological set of documents about one piece of equipment, "
    "plus computed downtime metrics, identify the root cause of any recurring "
    "issues and summarise the maintenance history in date order. "
    "ALWAYS cite the source filename for every claim. "
    "ALWAYS include the computed downtime numbers in your summary — these are "
    "factual figures, not estimates. State them clearly."
)


def _extract_first_date(text: str) -> str:
    match = re.search(r"\d{4}-\d{2}-\d{2}", text)
    return match.group(0) if match else "9999-99-99"  # undated docs sort last


def build_equipment_history(equipment_tag: str, kg, vs) -> list:
    """Return [(doc_id, date, text)] for every document linked to this
    equipment tag, sorted chronologically.
    """
    doc_ids = kg.documents_mentioning(equipment_tag)

    history = []
    for doc_id in doc_ids:
        text = vs.get_full_text(doc_id)
        date = _extract_first_date(text)
        history.append((doc_id, date, text))


    history.sort(key=lambda x: x[1])
    return history


def compute_downtime_metrics(equipment_tag: str, kg) -> dict:
    """Compute concrete downtime metrics from the knowledge graph's failure events.

    Returns:
        {
            "total_downtime_hours": float,
            "total_labour_hours": float,
            "total_cost": float,
            "incident_count": int,
            "recurring_patterns": [
                {
                    "failure_mode": str,
                    "count": int,
                    "total_downtime": float,
                    "total_labour": float,
                    "avoidable_hours": float,  # hours after first occurrence
                    "dates": [str],
                }
            ],
            "severity_breakdown": {"critical": N, "high": N, ...},
        }
    """
    events = kg.get_failure_history(equipment_tag)

    if not events:
        return {
            "total_downtime_hours": 0,
            "total_labour_hours": 0,
            "total_cost": 0,
            "incident_count": 0,
            "recurring_patterns": [],
            "severity_breakdown": {},
        }

    total_downtime = sum(e["downtime_hours"] or 0 for e in events)
    total_labour = sum(e["labour_hours"] or 0 for e in events)
    total_cost = sum(e["cost_estimate"] or 0 for e in events)

    severity_counts = Counter(e["severity"] for e in events if e["severity"])

    # Group by failure mode to identify recurring patterns
    mode_groups = {}
    for e in events:
        mode = e["failure_mode"] or "unspecified"
        if mode not in mode_groups:
            mode_groups[mode] = []
        mode_groups[mode].append(e)

    recurring_patterns = []
    for mode, group in mode_groups.items():
        mode_downtime = sum(e["downtime_hours"] or 0 for e in group)
        mode_labour = sum(e["labour_hours"] or 0 for e in group)
        dates = [e["date"] for e in group if e["date"]]

        # Avoidable hours: if the same failure mode recurred, the hours spent
        # on the 2nd+ occurrence could have been avoided if flagged after the
        # first occurrence (preventive action)
        avoidable = 0
        if len(group) > 1:
            avoidable = sum(e["downtime_hours"] or 0 for e in group[1:])

        recurring_patterns.append({
            "failure_mode": mode,
            "count": len(group),
            "total_downtime": mode_downtime,
            "total_labour": mode_labour,
            "avoidable_hours": avoidable,
            "dates": dates,
        })

    # Sort patterns by total impact (downtime) descending
    recurring_patterns.sort(key=lambda p: p["total_downtime"], reverse=True)

    return {
        "total_downtime_hours": total_downtime,
        "total_labour_hours": total_labour,
        "total_cost": total_cost,
        "incident_count": len(events),
        "recurring_patterns": recurring_patterns,
        "severity_breakdown": dict(severity_counts),
    }


def _format_metrics_for_prompt(metrics: dict) -> str:
    """Format the computed metrics as a clear text block for the LLM prompt."""
    if metrics["incident_count"] == 0:
        return "No failure events recorded in the knowledge graph."

    lines = [
        f"COMPUTED METRICS (factual — cite these numbers in your summary):",
        f"  Total incidents: {metrics['incident_count']}",
        f"  Total downtime: {metrics['total_downtime_hours']} hours",
        f"  Total labour: {metrics['total_labour_hours']} hours",
    ]
    if metrics["total_cost"] > 0:
        lines.append(f"  Total estimated cost: ₹{metrics['total_cost']:,.0f}")

    if metrics["severity_breakdown"]:
        sev = ", ".join(f"{k}: {v}" for k, v in metrics["severity_breakdown"].items())
        lines.append(f"  Severity breakdown: {sev}")

    for p in metrics["recurring_patterns"]:
        lines.append(f"\n  Failure mode: {p['failure_mode']}")
        lines.append(f"    Occurrences: {p['count']}")
        lines.append(f"    Total downtime for this mode: {p['total_downtime']} hours")
        lines.append(f"    Total labour for this mode: {p['total_labour']} hours")
        if p["count"] > 1:
            lines.append(f"    AVOIDABLE HOURS (if flagged after 1st occurrence): "
                         f"{p['avoidable_hours']} hours")
        if p["dates"]:
            lines.append(f"    Dates: {', '.join(p['dates'])}")

    return "\n".join(lines)


def run_rca(equipment_tag: str, kg, vs) -> dict:
    history = build_equipment_history(equipment_tag, kg, vs)
    metrics = compute_downtime_metrics(equipment_tag, kg)

    if not history:
        return {
            "answer": f"No documents found for equipment {equipment_tag}.",
            "sources": [],
            "metrics": metrics,
        }

    context = "\n\n".join(
        f"--- {date} | Source: {doc_id} ---\n{text[:600]}"
        for doc_id, date, text in history
    )
    metrics_text = _format_metrics_for_prompt(metrics)

    user_prompt = (
        f"Equipment: {equipment_tag}\n\n"
        f"{metrics_text}\n\n"
        f"CHRONOLOGICAL DOCUMENT HISTORY:\n{context}\n\n"
        f"Summarise the root cause analysis and maintenance pattern for "
        f"{equipment_tag}, citing source filenames and including the computed "
        f"downtime numbers."
    )

    try:
        answer = call_llm(SYSTEM_PROMPT, user_prompt)
    except RuntimeError as e:
        answer = (
            f"[LLM unavailable, showing raw chronological evidence instead: {e}]\n\n"
            + _format_metrics_for_prompt(metrics) + "\n\n"
            + "\n\n".join(f"[{date}] [{doc_id}] {text[:300]}..." for doc_id, date, text in history)
        )

    return {"answer": answer, "sources": [doc_id for doc_id, _, _ in history], "metrics": metrics}
