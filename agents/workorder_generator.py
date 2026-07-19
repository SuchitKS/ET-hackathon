"""Work order generator: produces structured work order drafts as JSON and PDF.

Uses the knowledge graph to pull context (related documents, failure history,
compliance references) and pre-fills the work order with relevant information.
PDF rendering via reportlab — professional refinery-branded layout.
"""
import sys
import os
import json
import re
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.llm_client import call_llm

# Output directory for generated PDFs
GENERATED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

# Auto-incrementing WO number
_wo_counter = [300]  # start from WO-2026-0300 to avoid collisions with corpus

SYSTEM_PROMPT = (
    "You are a work order drafting assistant for Suryanagar Refinery, Gujarat. "
    "Given equipment information and context from related documents, generate a "
    "concise but complete scope of work description and safety requirements. "
    "Return ONLY a JSON object with these fields:\n"
    '  "scope_of_work": "detailed description of work to be done",\n'
    '  "safety_requirements": ["list", "of", "safety", "items"],\n'
    '  "estimated_duration_hours": number,\n'
    '  "priority_justification": "why this priority level"\n'
    "Do NOT include any text outside the JSON object."
)


def _next_wo_number() -> str:
    """Generate the next work order number."""
    num = _wo_counter[0]
    _wo_counter[0] += 1
    return f"WO-2026-{num:04d}"


def _gather_context(equipment_tag: str, kg, vs) -> dict:
    """Pull related information from the knowledge graph and vector store."""
    context = {
        "related_documents": [],
        "failure_history": [],
        "compliance_refs": [],
    }

    # Related documents
    doc_ids = kg.documents_mentioning(equipment_tag)
    vs_lookup = {did: (text, meta) for did, text, meta in zip(vs.doc_ids, vs.texts, vs.metadatas)}
    for doc_id in doc_ids:
        text, meta = vs_lookup.get(doc_id, ("", {}))
        context["related_documents"].append({
            "doc_id": doc_id,
            "doc_type": meta.get("doc_type", "unknown"),
            "snippet": text[:200],
        })

    # Failure history
    events = kg.get_failure_history(equipment_tag)
    for event in events:
        context["failure_history"].append({
            "date": event.get("date"),
            "failure_mode": event.get("failure_mode"),
            "severity": event.get("severity"),
            "source_doc": event.get("source_doc"),
        })

    return context


def generate_work_order(equipment_tag: str, description: str,
                        priority: str = "medium",
                        requester: str = "System Generated",
                        kg=None, vs=None) -> dict:
    """Build a structured work order data dict.

    Args:
        equipment_tag: Equipment identifier (e.g. "V-204")
        description: Brief description of the work needed
        priority: "critical", "high", "medium", or "low"
        requester: Name of person requesting the work order
        kg: KnowledgeGraph instance (optional, for context enrichment)
        vs: VectorStore instance (optional, for context enrichment)

    Returns:
        Complete work order dict ready for PDF/JSON rendering.
    """
    wo_number = _next_wo_number()
    now = datetime.now()

    # Gather context from knowledge graph if available
    context = {}
    if kg and vs:
        context = _gather_context(equipment_tag, kg, vs)

    # Use LLM to generate scope of work and safety requirements
    llm_fields = {}
    try:
        context_text = ""
        if context.get("failure_history"):
            context_text += "\nFAILURE HISTORY:\n"
            for fh in context["failure_history"]:
                context_text += (f"  - [{fh['date']}] {fh['failure_mode']} "
                                 f"(severity: {fh['severity']}) from {fh['source_doc']}\n")
        if context.get("related_documents"):
            context_text += "\nRELATED DOCUMENTS:\n"
            for rd in context["related_documents"][:5]:
                context_text += f"  - {rd['doc_id']} ({rd['doc_type']}): {rd['snippet'][:100]}...\n"

        user_prompt = (
            f"Equipment: {equipment_tag}\n"
            f"Description: {description}\n"
            f"Priority: {priority}\n"
            f"{context_text}\n"
            f"Generate scope of work and safety requirements as JSON."
        )

        from agents.llm_client import call_llm_json
        llm_fields = call_llm_json(SYSTEM_PROMPT, user_prompt, timeout=60)
    except (RuntimeError, Exception):
        llm_fields = {
            "scope_of_work": description,
            "safety_requirements": [
                "Obtain valid work permit before commencing",
                "Ensure equipment is isolated and depressurised",
                "Wear appropriate PPE as per SOP-PPE-001",
                "Maintain fire watch if hot work is required",
            ],
            "estimated_duration_hours": 8,
            "priority_justification": f"Priority set to {priority} based on request.",
        }

    wo_data = {
        "wo_number": wo_number,
        "date_created": now.strftime("%Y-%m-%d"),
        "time_created": now.strftime("%H:%M"),
        "status": "DRAFT",
        "equipment_tag": equipment_tag,
        "description": description,
        "priority": priority.upper(),
        "requester": requester,
        "scope_of_work": llm_fields.get("scope_of_work", description),
        "safety_requirements": llm_fields.get("safety_requirements", []),
        "estimated_duration_hours": llm_fields.get("estimated_duration_hours", 8),
        "priority_justification": llm_fields.get("priority_justification", ""),
        "related_documents": [rd["doc_id"] for rd in context.get("related_documents", [])],
        "failure_history_summary": [
            f"[{fh['date']}] {fh['failure_mode']} ({fh['severity']})"
            for fh in context.get("failure_history", [])
        ],
        "plant": "Suryanagar Refinery",
        "unit": "Unit 2 — Crude Distillation",
        "location": "Gujarat, India",
    }

    return wo_data


def render_work_order_json(wo_data: dict) -> str:
    """Render work order as formatted JSON string."""
    return json.dumps(wo_data, indent=2, ensure_ascii=False)


