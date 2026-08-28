export type ProfileKey = "wheelchair" | "blind_low_vision" | "heat_sensitive" | "none";

export interface Node {
  id: number;
  lon: number;
  lat: number;
}

export type DestinationKind =
  | "cooling_center"
  | "evacuation_center"
  | "rest_stop"
  | "transit_stop";

export interface Destination {
  id: string;
  name: string;
  lon: number;
  lat: number;
  kind: DestinationKind;
  /** 「unknown」為常。無所published則不得謂之有備。 */
  backup_power: "yes" | "no" | "unknown";
  source: string;
  /** GTFS 之 wheelchair_boarding。闕者為 unknown,不得作可乘。 */
  wheelchair_boarding?: "yes" | "no" | "unknown";
  node_id: number | null;
}

export interface Edge {
  id: number;
  from: number;
  to: number;
  length_m: number;
  geometry: [number, number][];
  is_steps: boolean;
  step_count: number | null;
  kerb: string | null;
  wheelchair_tag: string | null;
  incline_pct: number | null;
  surface: string | null;
  width_m: number | null;
  tactile_paving: boolean | null;
  is_crossing: boolean;
  crossing_signalized: boolean | null;
  sun_exposure: number[] | null;
  near_rest_stop: boolean;
  confidence: "high" | "medium" | "low";
  traversable: Record<ProfileKey, boolean>;
}

export interface Manifest {
  id: string;
  name: string;
  bbox: [number, number, number, number];
  timezone: string;
  hour_buckets: number[];
  generated_at: string;
  buildings_total?: number;
  /** 高無籤而以中位補之者。界面必告之,不可默。 */
  buildings_assumed_height?: number;
  gtfs_static_urls?: string[];
  transit_stops_total?: number;
  transit_stops_accessible?: number;
  /** feed 有 wheelchair_boarding 之欄否。無者,乃published data之闕。 */
  transit_wheelchair_field_present?: boolean;
}

/**
 * 一區之度。率皆可為 null —— null 者未嘗量也,非零。
 *
 * Every rate is nullable and null NEVER means zero. A block group with no
 * sidewalk in it has not been measured; rendering that as 0% would report a
 * perfect failure where there is simply no data.
 */
export interface 區之度 {
  geoid: string;
  節數: number;
  總米: number;
  可通米: number;
  /** 可通之米 / 總米。無路則 null。 */
  通之率: number | null;
  /** 蔭之米 / 可通之米,於 14:00。 */
  蔭之率: number | null;
  /** 與全城最大步階可通之網相連者,佔可通之米幾何。 */
  連之率: number | null;
  入息: number | null;
  /** ACS 之誤界。入息有而此無者,其誤未published。 */
  入息之誤: number | null;
  界: [number, number][];
}

/** 所量之相關,非所斷之言。Measured every build, never asserted. */
export interface 相關之量 {
  區之數: number;
  有入息者: number;
  可信者: number;
  誤比之界: number;
  蔭與入息: number | null;
  蔭與入息_可信: number | null;
  連與入息: number | null;
  連與入息_可信: number | null;
}

export interface CityPack {
  manifest: Manifest;
  nodes: Node[];
  edges: Edge[];
  destinations: Destination[];
  /** null 者,未算也 —— 界面必明告之,不可以空列充之。 */
  index?: 區之度[] | null;
  index_correlation?: 相關之量 | null;
  index_unavailable_reason?: string | null;
}

/** 所擇之身。三者可並,並則硬阻取交,罰值取其最大者。 */
export interface ProfileFlags {
  wheelchair: boolean;
  blind_low_vision: boolean;
  heat_sensitive: boolean;
}

export interface ItineraryStep {
  text: string;
  edge: Edge;
}

export interface RouteResult {
  nodeIds: number[];
  edges: Edge[];
  totalCost: number;
  totalLength_m: number;
  maxExposure: number;
  itinerary: ItineraryStep[];
  /**
   * 已正其向之全線,可徑繪之。
   *
   * Edge geometry is stored from->to, but a path traverses roughly a quarter of
   * its edges to->from. Concatenating the stored order draws a line that jumps
   * to the far end of each reversed segment and back. Built here because route()
   * is the only place that knows the traversal direction.
   */
  polyline: [number, number][];
}
