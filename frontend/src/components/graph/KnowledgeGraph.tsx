import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  const [fitted, setFitted] = useState(false);

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

  // Fit the graph to the viewport once both are known, so it opens readable
  // instead of at 1:1 scale on a canvas that's larger than the screen.
  useEffect(() => {
    if (fitted || viewport.width === 0 || canvasWidth === 0) return;
    const scale = Math.min((viewport.width / canvasWidth) * 0.92, (viewport.height / canvasHeight) * 0.92, 1);
    pz.setTransform({
      scale,
      x: (viewport.width - canvasWidth * scale) / 2,
      y: (viewport.height - canvasHeight * scale) / 2,
    });
    setFitted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport, canvasWidth, canvasHeight, fitted]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div
      ref={containerRef}
      className="grid-surface relative h-full w-full cursor-grab overflow-hidden active:cursor-grabbing"
      onPointerDown={pz.onPointerDown}
      onPointerMove={pz.onPointerMove}
      onPointerUp={pz.onPointerUp}
      onWheel={pz.onWheel}
    >
      {viewport.width > 0 && (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `translate(${pz.transform.x}px, ${pz.transform.y}px) scale(${pz.transform.scale})`,
          }}
        >
          <GraphEdgesSvg links={links} width={canvasWidth} height={canvasHeight} highlightNodeId={selectedId} />
          {nodes.map((n, i) => (
            <GraphNodeChip
              key={n.id}
              node={n}
              index={i}
              selected={n.id === selectedId}
              dimmed={
                Boolean(selectedId) &&
                n.id !== selectedId &&
                !links.some(
                  (l) => (l.source.id === selectedId && l.target.id === n.id) || (l.target.id === selectedId && l.source.id === n.id)
                )
              }
              onSelect={() => setSelectedId(n.id === selectedId ? null : n.id)}
            />
          ))}
        </div>
      )}

      <div className="absolute right-4 top-4 flex flex-col gap-1 rounded-lg border border-line bg-surface/90 p-1 shadow-soft backdrop-blur-sm">
        <button onClick={() => pz.zoomBy(1.25)} className="rounded p-1.5 text-soft hover:bg-surface2 hover:text-ink" aria-label="Zoom in">
          <ZoomIn size={15} />
        </button>
        <button onClick={() => pz.zoomBy(0.8)} className="rounded p-1.5 text-soft hover:bg-surface2 hover:text-ink" aria-label="Zoom out">
          <ZoomOut size={15} />
        </button>
        <button onClick={() => setFitted(false)} className="rounded p-1.5 text-soft hover:bg-surface2 hover:text-ink" aria-label="Fit to screen">
          <Maximize2 size={14} />
        </button>
      </div>

      <GraphLegend />

      <NodeDetailPanel node={selectedNode} links={links} onClose={() => setSelectedId(null)} onSelectNode={(id) => setSelectedId(id)} />
    </div>
  );
}
