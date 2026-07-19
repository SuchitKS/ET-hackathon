import { motion } from "framer-motion";
import type { PositionedNode } from "@/hooks/useGraphLayout";
import { NODE_META } from "./graphMeta";

export default function GraphNodeChip({
  node,
  selected,
  dimmed,
  index,
  onSelect,
}: {
  node: PositionedNode;
  selected: boolean;
  dimmed: boolean;
  index: number;
  onSelect: () => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;
  const isEquipment = node.type === "equipment";

  return (
    <motion.button
      onClick={onSelect}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: dimmed ? 0.25 : 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.012, 0.6), ease: "easeOut" }}
      className="group absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: node.x, top: node.y }}
    >
      <span
        className="flex items-center gap-2 whitespace-nowrap rounded-full border bg-surface py-1.5 pl-1.5 pr-3.5 shadow-soft transition-transform group-hover:scale-105"
        style={{
          borderColor: selected ? meta.accent : "#E6DECB",
          boxShadow: selected ? `0 0 0 3px ${meta.accent}22` : undefined,
        }}
      >
        <span
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{
            width: isEquipment ? 26 : 22,
            height: isEquipment ? 26 : 22,
            backgroundColor: `${meta.accent}17`,
          }}
        >
          <Icon size={isEquipment ? 14 : 12} color={meta.accent} strokeWidth={2.2} />
        </span>
        <span className={`font-sans font-medium text-ink ${isEquipment ? "text-[13px]" : "text-[12px]"}`}>
          {node.label}
        </span>
      </span>
    </motion.button>
  );
}
