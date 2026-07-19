import { useMemo } from "react";
import type { GraphData, GraphNode } from "@/types";

export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  cluster: number;
}

export interface PositionedLink {
  id: string;
  relation: string;
  source: PositionedNode;
  target: PositionedNode;
}

export interface LayoutResult {
  nodes: PositionedNode[];
  links: PositionedLink[];
  canvasWidth: number;
  canvasHeight: number;
}

// Deterministic hierarchical radial clustering layout.
// Tighter radii to avoid large empty spaces.
export function useGraphLayout(data: GraphData): LayoutResult {
  return useMemo(() => {
    if (data.nodes.length === 0) {
      return { nodes: [], links: [], canvasWidth: 1000, canvasHeight: 700 };
    }

    const equipmentNodes = data.nodes.filter((n) => n.type === "equipment");
    const seeds = equipmentNodes.length > 0 ? equipmentNodes : [data.nodes[0]];

    const adjacency = new Map<string, string[]>();
    data.nodes.forEach((n) => adjacency.set(n.id, []));
    data.edges.forEach((e) => {
      adjacency.get(e.source)?.push(e.target);
      adjacency.get(e.target)?.push(e.source);
    });

    // Multi-source BFS to assign clusters
    const clusterOf = new Map<string, number>();
    const queue: string[] = [];
    seeds.forEach((s, i) => {
      clusterOf.set(s.id, i);
      queue.push(s.id);
    });
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      for (const nb of adjacency.get(cur) ?? []) {
        if (!clusterOf.has(nb)) {
          clusterOf.set(nb, clusterOf.get(cur)!);
          queue.push(nb);
        }
      }
    }
    data.nodes.forEach((n) => {
      if (!clusterOf.has(n.id)) clusterOf.set(n.id, 0);
    });

    const clusterCount = seeds.length;
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / cols);
    // Tighter cells — no massive empty space
    const cellW = 600;
    const cellH = 600;
    const canvasWidth = Math.max(cols * cellW, 1000);
    const canvasHeight = Math.max(rows * cellH, 700);

    const clusterCenters = seeds.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return { x: cellW * col + cellW / 2, y: cellH * row + cellH / 2 };
    });

    const nodes: PositionedNode[] = [];

    // Group nodes by cluster and type
    const clusters: Record<number, Record<string, GraphNode[]>> = {};
    for (let i = 0; i < clusterCount; i++) {
      clusters[i] = { equipment: [], failure: [], procedure: [], document: [], person: [] };
    }
    data.nodes.forEach((n) => {
      const c = clusterOf.get(n.id) ?? 0;
      if (clusters[c][n.type]) {
        clusters[c][n.type].push(n);
      } else {
        clusters[c].document.push(n);
      }
    });

    // Tighter orbit radii
    const R_FAILURE = 110;
    const R_DOCS = 200;
    const R_PEOPLE = 280;

    for (let c = 0; c < clusterCount; c++) {
      const center = clusterCenters[c];

      // Equipment at center
      const equip = clusters[c].equipment;
      equip.forEach((n, i) => {
        const offset = equip.length > 1 ? (i - (equip.length - 1) / 2) * 50 : 0;
        nodes.push({ ...n, cluster: c, x: center.x + offset, y: center.y });
      });

      // Failures — inner ring with slight jitter
      const fails = clusters[c].failure;
      fails.forEach((n, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(fails.length, 1) - Math.PI / 2;
        const jitter = (i % 2 === 0 ? 1 : -1) * 12;
        nodes.push({ ...n, cluster: c, x: center.x + Math.cos(angle) * (R_FAILURE + jitter), y: center.y + Math.sin(angle) * (R_FAILURE + jitter) });
      });

      // Documents & Procedures — middle ring
      const docs = [...clusters[c].procedure, ...clusters[c].document];
      docs.forEach((n, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(docs.length, 1) + Math.PI / 6;
        const jitter = (i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0) * 15;
        nodes.push({ ...n, cluster: c, x: center.x + Math.cos(angle) * (R_DOCS + jitter), y: center.y + Math.sin(angle) * (R_DOCS + jitter) });
      });

      // People — outer ring
      const peeps = clusters[c].person;
      peeps.forEach((n, i) => {
        const angle = (Math.PI * 2 * i) / Math.max(peeps.length, 1) + Math.PI / 5;
        nodes.push({ ...n, cluster: c, x: center.x + Math.cos(angle) * R_PEOPLE, y: center.y + Math.sin(angle) * R_PEOPLE });
      });
    }

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const links: PositionedLink[] = data.edges
      .map((e) => {
        const source = byId.get(e.source);
        const target = byId.get(e.target);
        if (!source || !target) return null;
        return { id: e.id, relation: e.relation, source, target };
      })
      .filter(Boolean) as PositionedLink[];

    return { nodes, links, canvasWidth, canvasHeight };
  }, [data]);
}
