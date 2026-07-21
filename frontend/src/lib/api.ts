// -----------------------------------------------------------------------------
// This file is the seam between the UI and the real backend.
// Every function currently returns mock data. Once the FastAPI backend exists,
// replace each function body with a fetch() call — the return types already
// match what the pipeline (Neo4j + Chroma + LangGraph agents) will produce,
// so no component code needs to change.
// -----------------------------------------------------------------------------

import type { ChatMessage, GraphData, WorkOrder, DocumentRecord, Conversation } from "@/types";
import { graphData, mockChat, workOrder, ingestedDocuments } from "@/data/mockData";
import { predictAgent } from "@/lib/utils";

const MOCK_LATENCY = 500;

const BASE_URL = "http://localhost:8000";

// Persist session ID in localStorage so it survives page refreshes and tab closes
export function initSessionId(): string {
  let id = localStorage.getItem("strata_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("strata_session_id", id);
  }
  return id;
}

export function getSessionId(): string {
  return initSessionId();
}

export function createNewSession(): string {
  const id = crypto.randomUUID();
  localStorage.setItem("strata_session_id", id);
  return id;
}

export function getOperator(): string | null {
  return localStorage.getItem("strata_operator");
}

export function setOperator(name: string) {
  localStorage.setItem("strata_operator", name);
}

export async function fetchConversations(operator?: string | null): Promise<Conversation[]> {
  const url = new URL(`${BASE_URL}/api/conversations`);
  if (operator) {
    url.searchParams.append("operator", operator);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${BASE_URL}/api/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}

export async function updateAlertStatus(id: string, status: string, operator?: string | null) {
  const op = operator !== undefined ? operator : getOperator();
  const res = await fetch(`${BASE_URL}/api/alerts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, updated_by: op }),
  });
  if (!res.ok) throw new Error("Failed to update alert status");
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const res = await fetch(`${BASE_URL}/api/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload document");
  return res.json();
}

export async function fetchGraph(): Promise<GraphData> {
  const res = await fetch(`${BASE_URL}/api/graph`);
  if (!res.ok) throw new Error("Failed to fetch graph");
  return res.json();
}

export async function fetchChatHistory(sessionId?: string): Promise<ChatMessage[]> {
  const sid = sessionId || getSessionId();
  try {
    const res = await fetch(`${BASE_URL}/api/chat/history?session_id=${sid}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function sendQuestion(question: string): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: question }),
  });
  if (!res.ok) throw new Error("Failed to send question");
  return res.json();
}

export async function* sendQuestionStream(question: string, sessionId?: string, operator?: string | null) {
  const sid = sessionId || getSessionId();
  const op = operator !== undefined ? operator : getOperator();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question, session_id: sid, operator: op }),
    });
  } catch {
    // The fetch itself failed — the backend is unreachable (not running,
    // wrong port, etc.), as opposed to reachable-but-erroring below.
    throw new Error(`Can't reach the backend at ${BASE_URL}. Is it running?`);
  }

  if (!res.ok) {
    // The backend's global exception handler returns {"error": "..."} for
    // any unhandled failure — surface that instead of a generic message.
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) detail = body.error;
    } catch {
      // Response wasn't JSON — fall back to the status line.
    }
    throw new Error(detail);
  }
  
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const message = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (message.startsWith('data: ')) {
        const dataStr = message.slice(6);
        if (dataStr === '[DONE]') break;
        try {
            yield JSON.parse(dataStr);
        } catch(e) {}
      }
      boundary = buffer.indexOf('\n\n');
    }
  }
}

export async function generateWorkOrder(findingContext?: string, operator?: string | null): Promise<WorkOrder> {
  // Try to extract equipment tag from the context (e.g. "P-101") if passed, else fallback
  let equipment_tag = "P-101";
  if (findingContext) {
    const match = findingContext.match(/[A-Z]+-\d+/);
    if (match) equipment_tag = match[0];
  }
  
  const op = operator !== undefined ? operator : getOperator();
  
  const res = await fetch(`${BASE_URL}/api/work-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      equipment_tag,
      description: findingContext ? `Fix issue: ${findingContext}` : "General maintenance",
      priority: "high",
      requester: op || "System Generated (RCA Agent)"
    }),
  });
  if (!res.ok) throw new Error("Failed to generate work order");
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
