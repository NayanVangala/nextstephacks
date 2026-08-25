# Passable Reach + Hazards (Phases 3-4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer "what can I actually get to, and can I get out?" — a reachability view bounded by a heat-exposure budget, over real destinations (cooling centres, evacuation centres, rest stops), under selectable hazard scenarios, with an honest power-dependency flag.

**Architecture:** The pipeline gains a destinations extractor that pulls civic amenities from OSM plus a curated city file, snaps each to a graph node, and marks rest-stop-adjacent edges. The frontend gains a Dijkstra-to-exhaustion search that accumulates *heat load* rather than cost, and a Reach view that renders the reachable sub-network and reports which designated destinations fall inside it. No new services; the artifact and the client-side model carry everything.

**Tech Stack:** Python 3.11 (shapely, numpy, requests, jsonschema, pytest); TypeScript + React + MapLibre (vitest).

**Spec:** `docs/superpowers/specs/2026-08-23-passable-design.md`

**Predecessor:** `docs/superpowers/plans/2026-08-23-passable-mvp.md` (Phases 0-2, complete — 88 tests, merged to main)

## Global Constraints

- **`edgeCost` invariant is inviolable: `cost >= edge.length_m`.** The A\* heuristic is raw haversine metres and is admissible only while every multiplier is `>= 1` and every additive term is `>= 0`. Rest stops therefore reduce *effective sun exposure*, never subtract from cost. Never add a discount term.
- **Heat load is a separate quantity from cost.** Cost ranks paths; heat load bounds them. Reach runs Dijkstra on heat load; Route runs A\* on cost. Do not conflate them.
- **Budgets are heuristics, not clinical thresholds** (spec §12). Conservative defaults, user-adjustable, and the UI must never say "safe" — it reports what was computed and what is unknown.
- **`backup_power` is `"yes" | "no" | "unknown"`, and `unknown` is the expected value.** Never infer it, never let absence render as safety.
- **Destination provenance is required.** Every destination carries a `source` string. Curated entries say so.
- **Profiles compose** exactly as in Phase 2: traversability AND across active profiles, penalty constants take the max.
- **Hazard scenarios are explicitly hypothetical.** A wildfire closure is a labelled what-if, never presented as a live incident.
- **Commit after every task.** Conventional Commits, English messages. Work directly on `main` — this repo uses no branches.

---

## File Structure

```
src/backend/pipeline/
├── extract/destinations.py     # OSM amenities + curated file -> destination records
└── graph/reststops.py          # mark edges adjacent to a rest stop

config/cities/
└── la-destinations.json        # curated cooling/evacuation centres with provenance

src/shared/schema/
└── city-pack.schema.json       # + destinations[], + edge.near_rest_stop

src/frontend/src/
├── routing/reach.ts            # Dijkstra to exhaustion on heat load
├── routing/cost.ts             # + rest-stop exposure relief (MODIFY)
├── data/hazards.ts             # scenario presets
├── components/HazardPicker.tsx
├── components/BudgetSlider.tsx
├── components/DestinationList.tsx
└── views/ReachView.tsx

tests/backend/test_destinations.py, test_reststops.py
tests/frontend/reach.test.ts, hazards.test.ts, reachimpact.test.ts
```

---

## Task 1: Destination extraction and the curated city file

**Files:**
- Create: `src/backend/pipeline/extract/destinations.py`
- Create: `config/cities/la-destinations.json`
- Test: `tests/backend/test_destinations.py`

**Interfaces:**
- Produces:
  - `build_query(bbox) -> str` — Overpass query for `amenity=library|community_centre|shelter|toilets|drinking_water` and `amenity=bench`
  - `parse_destinations(elements, curated) -> list[Destination]` where
    `Destination = {"id": str, "name": str, "lon": float, "lat": float, "kind": str, "backup_power": str, "source": str}`
  - `kind` ∈ `{"cooling_center", "evacuation_center", "rest_stop"}`
  - `snap_to_nodes(destinations, nodes) -> list[Destination]` adds `"node_id": int` (nearest graph node) to each

Los Angeles designates public libraries and recreation centres as cooling centres during heat events, so `amenity=library` and `amenity=community_centre` are the honest OSM proxies. Anything more specific comes from the curated file with a stated source.

- [ ] **Step 1: Write the curated destinations file**

`config/cities/la-destinations.json`:
```json
{
  "city": "la",
  "note": "Curated entries supplement OSM. Every record states its source. backup_power is 'unknown' unless a published dataset says otherwise — absence is never rendered as safety.",
  "destinations": [
    {
      "id": "la-central-library",
      "name": "Los Angeles Central Library",
      "lon": -118.2551,
      "lat": 34.0505,
      "kind": "cooling_center",
      "backup_power": "unknown",
      "source": "curated: LA Public Library, designated cooling centre during heat events"
    },
    {
      "id": "la-pershing-square",
      "name": "Pershing Square",
      "lon": -118.2517,
      "lat": 34.0486,
      "kind": "rest_stop",
      "backup_power": "unknown",
      "source": "curated: public plaza with shade and seating"
    },
    {
      "id": "la-grand-park",
      "name": "Grand Park",
      "lon": -118.2456,
      "lat": 34.0563,
      "kind": "rest_stop",
      "backup_power": "unknown",
      "source": "curated: public park with shade, seating, and drinking fountains"
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

`tests/backend/test_destinations.py`:
```python
import pytest
from pipeline.extract.destinations import (
    build_query, parse_destinations, snap_to_nodes, classify_kind,
)


def _els():
    return [
        {"type": "node", "id": 1, "lon": -118.2551, "lat": 34.0505,
         "tags": {"amenity": "library", "name": "Central Library"}},
        {"type": "node", "id": 2, "lon": -118.2500, "lat": 34.0500,
         "tags": {"amenity": "bench"}},
        {"type": "node", "id": 3, "lon": -118.2490, "lat": 34.0490,
         "tags": {"amenity": "drinking_water"}},
        {"type": "node", "id": 4, "lon": -118.2480, "lat": 34.0480,
         "tags": {"amenity": "shelter", "name": "Evac Point"}},
        {"type": "node", "id": 5, "lon": -118.2470, "lat": 34.0470,
         "tags": {"amenity": "restaurant", "name": "Not A Destination"}},
    ]


def test_query_requests_civic_amenities():
    q = build_query([-118.27, 34.03, -118.23, 34.06])
    for a in ("library", "community_centre", "bench", "drinking_water"):
        assert a in q


def test_library_classified_as_cooling_center():
    assert classify_kind({"amenity": "library"}) == "cooling_center"


def test_bench_classified_as_rest_stop():
    assert classify_kind({"amenity": "bench"}) == "rest_stop"


