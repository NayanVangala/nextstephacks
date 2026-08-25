export type ProfileKey = "wheelchair" | "blind_low_vision" | "heat_sensitive" | "none";

export interface Node {
  id: number;
  lon: number;
  lat: number;
}

export type DestinationKind = "cooling_center" | "evacuation_center" | "rest_stop";

export interface Destination {
  id: string;
  name: string;
  lon: number;
  lat: number;
  kind: DestinationKind;
  /** 「unknown」為常。無所published則不得謂之有備。 */
  backup_power: "yes" | "no" | "unknown";
  source: string;
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
}

export interface CityPack {
  manifest: Manifest;
  nodes: Node[];
  edges: Edge[];
  destinations: Destination[];
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
}
