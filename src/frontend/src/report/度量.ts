import type { CityPack, Destination, ProfileFlags } from "../types";
import { buildAdjacency, edgeAllowed, largestComponent } from "../routing/graph";
import { haversineM } from "../routing/geo";

/** 網之可通率,以米計,不以段數計 —— 段有長短,數之則誣。 */
export function 可通之率(pack: CityPack, flags: ProfileFlags) {
  let 可通米 = 0;
  let 總米 = 0;
  for (const e of pack.edges) {
    總米 += e.length_m;
    if (edgeAllowed(e, flags)) 可通米 += e.length_m;
  }
  return { 可通米, 總米, 率: 總米 === 0 ? 0 : 可通米 / 總米 };
}

/**
 * 可通之網中,蔭者幾何。
 *
 * 分母為可通之米,非全網之米 —— 問者所欲知者,乃「吾所能行之路,有幾蔭」。
 * 曝闕者以全曝論,故不入蔭。
 */
export function 蔭之率(
  pack: CityPack,
  flags: ProfileFlags,
  hourIdx: number,
  門檻 = 0.5,
) {
  let 蔭米 = 0;
  let 可通米 = 0;
  for (const e of pack.edges) {
    if (!edgeAllowed(e, flags)) continue;
    可通米 += e.length_m;
    const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
    if (曝 < 門檻) 蔭米 += e.length_m;
  }
  return { 蔭米, 可通米, 率: 可通米 === 0 ? 0 : 蔭米 / 可通米 };
}

/**
 * 無階可至之所。
 *
 * A destination counts as approachable only if a node in THIS profile's largest
 * connected component lies within the radius. Both halves matter: a node that is
 * near but stranded is not an approach, and a connected node that is 2km away is
 * not an approach either.
 */
export function 無階可至者(
  pack: CityPack,
  flags: ProfileFlags,
  半徑米 = 400,
): Destination[] {
  const 分支 = largestComponent(buildAdjacency(pack, flags));
  const 節 = pack.nodes.filter((n) => 分支.has(n.id));
  const 出: Destination[] = [];

  for (const d of pack.destinations) {
    let 最近 = Infinity;
    for (const n of 節) {
      const 距 = haversineM(d.lon, d.lat, n.lon, n.lat);
      if (距 < 最近) 最近 = 距;
    }
    if (最近 > 半徑米) 出.push(d);
  }
  return 出;
}

/**
 * 斷之率:網雖在,而此身不得至者幾何。
 *
 * The headline "% traversable" figure flatters the city: on real Downtown LA
 * data it reads 98.9% for a wheelchair user, because the blocked segments are
 * short flights of steps. What that number hides is SEVERANCE — sidewalk that
 * exists, is itself passable, and is cut off from the network because the only
 * ways onto it are steps. Measured against the real extract, 488 nodes drop out
 * of the connected network for a wheelchair user while 98.9% still reads
 * "traversable".
 *
 * Proximity is not the barrier in a dense downtown; connectivity is.
 */
export function 斷之率(pack: CityPack, flags: ProfileFlags) {
  const 眾人 = largestComponent(
    buildAdjacency(pack, {
      wheelchair: false, blind_low_vision: false, heat_sensitive: false,
    }),
  );
  const 此身 = largestComponent(buildAdjacency(pack, flags));
  const 斷之節 = Math.max(0, 眾人.size - 此身.size);
  return {
    眾人之節: 眾人.size,
    此身之節: 此身.size,
    斷之節,
    率: 眾人.size === 0 ? 0 : 斷之節 / 眾人.size,
  };
}

/** 信之分佈:各等之段數與米數。未標者多寡,於此可見。 */
export function 信之分佈(pack: CityPack) {
  const 出 = {
    high: { 數: 0, 米: 0 },
    medium: { 數: 0, 米: 0 },
    low: { 數: 0, 米: 0 },
  };
  for (const e of pack.edges) {
    出[e.confidence].數 += 1;
    出[e.confidence].米 += e.length_m;
  }
  return 出;
}
