import { describe, it, expect } from "vitest";
import { fetchCurrentTempC } from "../src/data/weather";

describe("fetchCurrentTempC", () => {
  it("returns the live apparent temperature when the API answers", async () => {
    const fake = async () => ({
      ok: true,
      json: async () => ({ current: { apparent_temperature: 31.4 } }),
    }) as Response;
    const r = await fetchCurrentTempC(34.05, -118.25, fake);
    expect(r.tempC).toBeCloseTo(31.4, 3);
    expect(r.estimated).toBe(false);
  });

  it("falls back to a seasonal normal and flags it estimated on failure", async () => {
    const fake = async () => {
      throw new Error("network down");
    };
    const r = await fetchCurrentTempC(34.05, -118.25, fake as never);
    expect(r.estimated).toBe(true);
    expect(typeof r.tempC).toBe("number");
  });

  it("flags estimated on a non-ok response rather than trusting the body", async () => {
    const fake = async () => ({ ok: false, status: 503, json: async () => ({}) }) as Response;
    const r = await fetchCurrentTempC(34.05, -118.25, fake);
    expect(r.estimated).toBe(true);
  });

  it("flags estimated when the payload lacks apparent_temperature", async () => {
    const fake = async () => ({ ok: true, json: async () => ({ current: {} }) }) as Response;
    const r = await fetchCurrentTempC(34.05, -118.25, fake);
    expect(r.estimated).toBe(true);
  });
});
