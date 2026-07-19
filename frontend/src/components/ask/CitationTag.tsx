import { useState } from "react";
import type { Citation } from "@/types";

export default function CitationTag({ citation }: { citation: Citation }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        className="rounded-[4px] bg-surface2 border border-line px-1.5 py-0.5 font-mono text-[9px] text-faint transition-colors duration-150 hover:border-lineH hover:text-ink"
        onClick={() => setOpen((v) => !v)}
      >
        {citation.id}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-64 rounded-md border border-line bg-surface p-3 shadow-lift animate-fade-in">
          <div className="mb-1 font-mono text-[10px] font-medium text-ink">{citation.label}</div>
          <div className="text-[11.5px] leading-relaxed text-soft">{citation.snippet}</div>
        </div>
      )}
    </span>
  );
}
