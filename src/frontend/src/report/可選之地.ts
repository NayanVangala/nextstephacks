import type { CityPack, Destination, DestinationKind } from "../types";

/**
 * 可選之地:以名擇起訖,不必點於圖。
 *
 * Map-click was the only way to set an origin or destination, which a blind
 * user cannot do at all — in an app that lists "blind or low vision" as a
 * supported profile. Named places already exist in the pack and are snapped to
 * graph nodes, so selection by name needs no geocoder and no network, which
 * keeps the offline guarantee intact.
 */

const 類之序: DestinationKind[] = [
  "cooling_center",
  "evacuation_center",
  "transit_stop",
  "rest_stop",
];

export const 類之文: Record<DestinationKind, string> = {
  cooling_center: "Cooling centres",
  evacuation_center: "Evacuation centres",
  transit_stop: "Transit stops",
  rest_stop: "Parks and plazas",
};

// OSM 之憩息處多無名,但以其類名之。四百餘「Bench」列之則掩其要,故去之。
const 泛名 = new Set([
  "Bench", "Drinking fountain", "Public toilets", "Fountain",
]);

export interface 一群 {
  類: DestinationKind;
  文: string;
  地: Destination[];
}

export function 可選之地(pack: CityPack): 一群[] {
  const 見 = new Set<string>();
  const 群 = new Map<DestinationKind, Destination[]>();

  for (const d of pack.destinations) {
    // 無節則不可route,列之徒誤人。
    if (d.node_id == null) continue;
    // 憩息之處去其泛名者;納涼、避難之所雖名泛亦存,其要故也。
    if (d.kind === "rest_stop" && 泛名.has(d.name)) continue;

    const 鑰 = `${d.kind}|${d.name}|${d.node_id}`;
    if (見.has(鑰)) continue;
    見.add(鑰);

    const 列 = 群.get(d.kind);
    if (列) 列.push(d);
    else 群.set(d.kind, [d]);
  }

  return 類之序
    .filter((k) => (群.get(k)?.length ?? 0) > 0)
    .map((k) => ({
      類: k,
      文: 類之文[k],
      地: 群.get(k)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}
