// These shapes mirror what the real API (FastAPI + Neo4j + Chroma) will
// eventually return. The UI is built against these interfaces so swapping
// mock data in `src/data/mockData.ts` for real fetch calls requires no
// component changes — only `src/lib/api.ts` needs to change.

export type NodeType = "equipment" | "failure" | "procedure" | "document" | "person";

export type IngestStatus = "queued" | "extracting" | "linked" | "error";

export interface DocumentRecord {
  id: string;
  name: string;
  kind: "work_order" | "inspection" | "manual" | "procedure" | "pid" | "other";
  status: IngestStatus;
  uploadedAt: string;
  linkedEntities?: number;
  sizeKb?: number;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel?: string;
  detail?: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string; // e.g. HAS_FAILURE, DOCUMENTED_IN, ADDRESSED_BY
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type AgentName = "retrieval" | "rca" | "compliance" | "workorder";

export interface Citation {
  id: string; // e.g. "WO-445"
  label: string;
  snippet: string;
}

export interface Finding {
  headline: string;
  metricValue: string;
  metricLabel: string;
  detail: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  agent?: AgentName;
  latencyMs?: number;
  text: string;
  citations?: Citation[];
  finding?: Finding;
  timestamp: string;
  /** One-line summary of what the agent did — shown in the pipeline trace. */
  traceSummary?: string;
  /** Set when this message represents a failed request, not an answer. */
  isError?: boolean;
  /** Parent message ID for follow-up threading */
  parentId?: string;
  /** Follow-up messages attached to this investigation card */
  followUps?: ChatMessage[];
}

export interface WorkOrder {
  id: string;
  asset: string;
  title: string;
  rootCause: string;
  recommendedAction: string;
  downtimeAvoidedHrs: number;
  linkedDocs: string[];
  generatedAt: string;
  pdfUrl?: string | null;
}
