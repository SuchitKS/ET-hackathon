import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Search as SearchIcon } from "lucide-react";
import type { GraphData } from "@/types";
import { useGraphLayout } from "@/hooks/useGraphLayout";
import { usePanZoom } from "@/hooks/usePanZoom";
import GraphEdgesSvg from "./GraphEdgesSvg";
import GraphNodeChip from "./GraphNodeChip";
import GraphLegend from "./GraphLegend";
import NodeDetailPanel from "./NodeDetailPanel";

export default function KnowledgeGraph({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fitted, setFitted] = useState(false);
  const [search, setSearch] = useState("");

  const { nodes, links, canvasWidth, canvasHeight } = useGraphLayout(data);
  const pz = usePanZoom({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (fitted || viewport.width === 0 || canvasWidth === 0) return;
    const scale = Math.min((viewport.width / canvasWidth) * 0.9, (viewport.height / canvasHeight) * 0.9, 1);
    pz.setTransform({
      scale,
      x: (viewport.width - canvasWidth * scale) / 2,
      y: (viewport.height - canvasHeight * scale) / 2,
    });
    setFitted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, canvasWidth, canvasHeight, fitted]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const activeId = hoveredId || selectedId;

  const filteredNodes = search.trim()
    ? nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase()))
    : nodes;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      style={{ backgroundColor: "#0C0C0E" }}
      onPointerDown={pz.onPointerDown}
      onPointerMove={pz.onPointerMove}
      onPointerUp={pz.onPointerUp}
      onWheel={pz.onWheel}
    >
      {/* Very faint grid — almost invisible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: `${48 * pz.transform.scale}px ${48 * pz.transform.scale}px`,
          backgroundPosition: `${pz.transform.x}px ${pz.transform.y}px`,
          opacity: 0.5,
        }}
      />

      {viewport.width > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${pz.transform.x}px, ${pz.transform.y}px) scale(${pz.transform.scale})`,
          }}
        >
          <GraphEdgesSvg links={links} width={canvasWidth} height={canvasHeight} highlightNodeId={activeId} />
          {nodes.map((n, i) => {
            const isFaded = Boolean(activeId) &&
              n.id !== activeId &&
              !links.some((l) => (l.source.id === activeId && l.target.id === n.id) || (l.target.id === activeId && l.source.id === n.id));
            const matchesSearch = Boolean(search.trim()) && filteredNodes.some(fn => fn.id === n.id);

            return (
              <GraphNodeChip
                key={n.id}
                node={n}
                index={i}
                selected={n.id === selectedId || matchesSearch}
                dimmed={isFaded || (search.trim() !== "" && !matchesSearch)}
                onSelect={() => setSelectedId(n.id === selectedId ? null : n.id)}
                onHoverStart={() => setHoveredId(n.id)}
                onHoverEnd={() => setHoveredId(null)}
              />
            );
          })}
        </div>
      )}

      {/* Search */}
      <div className="absolute left-5 top-5 z-10 w-56">
        <div className="glass flex items-center gap-2 rounded-md px-3 py-1.5 transition-all duration-150 focus-within:shadow-focus">
          <SearchIcon size={11} className="text-faint shrink-0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search graph…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-[11px] text-ink outline-none placeholder:text-faint/50"
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="glass absolute right-5 top-5 flex flex-col rounded-md p-0.5 shadow-soft">
        <button onClick={() => pz.zoomBy(1.25)} className="rounded-[4px] p-1.5 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink" aria-label="Zoom in">
          <ZoomIn size={12} strokeWidth={2} />
        </button>
        <button onClick={() => pz.zoomBy(0.8)} className="rounded-[4px] p-1.5 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink" aria-label="Zoom out">
          <ZoomOut size={12} strokeWidth={2} />
        </button>
        <div className="mx-1.5 h-[1px] bg-line my-0.5" />
        <button onClick={() => setFitted(false)} className="rounded-[4px] p-1.5 text-faint transition-colors duration-150 hover:bg-ink/[0.06] hover:text-ink" aria-label="Fit to screen">
          <Maximize2 size={11} strokeWidth={2} />
        </button>
      </div>

      <GraphLegend />
      <NodeDetailPanel node={selectedNode} links={links} onClose={() => setSelectedId(null)} onSelectNode={(id) => setSelectedId(id)} />
    </div>
  );
}
