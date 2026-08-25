import type { CityPack, Edge, ProfileFlags } from "../types";
import { buildAdjacency } from "./graph";
import { effectiveExposure, heatIndexNorm } from "./cost";
import { MinHeap } from "./heap";

/**
 * 暑之負荷,以「曝米」計:長 × 實曝 × 暑度。
 *
 * Distinct from cost: cost ranks paths, heat load bounds them. Keeping them
 * separate is what lets a longer shaded detour outrank a short sunny path.
 */
export function edgeHeatLoad(edge: Edge, hourIdx: number, tempC: number): number {
  return edge.length_m * effectiveExposure(edge, hourIdx) * heatIndexNorm(tempC);
}

/**
 * 曝米之限。此乃權宜之數,非醫家之準。
 *
 * HEURISTICS, NOT CLINICAL THRESHOLDS (spec §12). Deliberately conservative and
 * user-adjustable. The interface must never present these as a safety guarantee.
 */
export const DEFAULT_BUDGETS = {
  heat_sensitive: 400,
  wheelchair: 600,
  blind_low_vision: 1000,
  none: 1200,
} as const;

/** 諸身之中取其最小者,慎也。 */
export function budgetFor(flags: ProfileFlags): number {
  const active: number[] = [DEFAULT_BUDGETS.none];
  if (flags.wheelchair) active.push(DEFAULT_BUDGETS.wheelchair);
  if (flags.blind_low_vision) active.push(DEFAULT_BUDGETS.blind_low_vision);
  if (flags.heat_sensitive) active.push(DEFAULT_BUDGETS.heat_sensitive);
  return Math.min(...active);
}

export interface ReachResult {
  reachableNodes: Set<number>;
  reachableEdges: Edge[];
  loadByNode: Map<number, number>;
  budget: number;
}

/**
 * 自一節而盡其所及,以暑負荷為限。
 *
 * Plain Dijkstra with heat load as the edge weight: every node gets its
 * minimum-heat path, and reachability is minLoad <= budget. In mild weather all
 * loads are zero and the entire component is reachable — correct, not a bug.
 */
export function reach(
  pack: CityPack,
  flags: ProfileFlags,
  startId: number,
  hourIdx: number,
  tempC: number,
  budget: number,
): ReachResult {
  const adj = buildAdjacency(pack, flags);
  const loadByNode = new Map<number, number>();
  const reachableNodes = new Set<number>();

  if (!adj.has(startId)) {
    return { reachableNodes, reachableEdges: [], loadByNode, budget };
  }

  loadByNode.set(startId, 0);
  const open = new MinHeap<number>();
  open.push(0, startId);

  while (open.size > 0) {
    const cur = open.pop()!;
    if (reachableNodes.has(cur)) continue; // 堆中舊本,棄之
    reachableNodes.add(cur);

    for (const edge of adj.get(cur) ?? []) {
      const next = edge.from === cur ? edge.to : edge.from;
      if (reachableNodes.has(next)) continue;
      const load = (loadByNode.get(cur) ?? Infinity) + edgeHeatLoad(edge, hourIdx, tempC);
      if (load > budget) continue; // 逾限則不越
      if (load < (loadByNode.get(next) ?? Infinity)) {
        loadByNode.set(next, load);
        open.push(load, next);
      }
    }
  }

  const reachableEdges = pack.edges.filter(
    (e) => reachableNodes.has(e.from) && reachableNodes.has(e.to),
  );
  return { reachableNodes, reachableEdges, loadByNode, budget };
}

/** 所及之內,designated之處幾何。 */
export function reachableDestinations(pack: CityPack, result: ReachResult) {
  return pack.destinations.filter(
    (d) => d.node_id != null && result.reachableNodes.has(d.node_id),
  );
}