def test_shelter_classified_as_evacuation_center():
    assert classify_kind({"amenity": "shelter"}) == "evacuation_center"


def test_irrelevant_amenity_classified_as_none():
    assert classify_kind({"amenity": "restaurant"}) is None


def test_parse_skips_irrelevant_amenities():
    got = parse_destinations(_els(), curated=[])
    assert all(d["kind"] is not None for d in got)
    assert not any("Not A Destination" == d["name"] for d in got)


def test_every_destination_has_provenance_and_unknown_power():
    for d in parse_destinations(_els(), curated=[]):
        assert d["source"]
        assert d["backup_power"] == "unknown"


def test_curated_entries_are_included_and_keep_their_source():
    curated = [{
        "id": "x", "name": "Curated Place", "lon": -118.25, "lat": 34.05,
        "kind": "cooling_center", "backup_power": "unknown", "source": "curated: test",
    }]
    got = parse_destinations(_els(), curated=curated)
    match = [d for d in got if d["id"] == "x"]
    assert len(match) == 1 and match[0]["source"] == "curated: test"


def test_unnamed_amenity_gets_a_readable_fallback_name():
    got = parse_destinations(_els(), curated=[])
    bench = [d for d in got if d["kind"] == "rest_stop"][0]
    assert bench["name"]


def test_snap_attaches_the_nearest_graph_node():
    nodes = [{"id": 900, "lon": -118.2551, "lat": 34.0505},
             {"id": 901, "lon": -118.2000, "lat": 34.0000}]
    dests = [{"id": "a", "name": "n", "lon": -118.2551, "lat": 34.0506,
              "kind": "cooling_center", "backup_power": "unknown", "source": "s"}]
    assert snap_to_nodes(dests, nodes)[0]["node_id"] == 900


def test_snap_on_empty_graph_yields_null_node():
    dests = [{"id": "a", "name": "n", "lon": 0.0, "lat": 0.0,
              "kind": "cooling_center", "backup_power": "unknown", "source": "s"}]
    assert snap_to_nodes(dests, [])[0]["node_id"] is None
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python3 -m pytest tests/backend/test_destinations.py -q`
Expected: FAIL — `ModuleNotFoundError: pipeline.extract.destinations`

- [ ] **Step 4: Write the implementation**

`src/backend/pipeline/extract/destinations.py`:
```python
"""取civic之所在:納涼之處、避難之所、憩息之點。

Provenance is mandatory. Backup-power status is 'unknown' unless a published
dataset says otherwise — an unpublished field must never render as safety.
"""

import hashlib
import json
import os

import requests

from pipeline.geo import haversine_m

_USER_AGENT = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"

# 洛城以圖書館、休憩館為納涼之所,故取之。
_COOLING = {"library", "community_centre", "social_facility"}
_EVACUATION = {"shelter"}
_REST = {"bench", "drinking_water", "toilets", "fountain"}

_FALLBACK_NAMES = {
    "bench": "Bench",
    "drinking_water": "Drinking fountain",
    "toilets": "Public toilets",
    "fountain": "Fountain",
    "library": "Library",
    "community_centre": "Community centre",
    "social_facility": "Social facility",
    "shelter": "Shelter",
}


def classify_kind(tags):
    a = tags.get("amenity")
    if a in _COOLING:
        return "cooling_center"
    if a in _EVACUATION:
        return "evacuation_center"
    if a in _REST:
        return "rest_stop"
    return None


def build_query(bbox):
    s, w, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    b = f"({s},{w},{n},{e})"
    amenities = "|".join(sorted(_COOLING | _EVACUATION | _REST))
    return (
        "[out:json][timeout:180];"
        "("
        f'node["amenity"~"^({amenities})$"]{b};'
        f'way["amenity"~"^({amenities})$"]{b};'
        ");"
        "out center;"
    )


def _cache_key(bbox):
    return "dest_" + hashlib.sha1(repr(bbox).encode()).hexdigest()[:16]


def fetch(bbox, url, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{_cache_key(bbox)}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    resp = requests.post(url, data={"data": build_query(bbox)},
                         headers={"User-Agent": _USER_AGENT}, timeout=240)
    resp.raise_for_status()
    data = resp.json()
    with open(path, "w") as f:
        json.dump(data, f)
    return data


def parse_destinations(elements, curated):
    """OSM 之所與curated之所合而為一。curated 者存其 source 不改。"""
    out = list(curated)
    for el in elements:
        tags = el.get("tags") or {}
        kind = classify_kind(tags)
        if kind is None:
            continue
        # way 者用 out center 所給之心點。
        lon = el.get("lon", (el.get("center") or {}).get("lon"))
        lat = el.get("lat", (el.get("center") or {}).get("lat"))
        if lon is None or lat is None:
            continue
        amenity = tags.get("amenity", "")
        out.append({
            "id": f"osm-{el['type']}-{el['id']}",
            "name": tags.get("name") or _FALLBACK_NAMES.get(amenity, amenity or "Unnamed"),
            "lon": lon,
            "lat": lat,
            "kind": kind,
            "backup_power": "unknown",
            "source": f"OpenStreetMap amenity={amenity}",
        })
    return out


def snap_to_nodes(destinations, nodes):
    """各所繫於最近之節。圖空則繫於無。"""
    out = []
    for d in destinations:
        best, best_dist = None, float("inf")
        for n in nodes:
            dist = haversine_m(d["lon"], d["lat"], n["lon"], n["lat"])
            if dist < best_dist:
                best_dist, best = dist, n["id"]
        out.append({**d, "node_id": best})
    return out
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python3 -m pytest tests/backend/test_destinations.py -q`
Expected: PASS (11 tests)

- [ ] **Step 6: Commit**

```bash
git add src/backend/pipeline/extract/destinations.py config/cities/la-destinations.json tests/backend/test_destinations.py
git commit -m "feat: extract cooling, evacuation, and rest-stop destinations with provenance"
```

---

## Task 2: Mark rest-stop-adjacent edges

**Files:**
- Create: `src/backend/pipeline/graph/reststops.py`
- Test: `tests/backend/test_reststops.py`

**Interfaces:**
- Consumes: `raw_edges` (Task 5 of the MVP plan), destinations from Task 1.
- Produces: `mark_rest_stop_edges(raw_edges, destinations, radius_m=20.0) -> list[bool]` — one flag per edge, `True` when a `rest_stop` destination lies within `radius_m` of the edge midpoint.

- [ ] **Step 1: Write the failing test**

`tests/backend/test_reststops.py`:
```python
from pipeline.graph.reststops import mark_rest_stop_edges


def _edge(lon_a, lat_a, lon_b, lat_b):
    return {"geometry": [[lon_a, lat_a], [lon_b, lat_b]]}


def _rest(lon, lat):
    return {"id": "r", "name": "Bench", "lon": lon, "lat": lat,
            "kind": "rest_stop", "backup_power": "unknown", "source": "s"}


def _cooling(lon, lat):
    return {"id": "c", "name": "Library", "lon": lon, "lat": lat,
            "kind": "cooling_center", "backup_power": "unknown", "source": "s"}


def test_edge_with_a_bench_at_its_midpoint_is_marked():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_rest(0.0, 0.0001)]) == [True]


