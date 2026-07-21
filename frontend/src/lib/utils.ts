import type { AgentName } from "@/types";

// Stand-in for the real Supervisor's LLM classification call. Same idea,
// much cheaper: keyword match on intent. Replace with the real routed
// agent once /api/chat returns one — this only drives the mock UI.
export function predictAgent(question: string): AgentName {
  const q = question.toLowerCase();
  if (/(generate work order|create work order|draft work order|raise wo|raise a wo|raise work order|new work order|work order for|wo for|create wo|draft wo)/.test(q)) return "workorder";
  if (/(downstream|upstream|connected to|connects to|trace the flow|what feeds|flow from|flow to|p&id|pid|process flow)/.test(q)) return "architecture";
  if (/(comply|complian|regulat|procedure|checklist|sop|audit)/.test(q)) return "compliance";
  if (/(why|fail|cause|root|recur|broke|seiz)/.test(q)) return "rca";
  return "retrieval";
}

// The backend sometimes sends a raw ISO timestamp (e.g. from a server-side
// event) instead of a pre-formatted short time. Format defensively so a
// stray ISO string never renders raw in the UI.
export function formatTimestamp(value: string): string {
  if (!value) return "";
  if (/^\d{1,2}:\d{2}\s?(AM|PM)?$/i.test(value.trim())) return value;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return value;
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
