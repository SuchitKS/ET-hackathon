import type { PositionedLink } from "@/hooks/useGraphLayout";

export default function GraphEdgesSvg({
  links,
  width,
  height,
  highlightNodeId,
}: {
  links: PositionedLink[];
  width: number;
  height: number;
  highlightNodeId: string | null;
}) {
  return (
    <svg width={width} height={height} className="absolute left-0 top-0" style={{ pointerEvents: "none" }}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10" fill="#D9CDAE" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10" fill="#B5651D" />
        </marker>
      </defs>

      {links.map((l) => {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        const rSource = l.source.type === "equipment" ? 30 : 26;
        const rTarget = 32;
        const x1 = l.source.x + ux * rSource;
        const y1 = l.source.y + uy * rSource;
        const x2 = l.target.x - ux * rTarget;
        const y2 = l.target.y - uy * rTarget;

        const active = highlightNodeId && (l.source.id === highlightNodeId || l.target.id === highlightNodeId);

        return (
          <path
            key={l.id}
            d={`M${x1},${y1} L${x2},${y2}`}
            stroke={active ? "#B5651D" : "#DCD2B4"}
            strokeWidth={active ? 1.5 : 1}
            fill="none"
            opacity={highlightNodeId ? (active ? 1 : 0.15) : 0.85}
            markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
          />
        );
      })}
    </svg>
  );
}
