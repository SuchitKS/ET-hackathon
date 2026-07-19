import { useMemo } from "react";
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceX, forceY } from "d3-force";
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

// Real plant data has multiple pieces of equipment, each with its own cluster
// of documents/people — not one hub with everything radiating off it. This
// layout: (1) finds every equipment node and treats each as a cluster seed,
// (2) assigns every other node to its nearest equipment cluster via BFS,
// (3) seeds initial positions in a grid of cluster regions so the simulation
// starts from a sane layout instead of random noise, (4) runs a force
// simulation with a hard collision radius so nodes physically cannot overlap
// — the guarantee a fixed radial layout can't give at this scale.
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

    // Multi-source BFS: every node's cluster = whichever equipment seed
    // reaches it first (fewest hops).
    const clusterOf = new Map<string, number>();
    const distOf = new Map<string, number>();
    const queue: string[] = [];
    seeds.forEach((s, i) => {
      clusterOf.set(s.id, i);
      distOf.set(s.id, 0);
      queue.push(s.id);
    });
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      const d = distOf.get(cur)!;
      for (const nb of adjacency.get(cur) ?? []) {
        if (!clusterOf.has(nb)) {
          clusterOf.set(nb, clusterOf.get(cur)!);
          distOf.set(nb, d + 1);
          queue.push(nb);
        }
      }
    }
    data.nodes.forEach((n) => {
      if (!clusterOf.has(n.id)) clusterOf.set(n.id, 0);
    });

    // Cluster centers laid out on a grid sized to the number of clusters.
    const clusterCount = seeds.length;
    const cols = Math.ceil(Math.sqrt(clusterCount));
    const rows = Math.ceil(clusterCount / cols);
    const cellW = 480;
    const cellH = 420;
    const canvasWidth = Math.max(cols * cellW, 900);
    const canvasHeight = Math.max(rows * cellH, 650);
    const clusterCenters = seeds.map((_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        x: cellW * col + cellW / 2,
        y: cellH * row + cellH / 2,
      };
    });

    const simNodes = data.nodes.map((n) => {
      const c = clusterOf.get(n.id) ?? 0;
      const center = clusterCenters[c];
      const isSeed = n.type === "equipment";
      const angle = Math.random() * Math.PI * 2;
      const radius = isSeed ? 0 : 60 + Math.random() * 120;
      return {
        ...n,
        cluster: c,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      };
    }) as (GraphNode & { x: number; y: number; cluster: number })[];

    const simLinks = data.edges.map((e) => ({ ...e }));

    const simulation = forceSimulation(simNodes as any)
      .force(
        "link",
        forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(105)
          .strength(0.5)
      )
      .force("charge", forceManyBody().strength(-260))
      .force("collide", forceCollide().radius(78).strength(0.95).iterations(3))
      .force(
        "x",
        forceX((d: any) => clusterCenters[d.cluster as number].x).strength(0.05)
      )
      .force(
        "y",
        forceY((d: any) => clusterCenters[d.cluster as number].y).strength(0.05)
      )
      .stop();

    for (let i = 0; i < 400; i++) simulation.tick();

    const nodes: PositionedNode[] = simNodes.map((n) => ({
      ...(n as GraphNode),
      x: n.x,
      y: n.y,
      cluster: n.cluster,
    }));

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