def test_distant_bench_does_not_mark_the_edge():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_rest(0.01, 0.01)]) == [False]


def test_only_rest_stop_kind_counts():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_cooling(0.0, 0.0001)]) == [False]


def test_no_destinations_marks_nothing():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], []) == [False]


def test_radius_is_respected():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    far = _rest(0.0, 0.0007)  # ~55 m from the midpoint
    assert mark_rest_stop_edges([e], [far], radius_m=20.0) == [False]
    assert mark_rest_stop_edges([e], [far], radius_m=80.0) == [True]


def test_flags_align_with_edge_order():
    near = _edge(0.0, 0.0, 0.0, 0.0002)
    far = _edge(0.05, 0.05, 0.05, 0.0502)
    assert mark_rest_stop_edges([near, far], [_rest(0.0, 0.0001)]) == [True, False]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/backend/test_reststops.py -q`
Expected: FAIL — `ModuleNotFoundError: pipeline.graph.reststops`

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/graph/reststops.py`:
```python
"""標憩息之側。

A rest stop does not make a segment cheaper — it makes the sun on that segment
survivable, because you can pause in shade. Phase 4 models it as reduced
effective exposure, never as a cost discount, so the A* heuristic stays
admissible.
"""

from pipeline.geo import haversine_m

_DEFAULT_RADIUS_M = 20.0


def mark_rest_stop_edges(raw_edges, destinations, radius_m=_DEFAULT_RADIUS_M):
    rests = [d for d in destinations if d.get("kind") == "rest_stop"]
    flags = []
    for e in raw_edges:
        (alon, alat), (blon, blat) = e["geometry"][0], e["geometry"][-1]
        mlon, mlat = (alon + blon) / 2, (alat + blat) / 2
        near = any(
            haversine_m(mlon, mlat, r["lon"], r["lat"]) <= radius_m for r in rests
        )
        flags.append(near)
    return flags
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/backend/test_reststops.py -q`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/graph/reststops.py tests/backend/test_reststops.py
git commit -m "feat: mark sidewalk edges adjacent to a rest stop"
```

---

## Task 3: Extend the city pack — destinations and near_rest_stop

**Files:**
- Modify: `src/shared/schema/city-pack.schema.json`
- Modify: `src/backend/pipeline/emit/citypack.py`
- Modify: `src/backend/pipeline/build.py`
- Modify: `src/frontend/src/types.ts`
- Test: `tests/backend/test_emit.py` (extend)

**Interfaces:**
- Produces: `assemble_pack(manifest, nodes, raw_edges, sun_positions, buildings=None, ref_lat=None, destinations=None)` — adds a top-level `destinations` array and `near_rest_stop: bool` on every edge.
- TS: `Destination` interface; `CityPack.destinations: Destination[]`; `Edge.near_rest_stop: boolean`.

- [ ] **Step 1: Extend the JSON Schema**

Add to `properties` (top level):
```json
"destinations": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "name", "lon", "lat", "kind", "backup_power", "source"],
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string" },
      "lon": { "type": "number" },
      "lat": { "type": "number" },
      "kind": {
        "type": "string",
        "enum": ["cooling_center", "evacuation_center", "rest_stop"]
      },
      "backup_power": { "type": "string", "enum": ["yes", "no", "unknown"] },
      "source": { "type": "string" },
      "node_id": { "type": ["integer", "null"] }
    }
  }
}
```

Add to `definitions.edge.properties`:
```json
"near_rest_stop": { "type": "boolean" }
```

- [ ] **Step 2: Write the failing tests**

Append to `tests/backend/test_emit.py`:
```python
def test_destinations_travel_into_the_pack():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    dests = [{"id": "d1", "name": "Library", "lon": 0.0, "lat": 0.0005,
              "kind": "cooling_center", "backup_power": "unknown",
              "source": "curated: test", "node_id": 2}]
    pack = assemble_pack(_manifest(), nodes, raw, suns, destinations=dests)
    assert pack["destinations"][0]["id"] == "d1"
    assert pack["destinations"][0]["backup_power"] == "unknown"


def test_pack_without_destinations_has_an_empty_list_not_a_missing_key():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert pack["destinations"] == []


def test_edges_carry_near_rest_stop_flag():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    bench = [{"id": "b", "name": "Bench", "lon": 0.0, "lat": 0.0005,
              "kind": "rest_stop", "backup_power": "unknown", "source": "s"}]
    pack = assemble_pack(_manifest(), nodes, raw, suns, destinations=bench)
    assert pack["edges"][0]["near_rest_stop"] is True


def test_pack_with_destinations_is_schema_valid():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    dests = [{"id": "d1", "name": "L", "lon": 0.0, "lat": 0.0005,
              "kind": "cooling_center", "backup_power": "unknown",
              "source": "s", "node_id": 2}]
    pack = assemble_pack(_manifest(), nodes, raw, suns, destinations=dests)
    pack["manifest"]["generated_at"] = "2026-08-24T00:00:00Z"
    jsonschema.validate(pack, SCHEMA)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `python3 -m pytest tests/backend/test_emit.py -q`
Expected: FAIL — `assemble_pack() got an unexpected keyword argument 'destinations'`

- [ ] **Step 4: Modify `assemble_pack`**

In `src/backend/pipeline/emit/citypack.py`, add the import:
```python
from pipeline.graph.reststops import mark_rest_stop_edges
```

Change the signature and body:
```python
def assemble_pack(manifest, nodes, raw_edges, sun_positions, buildings=None,
                  ref_lat=None, destinations=None):
    """籤解為屬,屬定可通,幾何定日曝,憩息之側亦標之。"""
    if buildings:
        if ref_lat is None:
            ref_lat = (manifest["bbox"][1] + manifest["bbox"][3]) / 2
        all_exposures = compute_edge_exposures(raw_edges, buildings, sun_positions, ref_lat)
    else:
        all_exposures = None

    destinations = list(destinations or [])
    rest_flags = mark_rest_stop_edges(raw_edges, destinations)

    edges = []
    for i, e in enumerate(raw_edges):
        attrs = parse_attributes(e["tags"])
        exposure = (
            all_exposures[i]
            if all_exposures is not None
            else [round(v, 3) for v in edge_sun_exposure(e["geometry"], [], sun_positions)]
        )
        edges.append({
            "id": e["id"], "from": e["from"], "to": e["to"],
            "length_m": round(e["length_m"], 1),
            "geometry": _quantize_coords(e["geometry"]),
            **attrs,
            "sun_exposure": exposure,
            "near_rest_stop": rest_flags[i],
            "traversable": traversable_flags(attrs),
        })
    quantized_nodes = [{"id": n["id"],
                        "lon": round(n["lon"], _COORD_PRECISION),
                        "lat": round(n["lat"], _COORD_PRECISION)}
                       for n in nodes]
    return {"manifest": dict(manifest), "nodes": quantized_nodes,
            "edges": edges, "destinations": destinations}
```

