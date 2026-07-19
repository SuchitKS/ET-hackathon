import { FileText, ClipboardCheck, BookOpen, ClipboardList, Waypoints, File } from "lucide-react";
import type { DocumentRecord } from "@/types";

export const KIND_META: Record<DocumentRecord["kind"], { label: string; icon: typeof FileText }> = {
  work_order: { label: "Work order", icon: FileText },
  inspection: { label: "Inspection report", icon: ClipboardCheck },
  manual: { label: "Manufacturer manual", icon: BookOpen },
  procedure: { label: "Procedure", icon: ClipboardList },
  pid: { label: "P&ID drawing", icon: Waypoints },
  other: { label: "Document", icon: File },
};
