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

/** 二十五度以下為零,四十度以上為一。 */
export function heatIndexNorm(tempC: number): number {
  return Math.max(0, Math.min(1, (tempC - 25) / 15));
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
): number {
  const sun = effectiveExposure(edge, hourIdx);
  const heat = heatIndexNorm(tempC);
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
