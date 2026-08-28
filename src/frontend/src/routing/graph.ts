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

/**
 * 記所算之圖,憑 (pack, flags)。
 *
 * The graph depends on the pack and the profile and NOTHING else, yet it was
 * being rebuilt from scratch at eight call sites. Measured on the LA pack
 * (16,304 edges): buildAdjacency 10ms, largestComponent 12ms, so every map
 * click paid 23ms and every route paid 28ms re-deriving something identical.
 * Dragging the time slider rebuilt the whole graph on every tick for a value
 * the graph does not depend on.
 *
 * WeakMap on the pack so a city the user switched away from can be collected;
 * an inner Map on the flag key, of which there are only eight.
 */
const 圖之記 = new WeakMap<CityPack, Map<string, Map<number, Edge[]>>>();
const 分支之記 = new WeakMap<CityPack, Map<string, Set<number>>>();

function 身之鑰(f: ProfileFlags): string {
  return `${f.wheelchair ? 1 : 0}${f.blind_low_vision ? 1 : 0}${f.heat_sensitive ? 1 : 0}`;
}

/** 立鄰接之表。邊無向,故兩端皆錄。同 (pack, flags) 者,再呼則取其記。 */
export function buildAdjacency(pack: CityPack, flags: ProfileFlags): Map<number, Edge[]> {
  const 鑰 = 身之鑰(flags);
  let 城之記 = 圖之記.get(pack);
  if (!城之記) {
    城之記 = new Map();
    圖之記.set(pack, 城之記);
  }
  const 舊 = 城之記.get(鑰);
  if (舊) return 舊;

  const adj = 立鄰接(pack, flags);
  城之記.set(鑰, adj);
  return adj;
}

/**
 * 取最大之連通分支,並記之。
 *
 * IMPORTANT: keyed on the pack and flags like the adjacency it derives from.
 * Callers pass an adjacency they may have built themselves, so this cannot key
 * on the adjacency object alone without risking a stale answer for a graph that
 * was rebuilt with different flags.
 */
export function 記之分支(pack: CityPack, flags: ProfileFlags): Set<number> {
  const 鑰 = 身之鑰(flags);
  let 城之記 = 分支之記.get(pack);
  if (!城之記) {
    城之記 = new Map();
    分支之記.set(pack, 城之記);
  }
  const 舊 = 城之記.get(鑰);
  if (舊) return 舊;

  const 分支 = largestComponent(buildAdjacency(pack, flags));
  城之記.set(鑰, 分支);
  return 分支;
}

function 立鄰接(pack: CityPack, flags: ProfileFlags): Map<number, Edge[]> {
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
