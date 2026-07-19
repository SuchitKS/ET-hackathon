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
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 1L8 5L0 9" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        </marker>
        <marker id="arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 1L8 5L0 9" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        </marker>
        <marker id="arrow-fail" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 1L8 5L0 9" fill="none" stroke="#E5553B" strokeWidth="1" />
        </marker>
      </defs>

      {links.map((l) => {
        const dx = l.target.x - l.source.x;
        const dy = l.target.y - l.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;

        const rSource = l.source.type === "equipment" ? 40 : 28;
        const rTarget = 35;
        const x1 = l.source.x + ux * rSource;
        const y1 = l.source.y + uy * rSource;
        const x2 = l.target.x - ux * rTarget;
        const y2 = l.target.y - uy * rTarget;

        const isFailEdge = l.source.type === "failure" || l.target.type === "failure";
        const curveFactor = isFailEdge ? 0.05 : 0.12;
        const curvature = Math.min(dist * curveFactor, 40);
        const curveDir = l.id.length % 2 === 0 ? 1 : -1;
        const mx = (x1 + x2) / 2 + (-uy * curvature * curveDir);
        const my = (y1 + y2) / 2 + (ux * curvature * curveDir);

        const active = highlightNodeId && (l.source.id === highlightNodeId || l.target.id === highlightNodeId);
        const strokeColor = active
          ? (isFailEdge ? "#E5553B" : "rgba(255,255,255,0.4)")
          : "rgba(255,255,255,0.04)";
        const strokeW = active ? 1.2 : (isFailEdge ? 0.8 : 0.4);
        const marker = active ? (isFailEdge ? "url(#arrow-fail)" : "url(#arrow-active)") : "url(#arrow)";

        return (
          <path
            key={l.id}
            d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
            stroke={strokeColor}
            strokeWidth={strokeW}
            fill="none"
            opacity={highlightNodeId ? (active ? 1 : 0.02) : 1}
            markerEnd={marker}
            style={{ transition: "all 200ms ease-out" }}
          />
        );
      })}
    </svg>
  );
}
