import { useState } from "react";
import type { Citation } from "@/types";

export default function CitationTag({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="rounded-md border border-line bg-surface2 px-1.5 py-0.5 font-mono text-[10.5px] text-soft transition-colors hover:border-amber/50 hover:text-amber"
        onClick={() => setOpen((v) => !v)}
      >
        {citation.id}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-lg border border-line bg-surface p-3 text-left shadow-lift">
          <div className="mb-1 text-[11.5px] font-medium text-amber">{citation.label}</div>
          <div className="text-[12px] leading-snug text-soft">{citation.snippet}</div>
        </div>
      )}
    </span>
  );
}
