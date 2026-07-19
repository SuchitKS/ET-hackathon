import { X } from "lucide-react";
import type { PositionedNode, PositionedLink } from "@/hooks/useGraphLayout";
import { NODE_META } from "./graphMeta";

export default function NodeDetailPanel({
  node,
  links,
  onClose,
  onSelectNode,
}: {
  node: PositionedNode | null;
  links: PositionedLink[];
  onClose: () => void;
  onSelectNode: (id: string) => void;
}) {
  if (!node) return null;

  const isFail = node.type === "failure";

  return (
    <aside
      className="glass absolute right-0 top-0 z-10 h-full w-[320px] overflow-y-auto shadow-lift animate-slide-in-right"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-line p-5">
        <div>
          <span className={`text-caption ${isFail ? "text-failure" : "text-faint"}`}>
            {NODE_META[node.type].label.toUpperCase()}
          </span>
          <div className="mt-1.5 text-[16px] font-semibold tracking-tight text-ink">{node.label}</div>
          {node.sublabel && <div className="mt-0.5 text-[12px] text-faint">{node.sublabel}</div>}
        </div>
        <button onClick={onClose} className="rounded-[4px] p-1 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink">
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Metadata */}
      {node.detail && (
        <div className="border-b border-line p-5 space-y-3">
          <div className="text-caption text-faint mb-2">METADATA</div>
          {Object.entries(node.detail).map(([k, v]) => (
            <div key={k}>
              <div className="text-caption text-faint/60">{k.toUpperCase()}</div>
              <div className="mt-0.5 font-mono text-[11px] text-ink/80 break-all">{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Connections */}
      <div className="p-5">
        <div className="text-caption text-faint mb-3">CONNECTIONS</div>
        <div className="space-y-1.5">
          {links
            .filter((l) => l.source.id === node.id || l.target.id === node.id)
            .map((l) => {
              const other = l.source.id === node.id ? l.target : l.source;
              return (
                <button
                  key={l.id}
                  onClick={() => onSelectNode(other.id)}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md bg-surface2/30 border border-line px-3 py-2 text-left transition-colors duration-150 hover:bg-surface3/50 hover:border-lineH"
                >
                  <span className="text-caption text-faint/50">
                    {l.relation.replace(/_/g, " ")}
                  </span>
                  <span className="text-[12px] font-medium text-ink/80 line-clamp-1">{other.label}</span>
                </button>
              );
            })}
        </div>
      </div>
    </aside>
  );
}
