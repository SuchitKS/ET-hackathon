"""LangGraph Supervisor: keyword-based intent routing using a StateGraph.

Uses LangGraph's StateGraph for structured, traceable agent orchestration.
Each agent (retrieval, RCA, compliance, workorder) is a node in the graph,
with the supervisor as the entry node that routes to the correct agent via
conditional edges.

Keyword routing rather than LLM-based classification: deterministic, instant,
and reliable regardless of which local model you're running.
"""
import sys
import os
from typing import TypedDict, Literal, Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, END

from ingestion.entity_extraction import extract_entities, KNOWN_EQUIPMENT
from agents.retrieval_agent import answer_query
from agents.rca_agent import run_rca
from agents.compliance_agent import run_compliance_scan
from agents.workorder_generator import (
    generate_work_order, render_work_order_json, render_work_order_pdf,
)

# ---------------------------------------------------------------------------
# Intent keywords
# ---------------------------------------------------------------------------
RCA_KEYWORDS = [
    "why did", "root cause", "what caused", "history of", "recurring",
    "pattern", "failure analysis", "downtime", "what happened",
]
COMPLIANCE_KEYWORDS = [
    "compliance", "compliant", "gap", "audit", "regulation", "not logged",
    "never logged", "missing documentation", "oisd", "peso", "factory act",
    "checklist", "regulatory",
]
WORKORDER_KEYWORDS = [
    "generate work order", "create work order", "draft work order",
    "raise wo", "raise a wo", "raise work order", "new work order",
    "work order for", "wo for", "create wo", "draft wo",
]


# ---------------------------------------------------------------------------
# State schema — single TypedDict flows through every node
# ---------------------------------------------------------------------------
class SupervisorState(TypedDict, total=False):
    query: str
    kg: Any              # KnowledgeGraph instance (not serialisable)
    vs: Any              # VectorStore instance (not serialisable)
    intent: str
    result: dict
    stream: bool         # Whether to stream the LLM response
    conversation_context: str  # Recent chat history for multi-turn context


# ---------------------------------------------------------------------------
# Node: classify intent (supervisor entry point)
# ---------------------------------------------------------------------------
def classify_node(state: SupervisorState) -> dict:
    """Keyword-based intent classification — deterministic and zero-latency."""
    lower = state["query"].lower()

    if any(kw in lower for kw in WORKORDER_KEYWORDS):
        intent = "workorder"
    elif any(kw in lower for kw in COMPLIANCE_KEYWORDS):
        intent = "compliance"
    elif any(kw in lower for kw in RCA_KEYWORDS):
        intent = "rca"
    else:
        intent = "retrieval"

    return {"intent": intent}


# ---------------------------------------------------------------------------
# Node: retrieval agent
# ---------------------------------------------------------------------------
def retrieval_node(state: SupervisorState) -> dict:
    stream = state.get("stream", False)
    context = state.get("conversation_context", "")
    result = answer_query(state["query"], state["kg"], state["vs"], stream=stream, conversation_context=context)
    result["intent"] = "retrieval"
    return {"result": result}


# ---------------------------------------------------------------------------
# Node: check confidence (re-routing)
# ---------------------------------------------------------------------------
def check_confidence_node(state: SupervisorState) -> dict:
    """Check retrieval confidence and re-route if necessary."""
    result = state["result"]
    sources = result.get("sources", [])
    
    # If we have sources and all of them have low confidence
    if sources and all(s.get("confidence", 0) < 0.15 for s in sources):
        return {"intent": "rca"}
    
    return {}


# ---------------------------------------------------------------------------
# Node: RCA agent
# ---------------------------------------------------------------------------
def rca_node(state: SupervisorState) -> dict:
    query_entities = extract_entities(state["query"])
    equipment_tags = query_entities["equipment"]

    if not equipment_tags:
        # No explicit tag — fall back to retrieval agent
        result = answer_query(state["query"], state["kg"], state["vs"])
        result["intent"] = "retrieval_fallback"
    else:
        result = run_rca(equipment_tags[0], state["kg"], state["vs"])
        result["intent"] = "rca"

    return {"result": result}


# ---------------------------------------------------------------------------
# Node: compliance agent
# ---------------------------------------------------------------------------
def compliance_node(state: SupervisorState) -> dict:
    result = run_compliance_scan(state["kg"], state["vs"])
    result["intent"] = "compliance"
    return {"result": result}


# ---------------------------------------------------------------------------
# Node: work order agent
# ---------------------------------------------------------------------------
def _extract_equipment_from_query(query: str) -> str | None:
    """Extract the first equipment tag mentioned in the query."""
    query_entities = extract_entities(query)
    tags = query_entities["equipment"]
    return tags[0] if tags else None