- [ ] **Step 5: Wire destinations into `build.py`**

In `src/backend/pipeline/build.py`, add the import:
```python
from pipeline.extract import destinations as dest
```

After the buildings block and before `assemble_pack`:
```python
    curated_path = ROOT / f"config/cities/{args.city}-destinations.json"
    curated = []
    if curated_path.exists():
        curated = json.loads(curated_path.read_text())["destinations"]
    dest_osm = dest.fetch(manifest["bbox"], manifest["overpass_url"],
                          str(ROOT / "src/backend/.cache"))
    destinations = dest.parse_destinations(load_elements(dest_osm), curated)
    destinations = dest.snap_to_nodes(destinations, nodes)
    kinds = {}
    for d in destinations:
        kinds[d["kind"]] = kinds.get(d["kind"], 0) + 1
    print(f"destinations: {len(destinations)} {kinds}")
```

Change the `assemble_pack` call to pass them:
```python
    pack = assemble_pack(manifest, nodes, raw, suns, buildings=footprints,
                         ref_lat=lat, destinations=destinations)
```

- [ ] **Step 6: Extend the TypeScript types**

In `src/frontend/src/types.ts`:
```typescript
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
```

Add `near_rest_stop: boolean;` to `Edge`, and `destinations: Destination[];` to `CityPack`.

- [ ] **Step 7: Rebuild the pack and verify**

Run: `./scripts/build-city.sh la`
Expected: prints destination counts by kind; pack validates and writes.

Run: `python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: carry destinations and rest-stop adjacency in the city pack"
```

---

## Task 4: Rest-stop exposure relief in the cost function

**Files:**
- Modify: `src/frontend/src/routing/cost.ts`
- Test: `tests/frontend/cost.test.ts` (extend)

**Interfaces:**
- Produces: `effectiveExposure(edge, hourIdx): number` — the edge's sun exposure after rest-stop relief. `edgeCost` uses it in place of the raw lookup.

Relief is a **multiplicative reduction of exposure**, capped so exposure never goes below zero and the heat multiplier never drops below 1. This is why the invariant holds.

- [ ] **Step 1: Write the failing test**

Append to `tests/frontend/cost.test.ts`:
```typescript
import { effectiveExposure } from "../../src/frontend/src/routing/cost";

describe("rest-stop exposure relief", () => {
  it("reduces effective exposure on a rest-stop edge", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    expect(effectiveExposure(withRest, 4)).toBeLessThan(effectiveExposure(sunny, 4));
  });

  it("never drives exposure below zero", () => {
    const shaded = edge({ sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], near_rest_stop: true });
    expect(effectiveExposure(shaded, 4)).toBeGreaterThanOrEqual(0);
  });

  it("makes a rest-stop edge cheaper in heat without breaking the length floor", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    expect(edgeCost(withRest, hs, 4, 40)).toBeLessThan(edgeCost(sunny, hs, 4, 40));
    expect(edgeCost(withRest, hs, 4, 40)).toBeGreaterThanOrEqual(withRest.length_m);
  });

  it("changes nothing when it is not hot", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const withRest = edge({
      sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1], near_rest_stop: true,
    });
    const hs: ProfileFlags = {
      wheelchair: false, blind_low_vision: false, heat_sensitive: true,
    };
    expect(edgeCost(withRest, hs, 4, 18)).toBeCloseTo(edgeCost(sunny, hs, 4, 18), 6);
  });
});
```

Also add `near_rest_stop: false,` to the `edge()` fixture defaults in that file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run cost`
Expected: FAIL — `effectiveExposure` is not exported.

- [ ] **Step 3: Modify `cost.ts`**

Add the constant beside the others:
```typescript
// 憩息之側,可暫避於蔭,故其曝以四分之一減之。
// Relief REDUCES exposure; it never subtracts from cost, so heatMult stays >= 1
// and the A* haversine heuristic remains admissible.
const REST_STOP_RELIEF = 0.25;
```

Add the exported helper:
```typescript
export function effectiveExposure(edge: Edge, hourIdx: number): number {
  // 曝闕者以全曝論之。不知者不得謂之蔭。
  const raw = edge.sun_exposure ? edge.sun_exposure[hourIdx] ?? 1 : 1;
  const relieved = edge.near_rest_stop ? raw * (1 - REST_STOP_RELIEF) : raw;
  return Math.max(0, Math.min(1, relieved));
}
```

Replace the exposure lookup inside `edgeCost`:
```typescript
  const sun = effectiveExposure(edge, hourIdx);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run cost`
Expected: PASS — including the pre-existing admissibility test, which must still hold.

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/routing/cost.ts tests/frontend/cost.test.ts
git commit -m "feat: model rest stops as reduced sun exposure, preserving the cost floor"
```

---

## Task 5: Reach — Dijkstra to exhaustion on heat load

**Files:**
- Create: `src/frontend/src/routing/reach.ts`
- Test: `tests/frontend/reach.test.ts`

**Interfaces:**
- Consumes: `CityPack`, `ProfileFlags`, `buildAdjacency`, `effectiveExposure`, `heatIndexNorm`, `MinHeap`.
- Produces:
  - `edgeHeatLoad(edge, hourIdx, tempC): number` — `length_m × effectiveExposure × heatIndexNorm`, in "sun-metres"
  - `DEFAULT_BUDGETS: Record<keyof ProfileFlags | "none", number>`
  - `budgetFor(flags): number` — the **minimum** across active profiles (most conservative wins)
  - `reach(pack, flags, startId, hourIdx, tempC, budget): ReachResult` where
    `ReachResult = { reachableNodes: Set<number>, reachableEdges: Edge[], loadByNode: Map<number, number>, budget: number }`

Heat load accumulates along the path; Dijkstra on heat load gives each node its
minimum-heat path, and reachability is `minLoad <= budget`. In mild weather
`heatIndexNorm` is 0, every load is 0, and the whole connected component is
reachable — which is correct, not a bug.

- [ ] **Step 1: Write the failing test**

