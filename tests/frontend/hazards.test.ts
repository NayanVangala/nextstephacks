import { describe, it, expect } from "vitest";
import { HAZARDS, resolveTemp, hazardById } from "../../src/frontend/src/data/hazards";

describe("hazard scenarios", () => {
  it("includes a live option that defers to the measured temperature", () => {
    const live = hazardById("live");
    expect(live.tempC).toBeNull();
    expect(live.hypothetical).toBe(false);
    expect(resolveTemp(live, 29.5)).toBeCloseTo(29.5, 5);
  });

  it("overrides the live reading for a scenario", () => {
    const extreme = hazardById("extreme_heat");
    expect(resolveTemp(extreme, 20)).toBe(extreme.tempC);
  });

  it("marks every non-live scenario as hypothetical", () => {
    for (const h of HAZARDS.filter((x) => x.id !== "live")) {
      expect(h.hypothetical).toBe(true);
    }
  });

  it("orders scenarios by increasing severity", () => {
    const temps = HAZARDS.filter((h) => h.tempC !== null).map((h) => h.tempC!);
    expect([...temps].sort((a, b) => a - b)).toEqual(temps);
  });

  it("throws on an unknown id rather than silently defaulting", () => {
    expect(() => hazardById("nope")).toThrow();
  });
});
