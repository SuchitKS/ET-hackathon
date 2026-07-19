import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute right-0 top-0 z-10 h-full w-[300px] overflow-y-auto border-l border-line bg-surface p-4 shadow-lift"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <span className="text-[12.5px] font-medium" style={{ color: NODE_META[node.type].accent }}>
                {NODE_META[node.type].label}
              </span>
              <div className="mt-1 font-display text-[17px] font-medium text-ink">{node.label}</div>
              {node.sublabel && <div className="text-[12px] text-soft">{node.sublabel}</div>}
            </div>
            <button onClick={onClose} className="rounded p-1 text-soft hover:bg-surface2 hover:text-ink">
              <X size={16} />
            </button>
          </div>

          {node.detail && (
            <div className="mb-5 space-y-2">
              {Object.entries(node.detail).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-line/70 pb-1.5">
                  <span className="text-[12px] text-soft">{k}</span>
                  <span className="font-mono text-[12px] text-ink">{v}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-2 text-[12px] font-medium text-soft">Connections</div>
          <div className="space-y-1.5">
            {links
              .filter((l) => l.source.id === node.id || l.target.id === node.id)
              .map((l) => {
                const other = l.source.id === node.id ? l.target : l.source;
                return (
                  <button
                    key={l.id}
                    onClick={() => onSelectNode(other.id)}
                    className="flex w-full items-center justify-between rounded-md border border-line bg-surface2 px-2.5 py-2 text-left hover:border-faint"
                  >
                    <span className="text-[12.5px] text-ink">{other.label}</span>
                    <span className="font-mono text-[10px] text-faint">{l.relation.toLowerCase().replace(/_/g, " ")}</span>
                  </button>
                );
              })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
