import { describe, it, expect } from "vitest";
import { loadCityPack } from "../src/data/loadCityPack";

const validPack = {
  manifest: {
    id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
    hour_buckets: [12], generated_at: "x",
  },
  nodes: [{ id: 1, lon: 0, lat: 0 }],
  edges: [{
    id: 1, from: 1, to: 2, length_m: 1, geometry: [[0, 0], [1, 1]],
    is_steps: false, is_crossing: false, confidence: "high",
    sun_exposure: [0.5],
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
  }],
};

const fakeFetch = (body: unknown) =>
  async () => ({ ok: true, json: async () => body }) as Response;

describe("loadCityPack", () => {
  it("returns a validated pack", async () => {
    const pack = await loadCityPack("t", fakeFetch(validPack));
    expect(pack.edges[0].traversable.wheelchair).toBe(true);
  });

  it("throws on a schema-invalid pack", async () => {
    const bad = structuredClone(validPack);
    (bad.edges[0] as Record<string, unknown>).confidence = "great";
    await expect(loadCityPack("t", fakeFetch(bad))).rejects.toThrow();
  });
});
