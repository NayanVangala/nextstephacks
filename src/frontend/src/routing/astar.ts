import type { CityPack, Edge, ProfileFlags, RouteResult, ItineraryStep } from "../types";
import { buildAdjacency, nodeIndex, largestComponent } from "./graph";
import { edgeCost } from "./cost";
import { haversineM } from "./geo";
import { MinHeap } from "./heap";

export { buildAdjacency, largestComponent };

/** 就近取節。點擊之地未必正當節上。 */
export function nearestNode(
  pack: CityPack,
  lon: number,
  lat: number,
  restrictTo?: Set<number>,
): number {
  let best = pack.nodes[0].id;
  let bestD = Infinity;
  for (const n of pack.nodes) {
    if (restrictTo && !restrictTo.has(n.id)) continue;
    const d = haversineM(lon, lat, n.lon, n.lat);
    if (d < bestD) {
      bestD = d;
      best = n.id;
    }
  }
  return best;
}

/**
 * 就近取可行之節,限於最大連通分支。
 *
 * Snapping to the routable component is what keeps "no route" honest: any
 * failure that survives this is a real accessibility failure, not a data gap.
 */
export function nearestRoutableNode(
  pack: CityPack,
  flags: ProfileFlags,
  lon: number,
  lat: number,
): number {
  const component = largestComponent(buildAdjacency(pack, flags));
  return nearestNode(pack, lon, lat, component);
}

function other(e: Edge, node: number): number {
  return e.from === node ? e.to : e.from;
}

/** 述一邊之狀,以告不能視者。險處必言,信弱亦必言。 */
function describe(e: Edge): string {
  const parts = [`${Math.round(e.length_m)} m`];
  if (e.is_steps) parts.push("⚠ steps");
  if (e.is_crossing) {
    parts.push(e.crossing_signalized ? "signalized crossing" : "⚠ unsignalized crossing");
  }
  if (e.incline_pct != null && e.incline_pct > 5) {
    parts.push(`⚠ ${e.incline_pct.toFixed(1)}% incline`);
  }
  if (e.confidence !== "high") parts.push(`(${e.confidence} confidence)`);
  return parts.join(" · ");
}

/**
 * A* 尋路。啟發式取直線之距(米),而 edgeCost 恆不小於其長,故啟發式可容。
 *
 * Returns null when no path exists for the profile — that is a real answer,
 * not an error, and the caller must surface it rather than falling back to a
 * route the user cannot physically use.
 */
export function route(
  pack: CityPack,
  flags: ProfileFlags,
  startId: number,
  goalId: number,
  hourIdx: number,
  tempC: number,
  报之罰?: Map<number, number>,
): RouteResult | null {
  const adj = buildAdjacency(pack, flags);
  const coords = nodeIndex(pack);
  const goal = coords.get(goalId);
  if (!goal || !coords.has(startId)) return null;

  const h = (n: number) => {
    const c = coords.get(n)!;
    return haversineM(c.lon, c.lat, goal.lon, goal.lat);
  };

  const g = new Map<number, number>([[startId, 0]]);
  const cameFrom = new Map<number, { node: number; edge: Edge }>();
  const settled = new Set<number>();
  const open = new MinHeap<number>();
  open.push(h(startId), startId);

  while (open.size > 0) {
    const cur = open.pop()!;
    if (settled.has(cur)) continue; // 堆中舊本,棄之
    settled.add(cur);
    if (cur === goalId) break;

    for (const e of adj.get(cur) ?? []) {
      const nxt = other(e, cur);
      if (settled.has(nxt)) continue;
      const tentative = (g.get(cur) ?? Infinity) + edgeCost(e, flags, hourIdx, tempC, 报之罰);
      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        cameFrom.set(nxt, { node: cur, edge: e });
        open.push(tentative + h(nxt), nxt);
      }
    }
  }

  if (!settled.has(goalId)) return null;

  const nodeIds = [goalId];
  const edges: Edge[] = [];
  let cur = goalId;
  while (cameFrom.has(cur)) {
    const step = cameFrom.get(cur)!;
    edges.push(step.edge);
    cur = step.node;
    nodeIds.push(cur);
  }
  nodeIds.reverse();
  edges.reverse();

  const totalLength = edges.reduce((s, e) => s + e.length_m, 0);
  const maxExposure = edges.reduce(
    (m, e) => Math.max(m, e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1),
    0,
  );
  const itinerary: ItineraryStep[] = edges.map((e) => ({ text: describe(e), edge: e }));

  return {
    nodeIds,
    edges,
    totalCost: g.get(goalId) ?? 0,
    totalLength_m: totalLength,
    maxExposure,
    itinerary,
  };
}