`tests/frontend/reach.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { reach, edgeHeatLoad, budgetFor, DEFAULT_BUDGETS } from "../../src/frontend/src/routing/reach";
import type { CityPack, ProfileFlags, Edge } from "../../src/frontend/src/types";

const NONE: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const HEAT: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

function e(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [1], confidence: "high", near_rest_stop: false,
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

// chain: 1 -2- 2 -3- 3 -4- 4, each edge 100 m fully exposed
function chain(): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.001, lat: 0.0 },
      { id: 3, lon: 0.002, lat: 0.0 }, { id: 4, lon: 0.003, lat: 0.0 },
    ],
    edges: [e(10, 1, 2), e(11, 2, 3), e(12, 3, 4)],
    destinations: [],
  };
}

describe("edgeHeatLoad", () => {
  it("is zero in mild weather regardless of sun", () => {
    expect(edgeHeatLoad(e(1, 1, 2), 0, 18)).toBe(0);
  });

  it("scales with length, exposure, and heat", () => {
    const full = edgeHeatLoad(e(1, 1, 2), 0, 40);
    const half = edgeHeatLoad(e(1, 1, 2, { sun_exposure: [0.5] }), 0, 40);
    expect(full).toBeGreaterThan(half);
    expect(full).toBeCloseTo(100, 5); // 100 m x 1.0 exposure x 1.0 heat
  });

  it("is reduced on a rest-stop edge", () => {
    expect(edgeHeatLoad(e(1, 1, 2, { near_rest_stop: true }), 0, 40))
      .toBeLessThan(edgeHeatLoad(e(1, 1, 2), 0, 40));
  });
});

describe("budgetFor", () => {
  it("uses the baseline when no profile is active", () => {
    expect(budgetFor(NONE)).toBe(DEFAULT_BUDGETS.none);
  });

  it("takes the most conservative budget across active profiles", () => {
    const both: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: true,
    };
    expect(budgetFor(both)).toBe(
      Math.min(DEFAULT_BUDGETS.wheelchair, DEFAULT_BUDGETS.heat_sensitive),
    );
  });
});

describe("reach", () => {
  it("reaches the whole component in mild weather", () => {
    const r = reach(chain(), NONE, 1, 0, 18, 250);
    expect(r.reachableNodes.size).toBe(4);
  });

  it("stops at the budget in extreme heat", () => {
    // 100 sun-metres per edge at 40C; a 250 budget clears two edges, not three
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    expect(r.reachableNodes.has(2)).toBe(true);
    expect(r.reachableNodes.has(3)).toBe(true);
    expect(r.reachableNodes.has(4)).toBe(false);
  });

  it("reports accumulated load per node", () => {
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    expect(r.loadByNode.get(1)).toBe(0);
    expect(r.loadByNode.get(2)).toBeCloseTo(100, 5);
    expect(r.loadByNode.get(3)).toBeCloseTo(200, 5);
  });

  it("returns only edges whose both ends are reachable", () => {
    const r = reach(chain(), HEAT, 1, 0, 40, 250);
    const ids = r.reachableEdges.map((x) => x.id).sort();
    expect(ids).toEqual([10, 11]);
  });

  it("respects profile traversability", () => {
    const p = chain();
    p.edges[1].traversable.wheelchair = false; // sever 2-3 for wheelchair
    const wc: ProfileFlags = {
      wheelchair: true, blind_low_vision: false, heat_sensitive: false,
    };
    const r = reach(p, wc, 1, 0, 18, 10_000);
    expect(r.reachableNodes.has(2)).toBe(true);
    expect(r.reachableNodes.has(3)).toBe(false);
  });

  it("a shaded detour can reach further than a short sunny path", () => {
    const p = chain();
    // add a long but fully shaded bypass 1 -> 4
    p.nodes.push({ id: 5, lon: 0.0015, lat: 0.002 });
    p.edges.push(
      e(20, 1, 5, { length_m: 200, sun_exposure: [0] }),
      e(21, 5, 4, { length_m: 200, sun_exposure: [0] }),
    );
    const r = reach(p, HEAT, 1, 0, 40, 250);
    expect(r.reachableNodes.has(4)).toBe(true); // via the shaded pair, load 0
  });

  it("an unreachable start node yields an empty result", () => {
    const r = reach(chain(), HEAT, 999, 0, 40, 250);
    expect(r.reachableNodes.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run reach`
Expected: FAIL — cannot find `reach`.

- [ ] **Step 3: Write the implementation**

`src/frontend/src/routing/reach.ts`:
```typescript
import type { CityPack, Edge, ProfileFlags } from "../types";
import { buildAdjacency } from "./graph";
import { effectiveExposure, heatIndexNorm } from "./cost";
import { MinHeap } from "./heap";

/**
 * 暑之負荷,以「曝米」計:長 × 實曝 × 暑度。
 *
 * Distinct from cost: cost ranks paths, heat load bounds them.
 */
export function edgeHeatLoad(edge: Edge, hourIdx: number, tempC: number): number {
  return edge.length_m * effectiveExposure(edge, hourIdx) * heatIndexNorm(tempC);
}

/**
 * 曝米之限。此乃權宜之數,非醫家之準。
 *
 * HEURISTICS, NOT CLINICAL THRESHOLDS (spec §12). Deliberately conservative and
 * user-adjustable. The interface must never present these as a safety guarantee.
 */
export const DEFAULT_BUDGETS = {
  heat_sensitive: 400,
  wheelchair: 600,
  blind_low_vision: 1000,
  none: 1200,
} as const;

/** 諸身之中取其最小者,慎也。 */
export function budgetFor(flags: ProfileFlags): number {
  const active = [DEFAULT_BUDGETS.none];
  if (flags.wheelchair) active.push(DEFAULT_BUDGETS.wheelchair);
  if (flags.blind_low_vision) active.push(DEFAULT_BUDGETS.blind_low_vision);
  if (flags.heat_sensitive) active.push(DEFAULT_BUDGETS.heat_sensitive);
  return Math.min(...active);
}

export interface ReachResult {
  reachableNodes: Set<number>;
  reachableEdges: Edge[];
  loadByNode: Map<number, number>;
  budget: number;
}

/**
 * 自一節而盡其所及,以暑負荷為限。
 *
 * Plain Dijkstra with heat load as the edge weight: every node gets its
 * minimum-heat path, and reachability is minLoad <= budget. In mild weather all
 * loads are zero and the entire component is reachable — correct, not a bug.
 */
export function reach(
  pack: CityPack,
  flags: ProfileFlags,
  startId: number,
  hourIdx: number,
  tempC: number,
  budget: number,
): ReachResult {
  const adj = buildAdjacency(pack, flags);
  const loadByNode = new Map<number, number>();
  const reachableNodes = new Set<number>();

  if (!adj.has(startId)) {
    return { reachableNodes, reachableEdges: [], loadByNode, budget };
  }

  loadByNode.set(startId, 0);
  const open = new MinHeap<number>();
  open.push(0, startId);

  while (open.size > 0) {
    const cur = open.pop()!;
    if (reachableNodes.has(cur)) continue; // 堆中舊本
    reachableNodes.add(cur);

    for (const edge of adj.get(cur) ?? []) {
      const next = edge.from === cur ? edge.to : edge.from;
      if (reachableNodes.has(next)) continue;
      const load = (loadByNode.get(cur) ?? Infinity) + edgeHeatLoad(edge, hourIdx, tempC);
      if (load > budget) continue; // 逾限則不越
      if (load < (loadByNode.get(next) ?? Infinity)) {
        loadByNode.set(next, load);
        open.push(load, next);
      }
    }
  }

  const reachableEdges = pack.edges.filter(
    (e) => reachableNodes.has(e.from) && reachableNodes.has(e.to),
  );
  return { reachableNodes, reachableEdges, loadByNode, budget };
}

/** 所及之內,designated之處幾何。 */
export function reachableDestinations(pack: CityPack, result: ReachResult) {
  return pack.destinations.filter(
    (d) => d.node_id != null && result.reachableNodes.has(d.node_id),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run reach`
