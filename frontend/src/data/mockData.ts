import type { GraphData, ChatMessage, WorkOrder, DocumentRecord } from "@/types";

// ---------------------------------------------------------------------------
// MOCK DATA — Pump P-102 scenario
// This stands in for what the real pipeline (ingestion -> Neo4j + Chroma ->
// GraphRAG retrieval -> LangGraph agents) will eventually produce. Every
// component below reads from this file or from `mockChat`, so once the
// backend exists, only this file's exports need to be replaced with real
// fetch() calls — see src/lib/api.ts for the seam.
// ---------------------------------------------------------------------------

export const graphData: GraphData = {
  nodes: [
    { id: "eq-p102", type: "equipment", label: "Pump P-102", sublabel: "Centrifugal transfer pump · Unit 4",
      detail: { Install: "2019-02-11", Manufacturer: "Kestrel Hydraulics", Criticality: "High" } },

    { id: "f-0314", type: "failure", label: "Bearing seizure", sublabel: "14 Mar 2024",
      detail: { Downtime: "58 hrs", Symptom: "Vibration spike, overheat" } },
    { id: "f-0722", type: "failure", label: "Bearing seizure", sublabel: "22 Jul 2024",
      detail: { Downtime: "51 hrs", Symptom: "Vibration spike, overheat" } },
    { id: "f-1103", type: "failure", label: "Bearing seizure", sublabel: "03 Nov 2024",
      detail: { Downtime: "47 hrs", Symptom: "Vibration spike, overheat" } },

    { id: "doc-wo441", type: "document", label: "WO-441", sublabel: "Work order · 14 Mar 2024" },
    { id: "doc-wo445", type: "document", label: "WO-445", sublabel: "Work order · 22 Jul 2024" },
    { id: "doc-wo452", type: "document", label: "WO-452", sublabel: "Work order · 03 Nov 2024" },
    { id: "doc-insp09", type: "document", label: "INSP-2024-09", sublabel: "Inspection report" },
    { id: "doc-oem", type: "document", label: "OEM-P102", sublabel: "Manufacturer manual" },

    { id: "proc-sop12", type: "procedure", label: "SOP-12", sublabel: "Lubrication interval: 180 days" },

    { id: "person-rsingh", type: "person", label: "R. Singh", sublabel: "Maintenance technician" },
    { id: "person-akumar", type: "person", label: "A. Kumar", sublabel: "Inspection lead" },
  ],
  edges: [
    { id: "e1", source: "eq-p102", target: "f-0314", relation: "HAS_FAILURE" },
    { id: "e2", source: "eq-p102", target: "f-0722", relation: "HAS_FAILURE" },
    { id: "e3", source: "eq-p102", target: "f-1103", relation: "HAS_FAILURE" },

    { id: "e4", source: "f-0314", target: "doc-wo441", relation: "DOCUMENTED_IN" },
    { id: "e5", source: "f-0722", target: "doc-wo445", relation: "DOCUMENTED_IN" },
    { id: "e6", source: "f-1103", target: "doc-wo452", relation: "DOCUMENTED_IN" },

    { id: "e7", source: "doc-wo441", target: "person-rsingh", relation: "LOGGED_BY" },
    { id: "e8", source: "doc-wo445", target: "person-rsingh", relation: "LOGGED_BY" },
    { id: "e9", source: "doc-wo452", target: "person-akumar", relation: "LOGGED_BY" },

    { id: "e10", source: "eq-p102", target: "doc-insp09", relation: "INSPECTED_IN" },
    { id: "e11", source: "doc-insp09", target: "person-akumar", relation: "LOGGED_BY" },

    { id: "e12", source: "eq-p102", target: "proc-sop12", relation: "MAINTAINED_UNDER" },
    { id: "e13", source: "eq-p102", target: "doc-oem", relation: "REFERENCED_BY" },
    { id: "e14", source: "proc-sop12", target: "doc-oem", relation: "SHOULD_MATCH" },
  ],
};

