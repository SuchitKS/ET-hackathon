import { Loader2, Check, AlertCircle, Clock } from "lucide-react";
import type { IngestStatus } from "@/types";

const META: Record<IngestStatus, { label: string; color: string; icon: typeof Check }> = {
  queued: { label: "Queued", color: "#6E6754", icon: Clock },
  extracting: { label: "Extracting", color: "#B5651D", icon: Loader2 },
  linked: { label: "Linked to graph", color: "#2B6B54", icon: Check },
  error: { label: "Failed", color: "#A13F28", icon: AlertCircle },
};

export default function StatusBadge({ status }: { status: IngestStatus }) {
  const meta = META[status];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium"
      style={{ color: meta.color, backgroundColor: `${meta.color}14` }}
    >
      <Icon size={12} className={status === "extracting" ? "animate-spin" : ""} />
      {meta.label}
    </span>
  );
}
