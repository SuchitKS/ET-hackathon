import type { ChatMessage } from "@/types";
import { FileText, Cog, User, Workflow, X } from "lucide-react";

export default function EvidencePanel({ message, onClose }: { message: ChatMessage; onClose: () => void }) {
  const citations = message.citations ?? [];
  const finding = message.finding;

  // Extract asset tags from text (e.g. P-101, V-204)
  const assetTags = message.text.match(/[A-Z]+-\d+/g) ?? [];
  const uniqueAssets = [...new Set(assetTags)];

  // Extract person names mentioned (simple heuristic)
  const personPattern = /(?:Mr\.|Ms\.|Dr\.)\s[A-Z]\w+|[A-Z]\.\s[A-Z]\w+/g;
  const people = message.text.match(personPattern) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(11,11,12,0.6)", backdropFilter: "blur(4px)" }}>
      {/* Click outside to close */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <aside className="glass relative flex h-full w-[400px] flex-col shadow-lift animate-slide-in-right border-l border-line">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <span className="text-[13px] font-semibold tracking-wide uppercase text-ink">Evidence Inspector</span>
          <button onClick={onClose} className="rounded-md p-1.5 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink">
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-7">
          {/* Finding */}
          {finding && (
            <Section title="Structured Finding">
              <div className="rounded-lg bg-surface2/50 border border-line p-4">
                <div className="font-sans text-[22px] font-semibold tracking-tight text-ink">{finding.metricValue}</div>
                <div className="mt-1 text-[11px] font-mono tracking-wider uppercase text-faint">{finding.metricLabel}</div>
                <div className="mt-3 text-[13px] leading-relaxed text-soft">{finding.headline}</div>
              </div>
            </Section>
          )}

          {/* Referenced Documents */}
          {citations.length > 0 && (
            <Section title={`Source Documents (${citations.length})`}>
              <div className="space-y-2">
                {citations.map((c) => (
                  <div key={c.id} className="group flex flex-col gap-1.5 rounded-lg bg-surface2/30 border border-line px-3 py-3 transition-colors duration-150 hover:bg-surface2/60">
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-faint" strokeWidth={2} />
                      <div className="font-mono text-[11px] font-medium text-ink/80">{c.id}</div>
                    </div>
                    <div className="text-[12px] leading-relaxed text-soft pl-[20px]">{c.snippet}</div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Related Assets */}
          {uniqueAssets.length > 0 && (
            <Section title={`Impacted Assets (${uniqueAssets.length})`}>
              <div className="flex flex-wrap gap-2">
                {uniqueAssets.map((a) => (
                  <span key={a} className="flex items-center gap-1.5 rounded-md bg-surface2 border border-line px-2.5 py-1 font-mono text-[11px] text-ink">
                    <Cog size={11} className="text-faint" />{a}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* People Mentioned */}
          {people.length > 0 && (
            <Section title={`Personnel (${people.length})`}>
              <div className="space-y-1.5">
                {people.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-1 py-0.5">
                    <User size={12} className="text-faint" strokeWidth={2} />
                    <span className="text-[12.5px] font-medium text-ink/90">{p}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-[0.1em] text-faint mb-3 uppercase">{title}</div>
      {children}
    </div>
  );
}
