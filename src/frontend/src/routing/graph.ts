import type { CityPack, Edge, ProfileFlags } from "../types";

/**
 * 諸身皆須可通,乃許之。
 *
 * Composition is AND across selected profiles: a wheelchair user who is also
 * heat-sensitive may use only edges both profiles admit.
 */
export function edgeAllowed(edge: Edge, flags: ProfileFlags): boolean {
  if (flags.wheelchair && !edge.traversable.wheelchair) return false;
  if (flags.blind_low_vision && !edge.traversable.blind_low_vision) return false;
  if (flags.heat_sensitive && !edge.traversable.heat_sensitive) return false;
  return true;
}

/** 立鄰接之表。邊無向,故兩端皆錄。 */
export function buildAdjacency(pack: CityPack, flags: ProfileFlags): Map<number, Edge[]> {
  const adj = new Map<number, Edge[]>();
  const add = (n: number, e: Edge) => {
    const list = adj.get(n);
    if (list) list.push(e);
    else adj.set(n, [e]);
  };
  for (const e of pack.edges) {
    if (!edgeAllowed(e, flags)) continue;
    add(e.from, e);
    add(e.to, e);
  }
  return adj;
}

export function nodeIndex(pack: CityPack): Map<number, { lon: number; lat: number }> {
  const m = new Map<number, { lon: number; lat: number }>();
  for (const n of pack.nodes) m.set(n.id, { lon: n.lon, lat: n.lat });
  return m;
}

/**
 * 取最大之連通分支。
 *
 * OSM sidewalk data is not one connected network — the Downtown LA extract has
 * 35 components, and ~2% of nodes sit in stranded fragments. Snapping a tap to
 * such a fragment yields "no route", which would misread as "your body cannot
 * make this trip" when the truth is "this point is not wired to the network".
 *
 * Membership is profile-dependent: filtering out steps and steep grades can
 * strand areas that are reachable on foot, so this must be computed from the
 * SAME adjacency the search will use.
 */
export function largestComponent(adj: Map<number, Edge[]>): Set<number> {
  const seen = new Set<number>();
  let best = new Set<number>();

  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const comp = new Set<number>([start]);
    seen.add(start);
    const stack = [start];
    while (stack.length > 0) {
      const x = stack.pop()!;
      for (const e of adj.get(x) ?? []) {
        const y = e.from === x ? e.to : e.from;
        if (!seen.has(y)) {
          seen.add(y);
          comp.add(y);
          stack.push(y);
        }
      }
    }
    if (comp.size > best.size) best = comp;
  }
  return best;
}
