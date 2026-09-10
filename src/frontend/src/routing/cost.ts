import type { Edge, ProfileFlags } from "../types";

// 可調之常數。形已定,數待校於洛城實路。
const ALPHA = { wheelchair: 1.5, blind_low_vision: 0.8, heat_sensitive: 3.0, none: 0.5 };
const BETA_SLOPE = { wheelchair: 8, blind_low_vision: 1, heat_sensitive: 2, none: 1 };
const GAMMA_CROSSING = { unsignalized: 40, signalized: 8, blindExtra: 30 };
const SURFACE_FACTOR: Record<string, number> = {
  asphalt: 1, concrete: 1, paving_stones: 1.1, sett: 1.3, cobblestone: 1.5,
  gravel: 1.8, ground: 1.8, grass: 2, sand: 2.5,
};

// 憩息之側,可暫避於蔭,故其曝以四分之一減之。
// Relief REDUCES exposure; it never subtracts from cost, so heatMult stays >= 1
// and the A* haversine heuristic remains admissible.
const REST_STOP_RELIEF = 0.25;

/**
 * 二十五度以下為零,四十度以上為一。有官警則以其重為底。
 *
 * 底而非蓋:溫已逾其底者,從其溫。An alert raises the floor on modelled heat
 * severity and never caps it — if the thermometer already says worse, the
 * thermometer wins. The floor only ever RAISES cost, so the A* invariant
 * (edgeCost >= length_m) is untouched.
 */
export function heatIndexNorm(tempC: number, 警之底 = 0): number {
  const 溫 = Math.max(0, Math.min(1, (tempC - 25) / 15));
  return Math.max(溫, Math.max(0, Math.min(1, 警之底)));
}

/** 一邊之實曝。憩息之側減之,然不知者仍以全曝論。 */
export function effectiveExposure(edge: Edge, hourIdx: number): number {
  // 日曝闕者,以全曝論之。不知者不得謂之蔭。
  const raw = edge.sun_exposure ? edge.sun_exposure[hourIdx] ?? 1 : 1;
  const relieved = edge.near_rest_stop ? raw * (1 - REST_STOP_RELIEF) : raw;
  return Math.max(0, Math.min(1, relieved));
}

function maxAlpha(f: ProfileFlags): number {
  const active = [ALPHA.none];
  if (f.wheelchair) active.push(ALPHA.wheelchair);
  if (f.blind_low_vision) active.push(ALPHA.blind_low_vision);
  if (f.heat_sensitive) active.push(ALPHA.heat_sensitive);
  return Math.max(...active);
}

/**
 * 一邊之值:長 × 暑倍 × 面倍 + 坡罰 + 越街之罰。
 *
 * INVARIANT: edgeCost >= edge.length_m, always. The A* heuristic is raw
 * haversine metres, and it is admissible only while every term here is
 * non-negative and every multiplier is >= 1. Anything that subtracts from
 * cost — a rest-stop bonus, for instance — breaks that guarantee and must be
 * modelled as a reduced penalty on other edges instead, never as a discount.
 */
export function edgeCost(
  edge: Edge,
  flags: ProfileFlags,
  hourIdx: number,
  tempC: number,
  报之罰?: Map<number, number>,
  警之底 = 0,
): number {
  const sun = effectiveExposure(edge, hourIdx);
  const heat = heatIndexNorm(tempC, 警之底);
  const heatMult = 1 + maxAlpha(flags) * sun * heat;

  const surfaceFactor = edge.surface ? SURFACE_FACTOR[edge.surface] ?? 1.2 : 1;

  let slope = 0;
  if (edge.incline_pct != null && edge.incline_pct > 3) {
    const beta = Math.max(
      BETA_SLOPE.none,
      flags.wheelchair ? BETA_SLOPE.wheelchair : 0,
      flags.heat_sensitive ? BETA_SLOPE.heat_sensitive : 0,
    );
    slope = beta * (edge.incline_pct - 3) * (edge.length_m / 100);
  }

  let crossing = 0;
  if (edge.is_crossing) {
    crossing = edge.crossing_signalized
      ? GAMMA_CROSSING.signalized
      : GAMMA_CROSSING.unsignalized;
    if (flags.blind_low_vision && !edge.crossing_signalized) {
      crossing += GAMMA_CROSSING.blindExtra;
    }
  }

  // 报事之罚:增之,不减他段 —— cost >= length_m 之不变式赖此。
  // 负值弃之:一段之值若可减,则 haversine 之启发式不复可容,路遂非最优而人不觉。
  const 报罰 = Math.max(0, 报之罰?.get(edge.id) ?? 0);

  return edge.length_m * heatMult * surfaceFactor + slope + crossing + 报罰;
}

/**
 * 此路若遲行,可省幾何日曝。
 *
 * Re-scores THE SAME path at every hour bucket rather than re-routing at each
 * one. That is 8 cheap passes over an existing edge list instead of 8 A*
 * searches (measured: 336ms on the LA pack), and it is also the more honest
 * question: "this same walk, later" is what a person actually asks. Re-routing
 * would answer a different question — "a possibly different walk, later" — and
 * quietly change the route under the advice.
 */
export interface 遲行之利 {
  /** 今之時之曝米。 */
  今之曝米: number;
  /** 最善之時之序,並其曝米。 */
  善之時序: number;
  善之曝米: number;
  /** 所省之比,零至一。 */
  省之比: number;
}

/** 一路於某時之曝米:長 × 實曝,積之。 */
export function 路之曝米(edges: Edge[], hourIdx: number): number {
  let s = 0;
  for (const e of edges) s += e.length_m * effectiveExposure(e, hourIdx);
  return s;
}

export function 算遲行之利(
  edges: Edge[],
  hourIdx: number,
  時數: number,
  日高?: number[],
): 遲行之利 | null {
  if (edges.length === 0 || 時數 <= 1) return null;
  const 今 = 路之曝米(edges, hourIdx);
  let 善序 = hourIdx;
  let 善 = 今;
  for (let h = 0; h < 時數; h++) {
    /*
      夜不可舉。「待日落而行」非蔭之計 —— 且其省必為十成,
      故不去之則每路皆舉此時,而其言遂無用。

      其別當取於日之高,不取於其曝之零。二者前此相混,而其混有實害:
      十八時之日尚二十二度(洛城,所擬之日七月十九),而數路於其時全在影中 ——
      此正暑者所欲聞,而器棄之如夜,反舉十六時之七成有一。
      量之於洛城五十六路:如此者二。

      MUST test the sun's altitude, not the route's exposure. Zero exposure means
      either "the sun is down" or "this route is entirely in shadow", and those
      are opposite findings. Conflating them threw away the best advice the tool
      had on 2 of 56 sampled LA routes: at 18:00 the sun is still 22° up, and a
      fully shaded route then is exactly what a heat-sensitive person is asking
      for. Per-city it differs — Miami's 06:00 bucket is below the horizon,
      Seattle's 20:00 is still 7° above it — which no exposure heuristic could
      have known.

      日高闕者,從其舊法 —— 舊囊無此籤,而其行不當因此而廢。
      Falls back to the old heuristic when the pack predates the field.
    */
    const 夜 = 日高 ? (日高[h] ?? 0) <= 0 : 路之曝米(edges, h) <= 0;
    if (夜) continue;
    const v = 路之曝米(edges, h);
    if (v < 善) {
      善 = v;
      善序 = h;
    }
  }
  if (善序 === hourIdx || 今 <= 0) return null;
  return {
    今之曝米: 今,
    善之時序: 善序,
    善之曝米: 善,
    省之比: (今 - 善) / 今,
  };
}
