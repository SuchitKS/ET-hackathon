import type { PositionedNode } from "@/hooks/useGraphLayout";
import { NODE_META } from "./graphMeta";

export default function GraphNodeChip({
  node,
  selected,
  dimmed,
  index,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  index: number;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;

  const isEquip = node.type === "equipment";
  const isFail = node.type === "failure";
  const isDoc = node.type === "document" || node.type === "procedure";

  const sizeClass = isEquip
    ? "px-3 py-1.5 text-[12px]"
    : isFail
    ? "px-2.5 py-1 text-[11px]"
    : isDoc
    ? "px-2 py-1 text-[10.5px]"
    : "px-1.5 py-0.5 text-[10px]";

  const iconSize = isEquip ? 12 : isFail ? 11 : isDoc ? 10 : 9;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="group absolute -translate-x-1/2 -translate-y-1/2 z-10 transition-opacity duration-200"
      style={{
        left: node.x,
        top: node.y,
        opacity: dimmed ? 0.06 : 1,
      }}
    >
      <span
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-md border font-sans font-medium max-w-[160px] transition-all duration-150 group-hover:-translate-y-[1px] ${sizeClass}`}
        style={{
          borderColor: selected ? (isFail ? "#E5553B" : "#E4E4E7") : "rgba(255,255,255,0.06)",
          backgroundColor: selected ? "rgba(255,255,255,0.06)" : "#111113",
          color: selected ? "#E4E4E7" : "#A1A1AA",
        }}
      >
        <Icon size={iconSize} strokeWidth={selected ? 2.5 : 1.8} className="shrink-0" style={{ color: isFail && selected ? "#E5553B" : undefined }} />
        <span className="truncate">{node.label}</span>
      </span>
    </button>
  );
}
