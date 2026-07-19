import { Cog, AlertTriangle, FileText, ClipboardList, User } from "lucide-react";
import type { NodeType } from "@/types";

export const NODE_META: Record<NodeType, { label: string; icon: typeof Cog; accent: string }> = {
  equipment: { label: "Equipment", icon: Cog, accent: "#B5651D" },
  failure: { label: "Failure event", icon: AlertTriangle, accent: "#A13F28" },
  document: { label: "Document", icon: FileText, accent: "#2B6B54" },
  procedure: { label: "Procedure", icon: ClipboardList, accent: "#8A7A4E" },
  person: { label: "Person", icon: User, accent: "#6E6754" },
};

export const NODE_ORDER: NodeType[] = ["equipment", "failure", "document", "procedure", "person"];