def render_work_order_pdf(wo_data: dict, output_path: str | None = None) -> str:
    """Render work order as a professional PDF.

    Args:
        wo_data: Work order data dict from generate_work_order()
        output_path: Optional path for the PDF. If None, saves to generated/ dir.

    Returns:
        Absolute path to the generated PDF file.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer,
                                         Table, TableStyle, HRFlowable)
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    except ImportError:
        raise RuntimeError(
            "reportlab is required for PDF generation. "
            "Install it: pip install reportlab"
        )

    if output_path is None:
        filename = f"{wo_data['wo_number'].replace('-', '_').lower()}.pdf"
        output_path = os.path.join(GENERATED_DIR, filename)

    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=20*mm, rightMargin=20*mm,
                            topMargin=15*mm, bottomMargin=15*mm)

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "WOTitle", parent=styles["Heading1"],
        fontSize=18, textColor=HexColor("#1a365d"),
        spaceAfter=6*mm, alignment=TA_CENTER,
    )
    subtitle_style = ParagraphStyle(
        "WOSubtitle", parent=styles["Normal"],
        fontSize=10, textColor=HexColor("#4a5568"),
        alignment=TA_CENTER, spaceAfter=8*mm,
    )
    section_style = ParagraphStyle(
        "WOSection", parent=styles["Heading2"],
        fontSize=12, textColor=HexColor("#2d3748"),
        spaceBefore=6*mm, spaceAfter=3*mm,
        borderWidth=0, borderPadding=0,
    )
    body_style = ParagraphStyle(
        "WOBody", parent=styles["Normal"],
        fontSize=10, leading=14,
        textColor=HexColor("#2d3748"),
    )
    small_style = ParagraphStyle(
        "WOSmall", parent=styles["Normal"],
        fontSize=8, textColor=HexColor("#718096"),
    )

    elements = []

    # -- Header --
    elements.append(Paragraph("SURYANAGAR REFINERY", title_style))
    elements.append(Paragraph(
        f"Work Order — {wo_data['wo_number']} | Status: {wo_data['status']}",
        subtitle_style
    ))
    elements.append(HRFlowable(
        width="100%", thickness=1.5,
        color=HexColor("#e2e8f0"), spaceAfter=5*mm,
    ))

    # -- Metadata table --
    meta_data = [
        ["WO Number", wo_data["wo_number"], "Priority", wo_data["priority"]],
        ["Equipment", wo_data["equipment_tag"], "Date Created", wo_data["date_created"]],
        ["Requester", wo_data["requester"], "Plant/Unit", wo_data.get("unit", "")],
        ["Est. Duration", f"{wo_data['estimated_duration_hours']} hours", "Location", wo_data.get("location", "")],
    ]
    meta_table = Table(meta_data, colWidths=[30*mm, 55*mm, 30*mm, 55*mm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), HexColor("#edf2f7")),
        ("BACKGROUND", (2, 0), (2, -1), HexColor("#edf2f7")),
        ("TEXTCOLOR", (0, 0), (-1, -1), HexColor("#2d3748")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 5*mm))

    # -- Description --
    elements.append(Paragraph("Description", section_style))
    elements.append(Paragraph(wo_data["description"], body_style))
    elements.append(Spacer(1, 3*mm))

    # -- Scope of Work --
    elements.append(Paragraph("Scope of Work", section_style))
    elements.append(Paragraph(
        wo_data.get("scope_of_work", wo_data["description"]),
        body_style
    ))
    elements.append(Spacer(1, 3*mm))

    # -- Safety Requirements --
    if wo_data.get("safety_requirements"):
        elements.append(Paragraph("Safety Requirements", section_style))
        for i, req in enumerate(wo_data["safety_requirements"], 1):
            elements.append(Paragraph(f"  {i}. {req}", body_style))
        elements.append(Spacer(1, 3*mm))

    # -- Priority Justification --
    if wo_data.get("priority_justification"):
        elements.append(Paragraph("Priority Justification", section_style))
        elements.append(Paragraph(wo_data["priority_justification"], body_style))
        elements.append(Spacer(1, 3*mm))

    # -- Related Documents --
    if wo_data.get("related_documents"):
        elements.append(Paragraph("Related Documents", section_style))
        for ref_doc in wo_data["related_documents"]:
            elements.append(Paragraph(f"  • {ref_doc}", body_style))
        elements.append(Spacer(1, 3*mm))

    # -- Failure History --
    if wo_data.get("failure_history_summary"):
        elements.append(Paragraph("Equipment Failure History", section_style))
        for entry in wo_data["failure_history_summary"]:
            elements.append(Paragraph(f"  • {entry}", body_style))
        elements.append(Spacer(1, 3*mm))

    # -- Approval block --
    elements.append(HRFlowable(
        width="100%", thickness=1,
        color=HexColor("#e2e8f0"), spaceBefore=8*mm, spaceAfter=5*mm,
    ))
    elements.append(Paragraph("Approvals", section_style))
    approval_data = [
        ["Role", "Name", "Signature", "Date"],
        ["Requested By", wo_data["requester"], "", ""],
        ["Approved By", "", "", ""],
        ["Safety Officer", "", "", ""],
    ]
    approval_table = Table(approval_data, colWidths=[35*mm, 45*mm, 45*mm, 35*mm])
    approval_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2d3748")),
        ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cbd5e0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), HexColor("#f7fafc")]),
    ]))
    elements.append(approval_table)

    # -- Footer --
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph(
        f"Generated by Suryanagar Refinery Knowledge Intelligence Platform — "
        f"{wo_data['date_created']} {wo_data['time_created']}",
        small_style
    ))

    doc.build(elements)
    return os.path.abspath(output_path)