def _extract_description_from_query(query: str) -> str:
    """Extract a description from the work order query by removing the command prefix."""
    lower = query.lower()
    for kw in WORKORDER_KEYWORDS:
        if kw in lower:
            idx = lower.index(kw) + len(kw)
            desc = query[idx:].strip().strip(".,;:")
            if desc:
                return desc
    return query


def workorder_node(state: SupervisorState) -> dict:
    query = state["query"]
    equipment_tag = _extract_equipment_from_query(query)

    if not equipment_tag:
        return {
            "result": {
                "intent": "workorder",
                "answer": (
                    "Please specify an equipment tag (e.g., V-204, P-101) "
                    "for the work order."
                ),
                "sources": [],
            }
        }

    description = _extract_description_from_query(query)

    # Determine priority from query keywords
    priority = "medium"
    lower = query.lower()
    if any(w in lower for w in ["urgent", "critical", "emergency", "immediate"]):
        priority = "critical"
    elif any(w in lower for w in ["high priority", "important", "soon"]):
        priority = "high"
    elif any(w in lower for w in ["low priority", "when possible", "non-urgent"]):
        priority = "low"

    wo_data = generate_work_order(
        equipment_tag=equipment_tag,
        description=description,
        priority=priority,
        kg=state["kg"],
        vs=state["vs"],
    )

    # Generate both JSON and PDF
    wo_json = render_work_order_json(wo_data)
    try:
        pdf_path = render_work_order_pdf(wo_data)
    except RuntimeError:
        pdf_path = None

    return {
        "result": {
            "intent": "workorder",
            "answer": f"Work order {wo_data['wo_number']} generated for {equipment_tag}.",
            "work_order": wo_data,
            "pdf_path": pdf_path,
            "sources": wo_data.get("related_documents", []),
        }
    }


# ---------------------------------------------------------------------------
# Routing function — used by conditional_edges
# ---------------------------------------------------------------------------
def route_by_intent(state: SupervisorState) -> str:
    """Route to the correct agent node based on classified intent."""
    return state["intent"]

def route_after_retrieval(state: SupervisorState) -> str:
    """Determine whether to re-route to RCA or END based on confidence."""
    # If the check_confidence_node changed intent to 'rca', route there
    if state["intent"] == "rca":
        return "rca"
    return END


# ---------------------------------------------------------------------------
# Build the LangGraph StateGraph
# ---------------------------------------------------------------------------
def _build_graph() -> StateGraph:
    graph = StateGraph(SupervisorState)

    # Add nodes
    graph.add_node("classify", classify_node)
    graph.add_node("retrieval", retrieval_node)
    graph.add_node("check_confidence", check_confidence_node)
    graph.add_node("rca", rca_node)
    graph.add_node("compliance", compliance_node)
    graph.add_node("workorder", workorder_node)

    # Entry point
    graph.set_entry_point("classify")

    # Conditional edges: supervisor → agent
    graph.add_conditional_edges(
        "classify",
        route_by_intent,
        {
            "retrieval": "retrieval",
            "rca": "rca",
            "compliance": "compliance",
            "workorder": "workorder",
        },
    )

    # Retrieval agent edge -> check_confidence
    graph.add_edge("retrieval", "check_confidence")

    # Conditional edges: check_confidence -> RCA or END
    graph.add_conditional_edges(
        "check_confidence",
        route_after_retrieval,
        {
            "rca": "rca",
            END: END,
        }
    )

    # All other agent nodes → END
    graph.add_edge("rca", END)
    graph.add_edge("compliance", END)
    graph.add_edge("workorder", END)

    return graph


# Compile once at module level
_compiled_graph = _build_graph().compile()


# ---------------------------------------------------------------------------
# Public API — drop-in replacement for the old route_query()
# ---------------------------------------------------------------------------
def route_query(query: str, kg, vs, stream: bool = False, conversation_context: str = "") -> dict:
    """Run the LangGraph supervisor workflow.

    Args:
        query: User's natural-language query.
        kg:    KnowledgeGraph instance.
        vs:    VectorStore instance.
        stream: Whether to stream the response (currently supported by retrieval agent).
        conversation_context: Recent chat history for multi-turn context.

    Returns:
        Result dict with 'intent', 'answer', 'sources', etc.
    """
    initial_state: SupervisorState = {
        "query": query,
        "kg": kg,
        "vs": vs,
        "intent": "",
        "result": {},
        "stream": stream,
        "conversation_context": conversation_context,
    }

    final_state = _compiled_graph.invoke(initial_state)
    return final_state["result"]
