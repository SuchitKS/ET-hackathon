import type { DocumentRecord } from "@/types";
import { KIND_META } from "./docMeta";
import StatusBadge from "./StatusBadge";

export default function DocumentRow({ doc }: { doc: DocumentRecord }) {
  const meta = KIND_META[doc.kind];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 border-b border-line/60 px-1 py-3 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface2">
        <Icon size={14} className="text-soft" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{doc.name}</div>
        <div className="text-[11.5px] text-faint">
          {meta.label} · {doc.uploadedAt}
          {doc.sizeKb ? ` · ${doc.sizeKb >= 1024 ? (doc.sizeKb / 1024).toFixed(1) + " MB" : doc.sizeKb + " KB"}` : ""}
        </div>
      </div>
      {doc.status === "linked" && doc.linkedEntities != null && (
        <span className="hidden shrink-0 text-[12px] text-soft sm:inline">{doc.linkedEntities} entities linked</span>
      )}
      <StatusBadge status={doc.status} />
    </div>
  );
}
