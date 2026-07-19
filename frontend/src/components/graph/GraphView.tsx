import { useEffect, useState } from "react";
import type { GraphData } from "@/types";
import { fetchGraph } from "@/lib/api";
import KnowledgeGraph from "./KnowledgeGraph";
import { Loader2 } from "lucide-react";

export default function GraphView() {
  const [data, setData] = useState<GraphData | null>(null);

  useEffect(() => {
    fetchGraph().then(setData);
  }, []);

  const equipmentCount = data?.nodes.filter((n) => n.type === "equipment").length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <div className="font-display text-[19px] font-medium text-ink">Knowledge graph</div>
          <div className="mt-0.5 text-[13px] text-soft">
            Scroll to zoom, drag to pan, click a node to trace its connections.
          </div>
        </div>
        {data && data.nodes.length > 0 && (
          <div className="flex gap-4 text-[12px] text-faint">
            <span>{equipmentCount} assets</span>
            <span>{data.nodes.length} nodes</span>
            <span>{data.edges.length} edges</span>
          </div>
        )}
      </div>

      <div className="flex-1">
        {!data ? (
          <div className="flex h-full items-center justify-center gap-2 text-soft">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-[13px]">Loading graph…</span>
          </div>
        ) : data.nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-soft">
            <div className="font-display text-[16px] text-ink">Graph is empty</div>
            <span className="text-[13px]">Upload documents to build the knowledge graph.</span>
          </div>
        ) : (
          <KnowledgeGraph data={data} />
        )}
      </div>
    </div>
  );
}