export const mockChat: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    text: "Why does pump P-102 keep failing, and does our current maintenance procedure address it?",
    timestamp: "09:14",
  },
  {
    id: "m2",
    role: "assistant",
    agent: "rca",
    latencyMs: 1840,
    timestamp: "09:14",
    traceSummary: "Traced 3 linked failure events, cross-referenced OEM spec against active procedure",
    text:
      "P-102 has seized on the same bearing three times in eight months. Each event was logged separately — " +
      "as three unrelated work orders — but the graph links them to one shared cause: the OEM manual specifies " +
      "a 90-day lubrication interval, while the plant's active procedure, SOP-12, specifies 180 days. The bearing " +
      "is running twice as long between lubrications as the manufacturer allows.",
    citations: [
      { id: "WO-441", label: "Work order · 14 Mar 2024", snippet: "Bearing seizure, vibration spike prior to failure. Lubrication last recorded 172 days earlier." },
      { id: "WO-445", label: "Work order · 22 Jul 2024", snippet: "Recurrence, same failure mode. Lubrication last recorded 179 days earlier." },
      { id: "WO-452", label: "Work order · 03 Nov 2024", snippet: "Third recurrence. Lubrication last recorded 168 days earlier." },
      { id: "OEM-P102", label: "Manufacturer manual", snippet: "Recommended lubrication interval: 90 days under standard duty cycle." },
      { id: "SOP-12", label: "Active procedure", snippet: "Lubrication interval: 180 days." },
    ],
    finding: {
      headline: "SOP-12's interval doesn't match the manufacturer spec — root cause of all three failures",
      metricValue: "156",
      metricLabel: "hrs downtime avoidable",
      detail: "Estimated from WO-445 and WO-452 — both preventable had the OEM interval been in effect after the first failure.",
    },
  },
  {
    id: "m3",
    role: "user",
    text: "Who inspected it most recently, and is that person aware of the pattern?",
    timestamp: "09:16",
  },
  {
    id: "m4",
    role: "assistant",
    agent: "retrieval",
    latencyMs: 640,
    timestamp: "09:16",
    traceSummary: "Matched 2 relevant documents via GraphRAG lookup",
    text:
      "A. Kumar filed the most recent inspection, INSP-2024-09, and also logged WO-452 — the third failure. " +
      "Nothing in either record cross-references the earlier two events, since they were logged by a different " +
      "technician under separate work orders.",
    citations: [
      { id: "INSP-2024-09", label: "Inspection report", snippet: "Routine inspection, no anomalies flagged at time of visit." },
      { id: "WO-452", label: "Work order · 03 Nov 2024", snippet: "Filed by A. Kumar. No reference to prior bearing events." },
    ],
  },
];

export const workOrder: WorkOrder = {
  id: "WO-DRAFT-118",
  asset: "Pump P-102",
  title: "Revise SOP-12 lubrication interval to match OEM specification",
  rootCause: "SOP-12 specifies a 180-day lubrication interval against the manufacturer's 90-day recommendation, " +
    "driving repeated bearing seizure across three documented failures.",
  recommendedAction: "Update SOP-12 to a 90-day interval. Schedule immediate lubrication service ahead of the " +
    "next 180-day cycle to close the current gap.",
  downtimeAvoidedHrs: 156,
  linkedDocs: ["WO-441", "WO-445", "WO-452", "OEM-P102", "SOP-12"],
  generatedAt: "2025-11-04 09:18",
};

export const ingestedDocuments: DocumentRecord[] = [
  { id: "doc-wo441", name: "WO-441.pdf", kind: "work_order", status: "linked", uploadedAt: "14 Mar 2024", linkedEntities: 4, sizeKb: 212 },
  { id: "doc-wo445", name: "WO-445.pdf", kind: "work_order", status: "linked", uploadedAt: "22 Jul 2024", linkedEntities: 4, sizeKb: 198 },
  { id: "doc-wo452", name: "WO-452.pdf", kind: "work_order", status: "linked", uploadedAt: "03 Nov 2024", linkedEntities: 5, sizeKb: 231 },
  { id: "doc-insp09", name: "INSP-2024-09.pdf", kind: "inspection", status: "linked", uploadedAt: "18 Sep 2024", linkedEntities: 3, sizeKb: 340 },
  { id: "doc-oem", name: "OEM-P102-manual.pdf", kind: "manual", status: "linked", uploadedAt: "11 Feb 2019", linkedEntities: 2, sizeKb: 4120 },
  { id: "doc-sop12", name: "SOP-12-lubrication.pdf", kind: "procedure", status: "linked", uploadedAt: "02 Jan 2023", linkedEntities: 2, sizeKb: 156 },
  { id: "doc-pid-4", name: "PID-unit4-transfer.pdf", kind: "pid", status: "linked", uploadedAt: "30 Apr 2021", linkedEntities: 6, sizeKb: 891 },
];
