// -----------------------------------------------------------------------------
// This file is the seam between the UI and the real backend.
// Every function currently returns mock data. Once the FastAPI backend exists,
// replace each function body with a fetch() call — the return types already
// match what the pipeline (Neo4j + Chroma + LangGraph agents) will produce,
// so no component code needs to change.
// -----------------------------------------------------------------------------

import type { ChatMessage, GraphData, WorkOrder, DocumentRecord } from "@/types";
import { graphData, mockChat, workOrder, ingestedDocuments } from "@/data/mockData";
import { predictAgent } from "@/lib/utils";

const MOCK_LATENCY = 500;

const BASE_URL = "http://localhost:8000";

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

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  // Hackathon demo: always start with a clean slate unless using real DB
  return [];
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

export async function* sendQuestionStream(question: string) {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: question }),
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

export async function generateWorkOrder(findingContext?: string): Promise<WorkOrder> {
  // Try to extract equipment tag from the context (e.g. "P-101") if passed, else fallback
  let equipment_tag = "P-101";
  if (findingContext) {
    const match = findingContext.match(/[A-Z]+-\d+/);
    if (match) equipment_tag = match[0];
  }
  
  const res = await fetch(`${BASE_URL}/api/work-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      equipment_tag,
      description: findingContext ? `Fix issue: ${findingContext}` : "General maintenance",
      priority: "high",
      requester: "System Generated (RCA Agent)"
    }),
  });
  if (!res.ok) throw new Error("Failed to generate work order");
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