Expected: PASS (11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/routing/reach.ts tests/frontend/reach.test.ts
git commit -m "feat: add heat-budget reachability search"
```

---

## Task 6: Hazard scenarios

**Files:**
- Create: `src/frontend/src/data/hazards.ts`
- Test: `tests/frontend/hazards.test.ts`

**Interfaces:**
- Produces: `HAZARDS: Hazard[]` where
  `Hazard = { id, label, description, tempC: number | null, hypothetical: boolean }`
  `tempC: null` means "use the live reading".
- `resolveTemp(hazard, liveTempC): number`

Every non-live scenario is `hypothetical: true` and the UI must label it as a what-if. A scenario is a planning aid, never a claim that something is happening.

- [ ] **Step 1: Write the failing test**

`tests/frontend/hazards.test.ts`:
```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run hazards`
Expected: FAIL — cannot find `hazards`.

- [ ] **Step 3: Write the implementation**

`src/frontend/src/data/hazards.ts`:
```typescript
export interface Hazard {
  id: string;
  label: string;
  description: string;
  /** null 者,用實測之溫。 */
  tempC: number | null;
  /** 擬設之境,必明告之,不可冒為實事。 */
  hypothetical: boolean;
}

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run hazards`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/data/hazards.ts tests/frontend/hazards.test.ts
git commit -m "feat: add hypothetical hazard scenarios for reachability"
```

---

## Task 7: Reach view

**Files:**
- Create: `src/frontend/src/components/HazardPicker.tsx`
- Create: `src/frontend/src/components/BudgetSlider.tsx`
- Create: `src/frontend/src/components/DestinationList.tsx`
- Create: `src/frontend/src/views/ReachView.tsx`
- Modify: `src/frontend/src/components/MapCanvas.tsx` (add an optional `reachEdges` overlay)
- Modify: `src/frontend/src/App.tsx` (tab between Route and Reach)

**Interfaces:**
- Consumes: `reach`, `reachableDestinations`, `budgetFor`, `HAZARDS`, `resolveTemp`, `nearestRoutableNode`, `loadCityPack`, `fetchCurrentTempC`.
- Produces: the Reach view — pick a start, a profile, an hour, a hazard scenario, and a budget; see the reachable sub-network and a destination list split into reachable and unreachable.

The `power_dependent` flag lives here: a fourth checkbox that surfaces
`backup_power` on every destination. Most read `unknown`, and the UI says so
plainly rather than letting absence look like reassurance.

- [ ] **Step 1: Add the reach overlay to `MapCanvas`**

Add to the props type: `reachEdges?: Edge[];`

In the `load` handler, after the `network` layer and before the route layers:
```tsx
      const emptyFc: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: "FeatureCollection", features: [],
      };
      m.addSource("reach", { type: "geojson", data: emptyFc });
      m.addLayer({
        id: "reach",
        type: "line",
        source: "reach",
        paint: { "line-color": "#7c3aed", "line-width": 3, "line-opacity": 0.8 },
      });
```

Add the update effect:
```tsx
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) return;
    const src = m.getSource("reach") as maplibregl.GeoJSONSource | undefined;
    src?.setData({
      type: "FeatureCollection",
      features: (reachEdges ?? []).map((e) => ({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: e.geometry },
      })),
    });
  }, [reachEdges]);
```

- [ ] **Step 2: Write `HazardPicker`**

`src/frontend/src/components/HazardPicker.tsx`:
```tsx
import { HAZARDS, type Hazard } from "../data/hazards";

export function HazardPicker({
  value, onChange,
}: { value: Hazard; onChange: (h: Hazard) => void }) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <label htmlFor="hazard" style={{ fontWeight: 600, display: "block" }}>
        Scenario
      </label>
      <select
        id="hazard"
        value={value.id}
        onChange={(ev) =>
          onChange(HAZARDS.find((h) => h.id === ev.target.value) ?? HAZARDS[0])}
        style={{ width: "100%", padding: "0.4rem", font: "inherit" }}
      >
        {HAZARDS.map((h) => (
          <option key={h.id} value={h.id}>{h.label}</option>
        ))}
      </select>
      <small style={{ color: "var(--muted)" }}>
        {value.description}
        {value.hypothetical ? " This is a what-if, not a live alert." : ""}
      </small>
    </div>
  );
}
```

- [ ] **Step 3: Write `BudgetSlider`**

`src/frontend/src/components/BudgetSlider.tsx`:
```tsx
export function BudgetSlider({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ margin: "1rem 0" }}>
      <label htmlFor="budget" style={{ fontWeight: 600, display: "block" }}>
        Sun-exposure budget:{" "}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value} sun-metres</span>
      </label>
      <input
        id="budget"
        type="range"
        min={100}
        max={3000}
        step={50}
        value={value}
        onChange={(ev) => onChange(Number(ev.target.value))}
        aria-valuetext={`${value} sun-metres`}
        style={{ width: "100%" }}
      />
      <small style={{ color: "var(--muted)" }}>
        One sun-metre is one metre walked in full sun at peak heat. This budget is a
        rough planning heuristic, not a clinical threshold — follow your own medical
        guidance.
      </small>
    </div>
  );
}
```

- [ ] **Step 4: Write `DestinationList`**

`src/frontend/src/components/DestinationList.tsx`:
```tsx
import type { Destination } from "../types";

const KIND_LABEL: Record<string, string> = {
  cooling_center: "Cooling centre",
  evacuation_center: "Evacuation centre",
  rest_stop: "Rest stop",
};

export function DestinationList({
  reachable, unreachable, showPower,
}: {
  reachable: Destination[];
  unreachable: Destination[];
  showPower: boolean;
}) {
  const row = (d: Destination) => (
    <li key={d.id}>
      <strong>{d.name}</strong> — {KIND_LABEL[d.kind] ?? d.kind}
      {showPower && (
        <>
          {" · backup power: "}
          <span style={{ fontWeight: 600 }}>{d.backup_power}</span>
        </>
      )}
      <br />
      <small style={{ color: "var(--muted)" }}>{d.source}</small>
    </li>
  );

  return (
    <div>
      <h3>Reachable ({reachable.length})</h3>
      {reachable.length === 0
        ? <p role="note">No designated destination is reachable within this budget.</p>
        : <ul>{reachable.map(row)}</ul>}
      <h3>Not reachable ({unreachable.length})</h3>
      {unreachable.length > 0 && <ul>{unreachable.slice(0, 20).map(row)}</ul>}
      {showPower && (
        <p role="note">
          Backup-power status is not published for most sites, so most entries read
          “unknown”. Unknown means unknown — not that power is available.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `ReachView`**

`src/frontend/src/views/ReachView.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CityPack, Destination, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { nearestRoutableNode } from "../routing/astar";
import { reach, reachableDestinations, budgetFor, type ReachResult } from "../routing/reach";
import { fetchCurrentTempC } from "../data/weather";
import { HAZARDS, resolveTemp, type Hazard } from "../data/hazards";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { HazardPicker } from "../components/HazardPicker";
import { BudgetSlider } from "../components/BudgetSlider";
import { DestinationList } from "../components/DestinationList";

const AFTERNOON_BUCKET = 4; // 14:00

export function ReachView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>({
    wheelchair: false, blind_low_vision: false, heat_sensitive: false,
  });
  const [powerDependent, setPowerDependent] = useState(false);
  const [hourIdx, setHourIdx] = useState(AFTERNOON_BUCKET);
  const [hazard, setHazard] = useState<Hazard>(HAZARDS[0]);
  const [liveTemp, setLiveTemp] = useState({ tempC: 24, estimated: true });
  const [budget, setBudget] = useState(budgetFor({
    wheelchair: false, blind_low_vision: false, heat_sensitive: false,
  }));
  const [origin, setOrigin] = useState<number | null>(null);
  const [result, setResult] = useState<ReachResult | null>(null);
  const [status, setStatus] = useState("Select a starting point on the map.");

  useEffect(() => { loadCityPack(cityId).then(setPack); }, [cityId]);

  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setLiveTemp);
  }, [pack]);

  // 身既易,則慎者之限隨之。
  useEffect(() => { setBudget(budgetFor(flags)); }, [flags]);

  const tempC = resolveTemp(hazard, liveTemp.tempC);

  const onPick = useCallback((lon: number, lat: number) => {
    if (!pack) return;
    setOrigin(nearestRoutableNode(pack, flags, lon, lat));
  }, [pack, flags]);

  useEffect(() => {
    if (!pack || origin == null) return;
    const r = reach(pack, flags, origin, hourIdx, tempC, budget);
    setResult(r);
    const dests = reachableDestinations(pack, r);
    const cooling = dests.filter((d) => d.kind === "cooling_center").length;
    setStatus(
      cooling > 0
        ? `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
          `${cooling} cooling centre${cooling === 1 ? "" : "s"} within budget.`
        : `${r.reachableNodes.size.toLocaleString()} points reachable. ` +
          `No cooling centre is reachable from here under this scenario.`,
    );
  }, [pack, origin, flags, hourIdx, tempC, budget]);

  const split = useMemo(() => {
    if (!pack || !result) return { reachable: [] as Destination[], unreachable: [] as Destination[] };
    const reachableSet = new Set(reachableDestinations(pack, result).map((d) => d.id));
    const named = pack.destinations.filter((d) => d.kind !== "rest_stop");
    return {
      reachable: named.filter((d) => reachableSet.has(d.id)),
      unreachable: named.filter((d) => !reachableSet.has(d.id)),
    };
  }, [pack, result]);

  const coordOf = (id: number | null) => {
    if (!pack || id == null) return null;
    const n = pack.nodes.find((x) => x.id === id);
    return n ? { lon: n.lon, lat: n.lat } : null;
  };

  if (!pack) return <p style={{ padding: 24 }}>Loading city data…</p>;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>Reach — {pack.manifest.name}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          What can you actually get to, and can you get out?
        </p>
      </header>

      <p role="status" aria-live="polite" style={{
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: 8, padding: "0.75rem 1rem",
      }}>
        {status}
      </p>

      <div className="layout" style={{
        display: "grid", gap: "1rem",
        gridTemplateColumns: "minmax(280px, 1fr) 2fr", alignItems: "start",
      }}>
        <div>
          <ProfilePicker flags={flags} onChange={setFlags} />
          <label style={{ display: "flex", gap: "0.5rem", margin: "0.75rem 0" }}>
            <input
              type="checkbox"
              checked={powerDependent}
              onChange={(ev) => setPowerDependent(ev.target.checked)}
            />
            <span>
              <strong>Power-dependent</strong>
              <br />
              <small style={{ color: "var(--muted)" }}>
                Powered wheelchair, ventilator, refrigerated medication, or home dialysis.
                Shows backup-power status on destinations.
              </small>
            </span>
          </label>
          <HazardPicker value={hazard} onChange={setHazard} />
          <TimeSlider
            buckets={pack.manifest.hour_buckets}
            index={hourIdx}
            onChange={setHourIdx}
          />
          <BudgetSlider value={budget} onChange={setBudget} />
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Routing at {tempC}°C{hazard.hypothetical ? " (hypothetical)" : ""}.
          </p>
        </div>

        <MapCanvas
          pack={pack}
          flags={flags}
          hourIdx={hourIdx}
          route={null}
          reachEdges={result?.reachableEdges}
          origin={coordOf(origin)}
          dest={null}
          onPick={onPick}
        />
      </div>

      {result && (
        <section aria-label="Destinations" style={{ marginTop: "1.5rem" }}>
          <h2>Destinations</h2>
          <DestinationList
            reachable={split.reachable}
            unreachable={split.unreachable}
            showPower={powerDependent}
          />
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 6: Add view switching in `App.tsx`**

```tsx
import { useState } from "react";
import { RouteView } from "./views/RouteView";
import { ReachView } from "./views/ReachView";

export default function App() {
  const [view, setView] = useState<"route" | "reach">("route");
  return (
    <>
      <nav style={{ display: "flex", gap: "0.5rem", padding: "1rem", maxWidth: 960, margin: "0 auto" }}>
        <button type="button" onClick={() => setView("route")}
                aria-current={view === "route" ? "page" : undefined}>
          Route
        </button>
        <button type="button" onClick={() => setView("reach")}
                aria-current={view === "reach" ? "page" : undefined}>
          Reach
        </button>
      </nav>
      {view === "route" ? <RouteView cityId="la" /> : <ReachView cityId="la" />}
    </>
  );
}
```

- [ ] **Step 7: Smoke test in the browser**

Run: `npm run dev --prefix src/frontend`, open the Reach tab.
Expected: picking a start paints a purple reachable sub-network; raising the hazard to "Extreme heat event" visibly shrinks it; the destination list moves entries between reachable and unreachable; ticking "Power-dependent" reveals `backup power: unknown` on most rows.

- [ ] **Step 8: Full gate**

Run:
```bash
python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build
```
Expected: all green.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Reach view with hazard scenarios, budget, and destinations"
```

---

## Task 8: Reach impact check on the real LA graph

**Files:**
- Test: `tests/frontend/reachimpact.test.ts`

**Interfaces:**
- Consumes: the committed `la.json` pack.

This is the Phase-2 pattern that caught the disconnected-component bug: exercise
the real artifact, not fixtures, and print the numbers that go in the video.

- [ ] **Step 1: Write the test**

`tests/frontend/reachimpact.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { nearestRoutableNode } from "../../src/frontend/src/routing/astar";
import { reach, reachableDestinations, budgetFor } from "../../src/frontend/src/routing/reach";
import type { CityPack, ProfileFlags } from "../../src/frontend/src/types";

const pack = JSON.parse(readFileSync(
  new URL("../../src/frontend/public/city-packs/la.json", import.meta.url),
  "utf8")) as CityPack;

const HEAT: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: true,
};

describe("reach on the real LA graph", () => {
  it("shrinks as the scenario worsens", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const start = nearestRoutableNode(pack, HEAT, (minLon + maxLon) / 2, (minLat + maxLat) / 2);
    const budget = budgetFor(HEAT);
    const H = 4; // 14:00

    const mild = reach(pack, HEAT, start, H, 20, budget);
    const advisory = reach(pack, HEAT, start, H, 38, budget);
    const extreme = reach(pack, HEAT, start, H, 44, budget);

    for (const [name, r] of [["mild", mild], ["advisory", advisory], ["extreme", extreme]] as const) {
      const cooling = reachableDestinations(pack, r).filter((d) => d.kind === "cooling_center");
      console.log(`${name.padEnd(9)} nodes=${r.reachableNodes.size.toString().padStart(6)}  cooling centres=${cooling.length}`);
    }

    expect(mild.reachableNodes.size).toBeGreaterThan(advisory.reachableNodes.size);
    expect(advisory.reachableNodes.size).toBeGreaterThan(extreme.reachableNodes.size);
  });

  it("completes fast enough to feel instant", () => {
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const start = nearestRoutableNode(pack, HEAT, (minLon + maxLon) / 2, (minLat + maxLat) / 2);
    const t0 = performance.now();
    reach(pack, HEAT, start, 4, 44, budgetFor(HEAT));
    const ms = performance.now() - t0;
    console.log(`reach on 14.7k nodes: ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});
```

- [ ] **Step 2: Run it and record the numbers**

Run: `cd src/frontend && npx vitest run reachimpact --reporter=verbose`
Expected: PASS, with reachable-node counts falling as heat rises.

If `extreme` is not strictly smaller than `advisory`, the budget or the exposure
model is not biting — investigate before continuing, exactly as with the flat
midday spread in Phase 2. Do not adjust the assertion to match the output.

- [ ] **Step 3: Commit**

```bash
git add tests/frontend/reachimpact.test.ts
git commit -m "test: verify reachability shrinks with hazard severity on real LA data"
```

---

## Phase 4 Checkpoint

After Task 8 the submission answers both halves of the thesis: the everyday
question (Route) and the emergency question (Reach), over one graph and one
conditional-accessibility model. Plans 3 and 4 add the institutional artifact
and the polish.

---

## Self-Review

**Spec coverage (Phases 3-4 scope):**
- §2 Reach view, Dijkstra to exhaustion under an exposure budget → Task 5. ✓
- §7 heat load formula `Σ length × exposure × heat_index` → Task 5 `edgeHeatLoad`. ✓
- §7 reachable edge set rendered directly rather than hulled → Task 7 Step 1 overlay. ✓
- §8 Reach: profile, hazard scenario, start point, plain-language verdict → Task 7. ✓
- §8 evacuation feasibility as set membership → Task 5 `reachableDestinations`. ✓
- §6 rest stops from OSM amenities → Task 1. ✓
- §6 cooling / evacuation centres, city data with OSM fallback → Task 1 curated file plus OSM. ✓
- §10 power dependency, user-declared flag, `unknown` on most destinations, stated plainly → Tasks 1, 3, 7. ✓
- §12 budgets conservative, adjustable, never called safe → Task 5 `DEFAULT_BUDGETS`, Task 7 `BudgetSlider` copy. ✓
- §3 non-goal "no accounts" respected — no persistence added. ✓
- Deferred by design: transit (§9), Report (§8), second city (§11), a11y hardening (§12) → Plans 3-4. ✓

**Placeholder scan:** No "TBD", no "handle appropriately", no "similar to Task N". Every code step carries real code; every test step carries real assertions. ✓

**Type consistency:**
- `Destination` fields match across the Python emitter (Task 1), the JSON Schema (Task 3), and the TS interface (Task 3): `id, name, lon, lat, kind, backup_power, source, node_id`.
- `kind` enum agrees in all three: `cooling_center | evacuation_center | rest_stop`.
- `near_rest_stop` added to the schema (Task 3 Step 1), the emitter (Task 3 Step 4), the TS `Edge` (Task 3 Step 6), and every test fixture that constructs an `Edge` (Tasks 4, 5).
- `effectiveExposure(edge, hourIdx)` — defined Task 4, consumed by `edgeCost` (Task 4) and `edgeHeatLoad` (Task 5), same signature.
- `reach(pack, flags, startId, hourIdx, tempC, budget)` — defined Task 5, called identically in Tasks 7 and 8.
- `budgetFor(flags)` returns a number used as `budget` state in Task 7 and as the argument in Task 8.
- `MapCanvas` gains one optional prop `reachEdges?: Edge[]`; `RouteView` (Phase 2) omits it and keeps compiling. ✓

**Invariant check:** Task 4 reduces exposure rather than subtracting from cost, so `edgeCost >= length_m` survives; the Phase-2 admissibility test is explicitly re-run in Task 4 Step 4. ✓
