export interface Hazard {
  id: string;
  label: string;
  description: string;
  /** null 者,用實測之溫。 */
  tempC: number | null;
  /** 擬設之境,必明告之,不可冒為實事。 */
  hypothetical: boolean;
}

/**
 * A scenario is a planning aid, never a claim that something is happening.
 * Anything with `hypothetical: true` must be labelled as a what-if wherever it
 * is shown.
 */
export const HAZARDS: Hazard[] = [
  {
    id: "live",
    label: "Current conditions",
    description: "Uses the live apparent temperature for this location.",
    tempC: null,
    hypothetical: false,
  },
  {
    id: "heat_advisory",
    label: "Heat advisory",
    description: "A hypothetical 38°C apparent temperature.",
    tempC: 38,
    hypothetical: true,
  },
  {
    id: "extreme_heat",
    label: "Extreme heat event",
    description: "A hypothetical 44°C apparent temperature.",
    tempC: 44,
    hypothetical: true,
  },
];

export function hazardById(id: string): Hazard {
  const found = HAZARDS.find((h) => h.id === id);
  if (!found) throw new Error(`unknown hazard scenario: ${id}`);
  return found;
}

export function resolveTemp(hazard: Hazard, liveTempC: number): number {
  return hazard.tempC ?? liveTempC;
}
