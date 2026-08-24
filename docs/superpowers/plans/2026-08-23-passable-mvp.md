# Passable MVP (Phases 0-2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a demoable heat-aware, step-free pedestrian router for one Los Angeles bounding box — the Route view — backed by a committed, precomputed city-pack artifact and a client-side routing engine.

**Architecture:** A Python batch pipeline extracts an OSM sidewalk network, tags each edge with static accessibility attributes and a computed per-hour sun-exposure fraction, and emits a JSON city-pack committed to the repo. A static Vite+React frontend loads the pack and runs A\* client-side, filtering edges by a precomputed per-profile traversability flag and scoring them with a live cost function (distance × heat × surface + slope + crossing − rest). No application server.

**Tech Stack:** Python 3.11 (requests, shapely, numpy, pytest); TypeScript + Vite + React + MapLibre GL JS (vitest); JSON Schema (ajv) as the cross-tier contract.

**Spec:** `docs/superpowers/specs/2026-08-23-passable-design.md`

## Global Constraints

- **Python:** 3.11+. Pipeline is offline/batch — never a server. Overpass responses are cached to disk fixtures; tests never hit the network.
- **Frontend:** TypeScript strict mode. No backend calls except Open-Meteo at runtime for current temperature (with the §13 fallback). Routing runs entirely client-side.
- **City-pack schema is the contract:** Python emits it, TypeScript consumes it, both validate against `src/shared/schema/city-pack.schema.json`. Any field change updates the schema first.
- **Profiles:** exactly four — `wheelchair`, `blind_low_vision`, `heat_sensitive`, `none`. Profiles compose (multi-select). Traversability across selected profiles is AND; cost penalties take the max across active profiles.
- **Traversability is static → precomputed in the pipeline** as per-edge per-profile booleans. **Cost is dynamic → computed client-side** at route time (depends on hour + live temp).
- **Honesty rules (spec §12):** untagged ≠ safe. Missing tags downgrade edge `confidence` and are surfaced in the UI, never silently assumed passable. The app never says "you are safe."
- **hour_buckets** are fixed in the manifest: `[6, 8, 10, 12, 14, 16, 18, 20]` (local time). The time-of-day slider selects a bucket index.
- **Commit after every task.** Conventional Commits (`feat:`, `test:`, `chore:`). English commit messages.

---

## File Structure

```
src/
├── shared/schema/
│   └── city-pack.schema.json          # cross-tier contract for the artifact
├── backend/
│   ├── pyproject.toml
│   └── pipeline/
│       ├── __init__.py
│       ├── geo.py                      # haversine, bearing, point helpers
│       ├── extract/overpass.py         # Overpass fetch + disk cache
│       ├── graph/build.py              # OSM ways → nodes + edges
│       ├── graph/attributes.py         # tag parsing → edge accessibility fields
│       ├── graph/traversability.py     # per-profile hard-exclusion predicate
│       ├── shade/sun.py                # solar position per hour bucket
│       ├── shade/exposure.py           # per-edge sun_exposure fraction (+ proxy fallback)
│       └── emit/citypack.py            # assemble + schema-validate + write JSON
├── frontend/
│   ├── package.json                    # own package root (Vite)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── public/city-packs/              # committed artifacts land here
│   └── src/
│       ├── types.ts                    # CityPack, Edge, Node, Profile*, RouteResult
│       ├── data/loadCityPack.ts        # fetch + ajv-validate a pack
│       ├── routing/geo.ts              # haversine (mirror of backend)
│       ├── routing/cost.ts             # edgeCost, heatIndexNorm
│       ├── routing/graph.ts            # buildAdjacency (traversability filter)
│       ├── routing/astar.ts            # A* + turn-by-turn extraction
│       ├── views/RouteView.tsx         # map + controls + text itinerary
│       ├── components/MapCanvas.tsx    # MapLibre wrapper
│       ├── components/ProfilePicker.tsx
│       ├── components/TimeSlider.tsx
│       └── data/weather.ts             # Open-Meteo live temp + fallback
config/cities/la.json                   # city manifest (bbox, timezone, sources)
scripts/build-city.sh                   # runs the pipeline end-to-end for one city
tests/                                   # mirrors src/ (see each task)
```

---

## Task 1: Scaffold both package roots + CI

**Files:**
- Create: `src/backend/pyproject.toml`, `src/backend/pipeline/__init__.py`
- Create: `src/frontend/package.json`, `src/frontend/tsconfig.json`, `src/frontend/vite.config.ts`, `src/frontend/index.html`, `src/frontend/src/main.tsx`, `src/frontend/src/App.tsx`
- Create: `.github/workflows/ci.yml`
- Create: `.gitignore`

**Interfaces:**
- Produces: runnable `pytest` in `src/backend`, runnable `npm test`/`npm run build` in `src/frontend`.

- [ ] **Step 1: Write backend pyproject.toml**

```toml
[project]
name = "passable-pipeline"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = ["requests>=2.31", "shapely>=2.0", "numpy>=1.26", "jsonschema>=4.21"]

[project.optional-dependencies]
dev = ["pytest>=8.0"]

[tool.pytest.ini_options]
testpaths = ["../../tests/backend"]
pythonpath = ["."]
```

- [ ] **Step 2: Create the pipeline package marker**

`src/backend/pipeline/__init__.py`:
```python
"""Passable precompute pipeline. Batch job, never a server."""
```

- [ ] **Step 3: Scaffold the frontend with Vite**

Run:
```bash
cd src/frontend && npm create vite@latest . -- --template react-ts && npm install && npm install maplibre-gl ajv && npm install -D vitest @types/node
```
Then set `"test": "vitest run"` in `package.json` scripts.

- [ ] **Step 4: Write .gitignore**

```gitignore
node_modules/
dist/
__pycache__/
*.pyc
.venv/
.pytest_cache/
src/backend/.cache/
```

Note: `src/backend/.cache/` holds raw Overpass responses — ignored, since committed extracts live as named fixtures under `tests/`, not the scratch cache.

- [ ] **Step 5: Write CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: ci
on: [push, pull_request]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -e "src/backend[dev]"
      - run: pytest tests/backend -v
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd src/frontend && npm ci && npm test && npm run build
```

- [ ] **Step 6: Verify both toolchains run**

Run: `cd src/frontend && npm run build` → Expected: build succeeds.
Run: `pip install -e "src/backend[dev]" && pytest tests/backend` → Expected: "no tests ran" (exit 5) — toolchain works.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold backend pipeline and frontend package roots with CI"
```

---

## Task 2: City manifest + city-pack JSON Schema

**Files:**
- Create: `config/cities/la.json`
- Create: `src/shared/schema/city-pack.schema.json`
- Test: `tests/backend/test_schema.py`

**Interfaces:**
- Produces: the artifact contract. `CityPack = { manifest, nodes: Node[], edges: Edge[] }`.
  - `Node = { id: int, lon: float, lat: float }`
  - `Edge = { id, from, to, length_m, geometry, is_steps, step_count, kerb, wheelchair_tag, incline_pct, surface, width_m, tactile_paving, is_crossing, crossing_signalized, sun_exposure, confidence, traversable }`
  - `traversable = { wheelchair: bool, blind_low_vision: bool, heat_sensitive: bool, none: bool }`
  - `sun_exposure: number[] | null` (length == manifest.hour_buckets length when present)

- [ ] **Step 1: Write the LA city manifest**

`config/cities/la.json`:
```json
{
  "id": "la",
  "name": "Los Angeles",
  "bbox": [-118.2673, 34.0389, -118.2329, 34.0623],
  "timezone": "America/Los_Angeles",
  "hour_buckets": [6, 8, 10, 12, 14, 16, 18, 20],
  "overpass_url": "https://overpass-api.de/api/interpreter",
  "paratransit": { "operator": "Access Services", "advance_booking_hours": 24 }
}
```

Note: bbox is a verified-coverage Downtown LA rectangle (~2.5km²), small enough to keep the artifact a few MB.

- [ ] **Step 2: Write the JSON Schema**

`src/shared/schema/city-pack.schema.json`:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CityPack",
  "type": "object",
  "required": ["manifest", "nodes", "edges"],
  "properties": {
    "manifest": {
      "type": "object",
      "required": ["id", "name", "bbox", "timezone", "hour_buckets", "generated_at"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "bbox": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 },
        "timezone": { "type": "string" },
        "hour_buckets": { "type": "array", "items": { "type": "integer" } },
        "generated_at": { "type": "string" }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "lon", "lat"],
        "properties": {
          "id": { "type": "integer" },
          "lon": { "type": "number" },
          "lat": { "type": "number" }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": { "$ref": "#/definitions/edge" }
    }
  },
  "definitions": {
    "edge": {
      "type": "object",
      "required": ["id", "from", "to", "length_m", "geometry", "is_steps",
                   "is_crossing", "confidence", "traversable"],
      "properties": {
        "id": { "type": "integer" },
        "from": { "type": "integer" },
        "to": { "type": "integer" },
        "length_m": { "type": "number" },
        "geometry": {
          "type": "array",
          "items": { "type": "array", "items": { "type": "number" }, "minItems": 2, "maxItems": 2 }
        },
        "is_steps": { "type": "boolean" },
        "step_count": { "type": ["integer", "null"] },
        "kerb": { "type": ["string", "null"] },
        "wheelchair_tag": { "type": ["string", "null"] },
        "incline_pct": { "type": ["number", "null"] },
        "surface": { "type": ["string", "null"] },
        "width_m": { "type": ["number", "null"] },
        "tactile_paving": { "type": ["boolean", "null"] },
        "is_crossing": { "type": "boolean" },
        "crossing_signalized": { "type": ["boolean", "null"] },
        "sun_exposure": {
          "type": ["array", "null"],
          "items": { "type": "number", "minimum": 0, "maximum": 1 }
        },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
        "traversable": {
          "type": "object",
          "required": ["wheelchair", "blind_low_vision", "heat_sensitive", "none"],
          "properties": {
            "wheelchair": { "type": "boolean" },
            "blind_low_vision": { "type": "boolean" },
            "heat_sensitive": { "type": "boolean" },
            "none": { "type": "boolean" }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 3: Write the failing test**

`tests/backend/test_schema.py`:
```python
import json
from pathlib import Path
import jsonschema

SCHEMA = Path(__file__).parents[2] / "src/shared/schema/city-pack.schema.json"

def load_schema():
    return json.loads(SCHEMA.read_text())

def test_minimal_valid_pack_passes():
    schema = load_schema()
    pack = {
        "manifest": {"id": "la", "name": "Los Angeles", "bbox": [0, 0, 1, 1],
                     "timezone": "America/Los_Angeles", "hour_buckets": [12],
                     "generated_at": "2026-08-23T00:00:00Z"},
        "nodes": [{"id": 1, "lon": 0.0, "lat": 0.0}, {"id": 2, "lon": 0.001, "lat": 0.0}],
        "edges": [{
            "id": 1, "from": 1, "to": 2, "length_m": 100.0,
            "geometry": [[0.0, 0.0], [0.001, 0.0]],
            "is_steps": False, "is_crossing": False, "confidence": "high",
            "sun_exposure": [0.5],
            "traversable": {"wheelchair": True, "blind_low_vision": True,
                            "heat_sensitive": True, "none": True}
        }]
    }
    jsonschema.validate(pack, schema)  # must not raise

def test_bad_confidence_rejected():
    schema = load_schema()
    pack = {
        "manifest": {"id": "la", "name": "LA", "bbox": [0, 0, 1, 1],
                     "timezone": "UTC", "hour_buckets": [12], "generated_at": "x"},
        "nodes": [], "edges": [{
            "id": 1, "from": 1, "to": 2, "length_m": 1.0, "geometry": [[0, 0], [1, 1]],
            "is_steps": False, "is_crossing": False, "confidence": "great",
            "traversable": {"wheelchair": True, "blind_low_vision": True,
                            "heat_sensitive": True, "none": True}
        }]
    }
    try:
        jsonschema.validate(pack, schema)
        assert False, "expected ValidationError"
    except jsonschema.ValidationError:
        pass
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/backend/test_schema.py -v`
Expected: PASS (schema file already written in Step 2).

- [ ] **Step 5: Commit**

```bash
git add config/cities/la.json src/shared/schema/city-pack.schema.json tests/backend/test_schema.py
git commit -m "feat: add LA city manifest and city-pack JSON schema contract"
```

---

## Task 3: Geo helpers (backend)

**Files:**
- Create: `src/backend/pipeline/geo.py`
- Test: `tests/backend/test_geo.py`

**Interfaces:**
- Produces: `haversine_m(lon1, lat1, lon2, lat2) -> float`; `bearing_deg(lon1, lat1, lon2, lat2) -> float` (0=N, 90=E); `polyline_length_m(coords) -> float`.

- [ ] **Step 1: Write the failing test**

`tests/backend/test_geo.py`:
```python
import math
from pipeline.geo import haversine_m, bearing_deg, polyline_length_m

def test_haversine_known_distance():
    # ~111.19 m per 0.001 deg latitude at the equator
    d = haversine_m(0.0, 0.0, 0.0, 0.001)
    assert math.isclose(d, 111.19, rel_tol=0.01)

def test_bearing_east_is_90():
    assert math.isclose(bearing_deg(0.0, 0.0, 0.001, 0.0), 90.0, abs_tol=0.5)

def test_polyline_length_sums_segments():
    coords = [[0.0, 0.0], [0.0, 0.001], [0.0, 0.002]]
    assert math.isclose(polyline_length_m(coords), 222.38, rel_tol=0.01)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_geo.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.geo`.

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/geo.py`:
```python
import math

_R = 6371000.0  # earth radius, meters

def haversine_m(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * _R * math.asin(math.sqrt(a))

def bearing_deg(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0

def polyline_length_m(coords):
    return sum(
        haversine_m(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
        for i in range(len(coords) - 1)
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/backend/test_geo.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/geo.py tests/backend/test_geo.py
git commit -m "feat: add haversine, bearing, and polyline-length geo helpers"
```

---

## Task 4: Overpass extract with disk cache + committed fixture

**Files:**
- Create: `src/backend/pipeline/extract/__init__.py`, `src/backend/pipeline/extract/overpass.py`
- Create: `tests/backend/fixtures/overpass_downtown_la_small.json` (a trimmed real response, ~15-30 elements — hand-saved once)
- Test: `tests/backend/test_overpass.py`

**Interfaces:**
- Consumes: manifest `bbox`, `overpass_url`.
- Produces: `build_query(bbox) -> str`; `fetch(bbox, url, cache_dir) -> dict` (returns parsed OSM JSON, reading `cache_dir/<hash>.json` when present, else HTTP GET then writes cache); `load_elements(osm_json) -> list[dict]`.

- [ ] **Step 1: Write the failing test (offline via fixture)**

`tests/backend/test_overpass.py`:
```python
import json
from pathlib import Path
from pipeline.extract.overpass import build_query, load_elements, fetch

FIX = Path(__file__).parent / "fixtures/overpass_downtown_la_small.json"

def test_query_contains_bbox_and_footway():
    q = build_query([-118.27, 34.03, -118.23, 34.06])
    assert "footway" in q
    assert "34.03" in q and "-118.27" in q

def test_load_elements_returns_ways_and_nodes():
    osm = json.loads(FIX.read_text())
    els = load_elements(osm)
    assert any(e["type"] == "way" for e in els)
    assert any(e["type"] == "node" for e in els)

def test_fetch_uses_cache_without_network(tmp_path):
    osm = json.loads(FIX.read_text())
    # pre-seed the cache so fetch must not hit the network
    from pipeline.extract.overpass import _cache_key
    key = _cache_key([-118.27, 34.03, -118.23, 34.06])
    (tmp_path / f"{key}.json").write_text(json.dumps(osm))
    got = fetch([-118.27, 34.03, -118.23, 34.06], url="http://invalid.invalid",
                cache_dir=str(tmp_path))
    assert got == osm
```

- [ ] **Step 2: Create the fixture**

Save one real trimmed Overpass response to `tests/backend/fixtures/overpass_downtown_la_small.json`. Generate it once with:
```bash
curl -s -X POST https://overpass-api.de/api/interpreter --data-urlencode 'data=[out:json][timeout:60];(way["highway"~"footway|steps|path"](34.0480,-118.2530,34.0500,-118.2500);>;);out body;' -o tests/backend/fixtures/overpass_downtown_la_small.json
```
Confirm it contains both `way` and `node` elements. This is a committed test fixture, not scratch cache.

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/backend/test_overpass.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.extract.overpass`.

- [ ] **Step 4: Write the implementation**

`src/backend/pipeline/extract/__init__.py`:
```python
```
`src/backend/pipeline/extract/overpass.py`:
```python
import hashlib
import json
import os
import requests

def build_query(bbox):
    # bbox is [minLon, minLat, maxLon, maxLat]; Overpass wants (S,W,N,E).
    s, w, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    b = f"({s},{w},{n},{e})"
    return (
        "[out:json][timeout:120];"
        "("
        f'way["highway"~"footway|steps|path|pedestrian|living_street"]{b};'
        ">;"
        ");"
        "out body;"
    )

def _cache_key(bbox):
    return hashlib.sha1(repr(bbox).encode()).hexdigest()[:16]

def fetch(bbox, url, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{_cache_key(bbox)}.json")
    if os.path.exists(path):
        return json.loads(open(path).read())
    resp = requests.post(url, data={"data": build_query(bbox)}, timeout=180)
    resp.raise_for_status()
    data = resp.json()
    with open(path, "w") as f:
        json.dump(data, f)
    return data

def load_elements(osm_json):
    return osm_json.get("elements", [])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pytest tests/backend/test_overpass.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/backend/pipeline/extract tests/backend/test_overpass.py tests/backend/fixtures/overpass_downtown_la_small.json
git commit -m "feat: add cached Overpass extractor with offline fixture"
```

---

## Task 5: Graph build — OSM ways to nodes + edges

**Files:**
- Create: `src/backend/pipeline/graph/__init__.py`, `src/backend/pipeline/graph/build.py`
- Test: `tests/backend/test_graph_build.py`

**Interfaces:**
- Consumes: `load_elements` output (list of OSM node/way dicts), `pipeline.geo.polyline_length_m`.
- Produces: `build_graph(elements) -> tuple[list[Node], list[RawEdge]]` where
  - `Node = {"id": int, "lon": float, "lat": float}`
  - `RawEdge = {"id": int, "from": int, "to": int, "length_m": float, "geometry": [[lon,lat],...], "tags": dict}` — one edge per consecutive node pair in each way; edge `id` is a stable synthetic int; `tags` is the parent way's tag dict (attribute parsing happens in Task 6).

- [ ] **Step 1: Write the failing test**

`tests/backend/test_graph_build.py`:
```python
from pipeline.graph.build import build_graph

def _els():
    return [
        {"type": "node", "id": 100, "lon": 0.0, "lat": 0.0},
        {"type": "node", "id": 101, "lon": 0.0, "lat": 0.001},
        {"type": "node", "id": 102, "lon": 0.0, "lat": 0.002},
        {"type": "way", "id": 500, "nodes": [100, 101, 102],
         "tags": {"highway": "footway", "footway": "sidewalk"}},
    ]

def test_way_splits_into_consecutive_edges():
    nodes, edges = build_graph(_els())
    assert len(edges) == 2
    assert (edges[0]["from"], edges[0]["to"]) == (100, 101)
    assert (edges[1]["from"], edges[1]["to"]) == (101, 102)

def test_edge_carries_length_and_geometry_and_tags():
    _, edges = build_graph(_els())
    assert edges[0]["length_m"] > 100 and edges[0]["length_m"] < 120
    assert edges[0]["geometry"] == [[0.0, 0.0], [0.0, 0.001]]
    assert edges[0]["tags"]["footway"] == "sidewalk"

def test_only_nodes_referenced_by_ways_are_kept():
    els = _els() + [{"type": "node", "id": 999, "lon": 5.0, "lat": 5.0}]
    nodes, _ = build_graph(els)
    ids = {n["id"] for n in nodes}
    assert 999 not in ids and {100, 101, 102} <= ids
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_graph_build.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.graph.build`.

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/graph/__init__.py`:
```python
```
`src/backend/pipeline/graph/build.py`:
```python
from pipeline.geo import polyline_length_m

def build_graph(elements):
    coords = {e["id"]: (e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    ways = [e for e in elements if e["type"] == "way" and "nodes" in e]

    used = set()
    edges = []
    eid = 0
    for way in ways:
        ns = [n for n in way["nodes"] if n in coords]
        tags = way.get("tags", {})
        for a, b in zip(ns, ns[1:]):
            (alon, alat), (blon, blat) = coords[a], coords[b]
            geom = [[alon, alat], [blon, blat]]
            edges.append({
                "id": eid, "from": a, "to": b,
                "length_m": polyline_length_m(geom),
                "geometry": geom, "tags": tags,
            })
            eid += 1
            used.add(a); used.add(b)

    nodes = [{"id": nid, "lon": coords[nid][0], "lat": coords[nid][1]}
             for nid in sorted(used)]
    return nodes, edges
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/backend/test_graph_build.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/graph/__init__.py src/backend/pipeline/graph/build.py tests/backend/test_graph_build.py
git commit -m "feat: build routable node/edge graph from OSM ways"
```

---

## Task 6: Attribute parsing — tags to accessibility fields + confidence

**Files:**
- Create: `src/backend/pipeline/graph/attributes.py`
- Test: `tests/backend/test_attributes.py`

**Interfaces:**
- Consumes: `RawEdge["tags"]` dict.
- Produces: `parse_attributes(tags) -> dict` returning exactly these keys:
  `is_steps, step_count, kerb, wheelchair_tag, incline_pct, surface, width_m, tactile_paving, is_crossing, crossing_signalized, confidence`.
  `confidence` is `"high"` when steps/wheelchair/kerb signal is explicit, `"medium"` when key accessibility tags are absent, `"low"` when the way type is ambiguous (`path` with no `foot`/`surface`).

- [ ] **Step 1: Write the failing test**

`tests/backend/test_attributes.py`:
```python
from pipeline.graph.attributes import parse_attributes

def test_steps_detected_with_count():
    a = parse_attributes({"highway": "steps", "step_count": "12"})
    assert a["is_steps"] is True and a["step_count"] == 12

def test_incline_percent_parsed():
    assert parse_attributes({"incline": "9%"})["incline_pct"] == 9.0

def test_incline_up_keyword_is_unknown_not_zero():
    assert parse_attributes({"incline": "up"})["incline_pct"] is None

def test_width_meters_parsed():
    assert parse_attributes({"width": "0.8"})["width_m"] == 0.8

def test_crossing_flags():
    a = parse_attributes({"highway": "footway", "footway": "crossing",
                          "crossing": "traffic_signals"})
    assert a["is_crossing"] is True and a["crossing_signalized"] is True

def test_missing_access_tags_lowers_confidence():
    assert parse_attributes({"highway": "footway", "footway": "sidewalk"})["confidence"] == "medium"

def test_explicit_wheelchair_is_high_confidence():
    a = parse_attributes({"highway": "footway", "footway": "sidewalk", "wheelchair": "yes"})
    assert a["confidence"] == "high" and a["wheelchair_tag"] == "yes"

def test_ambiguous_path_is_low_confidence():
    assert parse_attributes({"highway": "path"})["confidence"] == "low"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_attributes.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.graph.attributes`.

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/graph/attributes.py`:
```python
def _num(v):
    if v is None:
        return None
    try:
        return float(str(v).strip().rstrip("%").split()[0])
    except (ValueError, IndexError):
        return None

def parse_attributes(tags):
    highway = tags.get("highway")
    footway = tags.get("footway")

    is_steps = highway == "steps"
    step_count = int(_num(tags.get("step_count"))) if _num(tags.get("step_count")) else None

    kerb = tags.get("kerb")
    wheelchair_tag = tags.get("wheelchair")
    incline_pct = _num(tags.get("incline"))  # "up"/"down" -> None (unknown, not flat)
    surface = tags.get("surface")
    width_m = _num(tags.get("width"))
    tactile = tags.get("tactile_paving")
    tactile_paving = (tactile == "yes") if tactile in ("yes", "no") else None

    is_crossing = footway == "crossing" or highway == "crossing"
    crossing = tags.get("crossing")
    crossing_signalized = None
    if is_crossing:
        crossing_signalized = crossing in ("traffic_signals", "signals", "pelican", "toucan")

    # confidence: explicit access signal -> high; ambiguous way type -> low; else medium
    if wheelchair_tag is not None or kerb is not None or is_steps:
        confidence = "high"
    elif highway == "path" and "foot" not in tags and "surface" not in tags:
        confidence = "low"
    else:
        confidence = "medium"

    return {
        "is_steps": is_steps, "step_count": step_count, "kerb": kerb,
        "wheelchair_tag": wheelchair_tag, "incline_pct": incline_pct,
        "surface": surface, "width_m": width_m, "tactile_paving": tactile_paving,
        "is_crossing": is_crossing, "crossing_signalized": crossing_signalized,
        "confidence": confidence,
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/backend/test_attributes.py -v`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/graph/attributes.py tests/backend/test_attributes.py
git commit -m "feat: parse OSM tags into accessibility fields with confidence"
```

---

## Task 7: Traversability predicate (per-profile hard exclusions)

**Files:**
- Create: `src/backend/pipeline/graph/traversability.py`
- Test: `tests/backend/test_traversability.py`

**Interfaces:**
- Consumes: an attributes dict (Task 6 output).
- Produces: `traversable_flags(attrs) -> dict` returning `{wheelchair: bool, blind_low_vision: bool, heat_sensitive: bool, none: bool}`. Encodes spec §7 exclusion table. `blind_low_vision`, `heat_sensitive`, and `none` are always `True` (no hard exclusions — they are penalty-governed in cost). `wheelchair` excludes steps, `wheelchair_tag == "no"`, raised kerb on a crossing, `incline_pct > 8.33`, off-road surfaces, and tagged width `< 0.9`.

- [ ] **Step 1: Write the failing test (truth table)**

`tests/backend/test_traversability.py`:
```python
from pipeline.graph.attributes import parse_attributes
from pipeline.graph.traversability import traversable_flags

def flags(tags):
    return traversable_flags(parse_attributes(tags))

def test_steps_block_wheelchair_only():
    f = flags({"highway": "steps"})
    assert f["wheelchair"] is False
    assert f["blind_low_vision"] and f["heat_sensitive"] and f["none"]

def test_wheelchair_no_blocks():
    assert flags({"highway": "footway", "wheelchair": "no"})["wheelchair"] is False

def test_steep_incline_blocks_wheelchair():
    assert flags({"highway": "footway", "incline": "10%"})["wheelchair"] is False

def test_gentle_incline_ok():
    assert flags({"highway": "footway", "incline": "4%"})["wheelchair"] is True

def test_narrow_tagged_width_blocks_wheelchair():
    assert flags({"highway": "footway", "width": "0.7"})["wheelchair"] is False

def test_offroad_surface_blocks_wheelchair():
    assert flags({"highway": "footway", "surface": "gravel"})["wheelchair"] is False

def test_untagged_sidewalk_admitted_for_wheelchair():
    # untagged != impassable; admitted (confidence handled separately)
    assert flags({"highway": "footway", "footway": "sidewalk"})["wheelchair"] is True

def test_none_profile_always_true():
    assert flags({"highway": "steps"})["none"] is True
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_traversability.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.graph.traversability`.

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/graph/traversability.py`:
```python
_OFFROAD = {"sand", "gravel", "ground", "grass", "dirt", "earth", "mud"}
_ADA_MAX_INCLINE = 8.33  # percent

def traversable_flags(attrs):
    wc = True
    if attrs["is_steps"]:
        wc = False
    if attrs["wheelchair_tag"] == "no":
        wc = False
    if attrs["kerb"] == "raised" and attrs["is_crossing"]:
        wc = False
    if attrs["incline_pct"] is not None and attrs["incline_pct"] > _ADA_MAX_INCLINE:
        wc = False
    if attrs["surface"] in _OFFROAD:
        wc = False
    if attrs["width_m"] is not None and attrs["width_m"] < 0.9:
        wc = False

    return {"wheelchair": wc, "blind_low_vision": True,
            "heat_sensitive": True, "none": True}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/backend/test_traversability.py -v`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/graph/traversability.py tests/backend/test_traversability.py
git commit -m "feat: add per-profile traversability predicate"
```

---

## Task 8: Solar position + sun-exposure with proxy fallback

**Files:**
- Create: `src/backend/pipeline/shade/__init__.py`, `src/backend/pipeline/shade/sun.py`, `src/backend/pipeline/shade/exposure.py`
- Test: `tests/backend/test_sun.py`, `tests/backend/test_exposure.py`

**Interfaces:**
- Consumes: manifest `bbox` center, `hour_buckets`, edge geometry/bearing, `pipeline.geo.bearing_deg`.
- Produces:
  - `sun_position(lat, lon, day_of_year, hour) -> {"altitude_deg": float, "azimuth_deg": float}` (azimuth 0=N, 90=E).
  - `edge_sun_exposure(edge_geom, buildings, sun_positions) -> list[float]` — the real shadow-polygon path. For the MVP, `buildings` may be empty, in which case it delegates to the proxy.
  - `proxy_exposure(edge_bearing_deg, sun_positions) -> list[float]` — bearing-vs-azimuth heuristic. Exposure is high when the street runs **parallel** to the sun azimuth (sun shines down the canyon, flanking buildings block nothing) and low when perpendicular (flanking buildings cast shadow across the roadway). A high sun is exposed regardless of orientation; below the horizon → 0.

This task ships the **proxy** as the primary path (spec §16 fallback) and leaves `edge_sun_exposure` delegating to it when no building polygons are supplied. Real `pybdshadow` shadows are a Phase-2 stretch tracked in the next plan.

- [ ] **Step 1: Write the failing tests**

`tests/backend/test_sun.py`:
```python
from pipeline.shade.sun import sun_position

def test_night_has_negative_altitude():
    # LA, winter, midnight
    p = sun_position(34.05, -118.25, 350, 0)
    assert p["altitude_deg"] < 0

def test_noon_summer_is_high():
    p = sun_position(34.05, -118.25, 172, 12)  # ~summer solstice noon
    assert p["altitude_deg"] > 45

def test_azimuth_in_range():
    p = sun_position(34.05, -118.25, 172, 9)
    assert 0.0 <= p["azimuth_deg"] < 360.0
```

`tests/backend/test_exposure.py`:
```python
from pipeline.shade.exposure import proxy_exposure

def test_below_horizon_is_zero():
    suns = [{"altitude_deg": -5, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns) == [0.0]

def test_low_sun_parallel_edge_is_high():
    # street E-W (bearing 90), low eastern sun (azimuth 90): sun down the canyon
    suns = [{"altitude_deg": 10, "azimuth_deg": 90}]
    assert proxy_exposure(90.0, suns)[0] > 0.7

def test_low_sun_perpendicular_edge_is_low():
    # street N-S (bearing 0), low eastern sun: flanking buildings shade the road
    suns = [{"altitude_deg": 10, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns)[0] < 0.3

def test_high_sun_is_exposed_regardless_of_orientation():
    suns = [{"altitude_deg": 85, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns)[0] > 0.9

def test_values_bounded_0_1():
    suns = [{"altitude_deg": a, "azimuth_deg": 90} for a in (-10, 5, 30, 60, 89)]
    for v in proxy_exposure(45.0, suns):
        assert 0.0 <= v <= 1.0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/backend/test_sun.py tests/backend/test_exposure.py -v`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

`src/backend/pipeline/shade/__init__.py`:
```python
```
`src/backend/pipeline/shade/sun.py`:
```python
import math

def sun_position(lat, lon, day_of_year, hour):
    """Low-precision solar position (NOAA approximation). hour is local solar hour."""
    lat_r = math.radians(lat)
    decl = math.radians(-23.44) * math.cos(math.radians(360.0 / 365.0 * (day_of_year + 10)))
    hour_angle = math.radians(15.0 * (hour - 12.0))

    alt = math.asin(math.sin(lat_r) * math.sin(decl) +
                    math.cos(lat_r) * math.cos(decl) * math.cos(hour_angle))
    az = math.atan2(
        math.sin(hour_angle),
        math.cos(hour_angle) * math.sin(lat_r) - math.tan(decl) * math.cos(lat_r),
    )
    azimuth = (math.degrees(az) + 180.0) % 360.0  # 0=N, 90=E
    return {"altitude_deg": math.degrees(alt), "azimuth_deg": azimuth}
```
`src/backend/pipeline/shade/exposure.py`:
```python
import math

def proxy_exposure(edge_bearing_deg, sun_positions):
    """Bearing-vs-azimuth heuristic used when building shadows are unavailable.
    Street parallel to the sun azimuth => sun down the canyon => exposed.
    Perpendicular => flanking buildings shade the roadway. High sun => exposed
    regardless of orientation. Below horizon => 0."""
    out = []
    for s in sun_positions:
        alt = s["altitude_deg"]
        if alt <= 0:
            out.append(0.0)
            continue
        align = abs(math.cos(math.radians(s["azimuth_deg"] - edge_bearing_deg)))
        alt_factor = math.sin(math.radians(alt))  # 0 at horizon, 1 at zenith
        out.append(max(0.0, min(1.0, alt_factor + (1.0 - alt_factor) * align)))
    return out

def edge_sun_exposure(edge_geom, buildings, sun_positions):
    """Real shadow-polygon path. buildings empty => delegate to the proxy on edge bearing."""
    from pipeline.geo import bearing_deg
    if not buildings:
        b = bearing_deg(edge_geom[0][0], edge_geom[0][1], edge_geom[-1][0], edge_geom[-1][1])
        return proxy_exposure(b, sun_positions)
    raise NotImplementedError("pybdshadow path lands in the Phase-2 plan")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/backend/test_sun.py tests/backend/test_exposure.py -v`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/shade tests/backend/test_sun.py tests/backend/test_exposure.py
git commit -m "feat: add solar position and proxy sun-exposure model"
```

---

## Task 9: Emit — assemble, validate, write the city pack

**Files:**
- Create: `src/backend/pipeline/emit/__init__.py`, `src/backend/pipeline/emit/citypack.py`
- Create: `src/backend/pipeline/build.py` (the `python -m pipeline.build --city la` entrypoint)
- Create: `scripts/build-city.sh`
- Test: `tests/backend/test_emit.py`

**Interfaces:**
- Consumes: everything above.
- Produces: `assemble_pack(manifest, nodes, raw_edges, sun_positions) -> dict` (a schema-valid CityPack, computing attributes + traversability + sun_exposure per edge); `write_pack(pack, out_path)` (validates against the schema, then writes). `build.py` wires manifest → fetch → build_graph → assemble → write into `src/frontend/public/city-packs/<id>.json`.

- [ ] **Step 1: Write the failing test**

`tests/backend/test_emit.py`:
```python
import json
from pathlib import Path
import jsonschema
from pipeline.emit.citypack import assemble_pack

SCHEMA = json.loads((Path(__file__).parents[2] / "src/shared/schema/city-pack.schema.json").read_text())

def _manifest():
    return {"id": "t", "name": "Test", "bbox": [0, 0, 0.01, 0.01],
            "timezone": "UTC", "hour_buckets": [8, 12, 16]}

def _inputs():
    nodes = [{"id": 1, "lon": 0.0, "lat": 0.0}, {"id": 2, "lon": 0.0, "lat": 0.001}]
    raw = [{"id": 0, "from": 1, "to": 2, "length_m": 111.0,
            "geometry": [[0.0, 0.0], [0.0, 0.001]],
            "tags": {"highway": "steps"}}]
    return nodes, raw

def test_assembled_pack_is_schema_valid():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3  # one per hour bucket
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    pack["manifest"]["generated_at"] = "2026-08-23T00:00:00Z"
    jsonschema.validate(pack, SCHEMA)

def test_steps_edge_marked_untraversable_for_wheelchair():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert pack["edges"][0]["traversable"]["wheelchair"] is False
    assert pack["edges"][0]["is_steps"] is True

def test_sun_exposure_length_matches_hour_buckets():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert len(pack["edges"][0]["sun_exposure"]) == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/backend/test_emit.py -v`
Expected: FAIL — `ModuleNotFoundError: pipeline.emit.citypack`.

- [ ] **Step 3: Write the implementation**

`src/backend/pipeline/emit/__init__.py`:
```python
```
`src/backend/pipeline/emit/citypack.py`:
```python
import json
import jsonschema
from pathlib import Path
from pipeline.graph.attributes import parse_attributes
from pipeline.graph.traversability import traversable_flags
from pipeline.shade.exposure import edge_sun_exposure

_SCHEMA = json.loads(
    (Path(__file__).parents[3] / "src/shared/schema/city-pack.schema.json").read_text()
)

def assemble_pack(manifest, nodes, raw_edges, sun_positions):
    edges = []
    for e in raw_edges:
        attrs = parse_attributes(e["tags"])
        edges.append({
            "id": e["id"], "from": e["from"], "to": e["to"],
            "length_m": e["length_m"], "geometry": e["geometry"],
            **attrs,
            "sun_exposure": edge_sun_exposure(e["geometry"], [], sun_positions),
            "traversable": traversable_flags(attrs),
        })
    return {"manifest": dict(manifest), "nodes": nodes, "edges": edges}

def write_pack(pack, out_path):
    jsonschema.validate(pack, _SCHEMA)  # fail loudly before writing
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(pack, separators=(",", ":")))
```

`src/backend/pipeline/build.py`:
```python
import argparse
import datetime
import json
from pathlib import Path
from pipeline.extract.overpass import fetch, load_elements
from pipeline.graph.build import build_graph
from pipeline.shade.sun import sun_position
from pipeline.emit.citypack import assemble_pack, write_pack

ROOT = Path(__file__).parents[3]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", required=True)
    args = ap.parse_args()

    manifest = json.loads((ROOT / f"config/cities/{args.city}.json").read_text())
    osm = fetch(manifest["bbox"], manifest["overpass_url"],
                str(ROOT / "src/backend/.cache"))
    nodes, raw = build_graph(load_elements(osm))

    lon = (manifest["bbox"][0] + manifest["bbox"][2]) / 2
    lat = (manifest["bbox"][1] + manifest["bbox"][3]) / 2
    doy = 200  # representative summer day for LA heat scenario
    suns = [sun_position(lat, lon, doy, h) for h in manifest["hour_buckets"]]

    pack = assemble_pack(manifest, nodes, raw, suns)
    pack["manifest"]["generated_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    out = ROOT / f"src/frontend/public/city-packs/{args.city}.json"
    write_pack(pack, str(out))
    print(f"wrote {out} — {len(nodes)} nodes, {len(pack['edges'])} edges")

if __name__ == "__main__":
    main()
```

`scripts/build-city.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../src/backend"
python -m pipeline.build --city "${1:-la}"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/backend/test_emit.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Generate the real LA pack and eyeball it**

Run: `chmod +x scripts/build-city.sh && ./scripts/build-city.sh la`
Expected: prints node/edge counts; `src/frontend/public/city-packs/la.json` exists and is a few MB.

- [ ] **Step 6: Commit (pack included — it is the committed artifact)**

```bash
git add src/backend/pipeline/emit src/backend/pipeline/build.py scripts/build-city.sh tests/backend/test_emit.py src/frontend/public/city-packs/la.json
git commit -m "feat: assemble, validate, and emit the LA city pack"
```

---

## Task 10: Frontend types + city-pack loader with ajv validation

**Files:**
- Create: `src/frontend/src/types.ts`, `src/frontend/src/data/loadCityPack.ts`
- Test: `tests/frontend/loadCityPack.test.ts`, `src/frontend/vitest.config.ts`

**Interfaces:**
- Consumes: `public/city-packs/<id>.json`, `src/shared/schema/city-pack.schema.json`.
- Produces: TS types mirroring the schema; `loadCityPack(id: string, fetchFn?): Promise<CityPack>` — fetches, validates with ajv, throws on invalid.

- [ ] **Step 1: Write the failing test**

`tests/frontend/loadCityPack.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { loadCityPack } from "../../src/frontend/src/data/loadCityPack";

const validPack = {
  manifest: { id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
              hour_buckets: [12], generated_at: "x" },
  nodes: [{ id: 1, lon: 0, lat: 0 }],
  edges: [{ id: 1, from: 1, to: 2, length_m: 1, geometry: [[0, 0], [1, 1]],
            is_steps: false, is_crossing: false, confidence: "high",
            sun_exposure: [0.5],
            traversable: { wheelchair: true, blind_low_vision: true,
                           heat_sensitive: true, none: true } }],
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
    (bad.edges[0] as any).confidence = "great";
    await expect(loadCityPack("t", fakeFetch(bad))).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Write vitest config**

`src/frontend/vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["../../tests/frontend/**/*.test.ts"] } });
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run`
Expected: FAIL — cannot find `loadCityPack`.

- [ ] **Step 4: Write the implementation**

`src/frontend/src/types.ts`:
```typescript
export type ProfileKey = "wheelchair" | "blind_low_vision" | "heat_sensitive" | "none";

export interface Node { id: number; lon: number; lat: number; }

export interface Edge {
  id: number; from: number; to: number; length_m: number;
  geometry: [number, number][];
  is_steps: boolean; step_count: number | null;
  kerb: string | null; wheelchair_tag: string | null;
  incline_pct: number | null; surface: string | null; width_m: number | null;
  tactile_paving: boolean | null;
  is_crossing: boolean; crossing_signalized: boolean | null;
  sun_exposure: number[] | null;
  confidence: "high" | "medium" | "low";
  traversable: Record<Exclude<ProfileKey, never>, boolean>;
}

export interface Manifest {
  id: string; name: string; bbox: [number, number, number, number];
  timezone: string; hour_buckets: number[]; generated_at: string;
}

export interface CityPack { manifest: Manifest; nodes: Node[]; edges: Edge[]; }

export interface ProfileFlags {
  wheelchair: boolean; blind_low_vision: boolean; heat_sensitive: boolean;
}

export interface RouteResult {
  nodeIds: number[];
  edges: Edge[];
  totalCost: number;
  totalLength_m: number;
  maxExposure: number;
  itinerary: { text: string; edge: Edge }[];
}
```

`src/frontend/src/data/loadCityPack.ts`:
```typescript
import Ajv from "ajv";
import schema from "../../../shared/schema/city-pack.schema.json";
import type { CityPack } from "../types";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

type FetchFn = (url: string) => Promise<Response>;

export async function loadCityPack(
  id: string,
  fetchFn: FetchFn = (u) => fetch(u),
): Promise<CityPack> {
  const res = await fetchFn(`/city-packs/${id}.json`);
  const data = await res.json();
  if (!validate(data)) {
    throw new Error(`invalid city pack: ${ajv.errorsText(validate.errors)}`);
  }
  return data as CityPack;
}
```

Add to `src/frontend/tsconfig.json` compilerOptions: `"resolveJsonModule": true`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/types.ts src/frontend/src/data/loadCityPack.ts src/frontend/vitest.config.ts tests/frontend/loadCityPack.test.ts src/frontend/tsconfig.json
git commit -m "feat: add frontend city-pack types and ajv-validated loader"
```

---

## Task 11: Cost function + heat index (client-side, pure)

**Files:**
- Create: `src/frontend/src/routing/geo.ts`, `src/frontend/src/routing/cost.ts`
- Test: `tests/frontend/cost.test.ts`

**Interfaces:**
- Consumes: `Edge`, `ProfileFlags`.
- Produces:
  - `heatIndexNorm(tempC: number): number` → `clamp((tempC-25)/15, 0, 1)`.
  - `edgeCost(edge, flags, hourIdx, tempC): number` implementing spec §7:
    `length × (1 + α·sun·heat) × surfaceFactor + slopePenalty + crossingPenalty − restBonus`, α/β/γ taken as the **max** across active profiles. Constants are the tunable table (spec §16) — start values below, tuned later against real routes.

- [ ] **Step 1: Write the failing test**

`tests/frontend/cost.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { heatIndexNorm, edgeCost } from "../../src/frontend/src/routing/cost";
import type { Edge, ProfileFlags } from "../../src/frontend/src/types";

const NONE: ProfileFlags = { wheelchair: false, blind_low_vision: false, heat_sensitive: false };

function edge(over: Partial<Edge> = {}): Edge {
  return {
    id: 1, from: 1, to: 2, length_m: 100, geometry: [[0, 0], [0, 1]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0, 0, 0, 0, 0, 0, 0, 0], confidence: "high",
    traversable: { wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true },
    ...over,
  };
}

describe("heatIndexNorm", () => {
  it("clamps below 25C to 0 and above 40C to 1", () => {
    expect(heatIndexNorm(20)).toBe(0);
    expect(heatIndexNorm(40)).toBe(1);
    expect(heatIndexNorm(32.5)).toBeCloseTo(0.5, 3);
  });
});

describe("edgeCost", () => {
  it("equals length when cool and shaded and no profile", () => {
    expect(edgeCost(edge(), NONE, 4, 20)).toBeCloseTo(100, 5);
  });

  it("heat-sensitive pays more for a sunny edge in heat than baseline", () => {
    const sunny = edge({ sun_exposure: [1, 1, 1, 1, 1, 1, 1, 1] });
    const hs: ProfileFlags = { wheelchair: false, blind_low_vision: false, heat_sensitive: true };
    expect(edgeCost(sunny, hs, 4, 38)).toBeGreaterThan(edgeCost(sunny, NONE, 4, 38));
  });

  it("adds a slope penalty above 3% for wheelchair", () => {
    const hill = edge({ incline_pct: 6 });
    const wc: ProfileFlags = { wheelchair: true, blind_low_vision: false, heat_sensitive: false };
    expect(edgeCost(hill, wc, 4, 20)).toBeGreaterThan(edgeCost(edge(), wc, 4, 20));
  });

  it("penalizes an unsignalized crossing for a blind pedestrian", () => {
    const x = edge({ is_crossing: true, crossing_signalized: false });
    const bl: ProfileFlags = { wheelchair: false, blind_low_vision: true, heat_sensitive: false };
    expect(edgeCost(x, bl, 4, 20)).toBeGreaterThan(edgeCost(edge(), bl, 4, 20));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run cost`
Expected: FAIL — cannot find `cost`.

- [ ] **Step 3: Write the implementations**

`src/frontend/src/routing/geo.ts`:
```typescript
const R = 6371000;
export function haversineM(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180, dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dphi / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
```

`src/frontend/src/routing/cost.ts`:
```typescript
import type { Edge, ProfileFlags } from "../types";

// Tunable constants (spec §16). Start values; tune against real LA routes.
const ALPHA = { wheelchair: 1.5, blind_low_vision: 0.8, heat_sensitive: 3.0, none: 0.5 };
const BETA_SLOPE = { wheelchair: 8, blind_low_vision: 1, heat_sensitive: 2, none: 1 };
const GAMMA_CROSSING = { unsignalized: 40, signalized: 8, blindExtra: 30 };
const REST_BONUS = 15;
const SURFACE_FACTOR: Record<string, number> = {
  asphalt: 1, concrete: 1, paving_stones: 1.1, sett: 1.3, cobblestone: 1.5,
  gravel: 1.8, ground: 1.8, grass: 2, sand: 2.5,
};

export function heatIndexNorm(tempC: number): number {
  return Math.max(0, Math.min(1, (tempC - 25) / 15));
}

function maxAlpha(f: ProfileFlags): number {
  const active = [ALPHA.none];
  if (f.wheelchair) active.push(ALPHA.wheelchair);
  if (f.blind_low_vision) active.push(ALPHA.blind_low_vision);
  if (f.heat_sensitive) active.push(ALPHA.heat_sensitive);
  return Math.max(...active);
}

export function edgeCost(edge: Edge, flags: ProfileFlags, hourIdx: number, tempC: number): number {
  const sun = edge.sun_exposure ? edge.sun_exposure[hourIdx] ?? 0 : 0;
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
    crossing = edge.crossing_signalized ? GAMMA_CROSSING.signalized : GAMMA_CROSSING.unsignalized;
    if (flags.blind_low_vision && !edge.crossing_signalized) crossing += GAMMA_CROSSING.blindExtra;
  }

  return edge.length_m * heatMult * surfaceFactor + slope + crossing - 0 * REST_BONUS;
}
```

Note: `REST_BONUS` is wired but multiplied by 0 here — rest-stop proximity lands in Task 4 of the next plan (destinations). Kept in the signature so the constant table is complete and the later change is additive.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run cost`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/routing/geo.ts src/frontend/src/routing/cost.ts tests/frontend/cost.test.ts
git commit -m "feat: add client-side heat-aware edge cost function"
```

---

## Task 12: A\* routing + adjacency (client-side, pure)

**Files:**
- Create: `src/frontend/src/routing/graph.ts`, `src/frontend/src/routing/astar.ts`
- Test: `tests/frontend/astar.test.ts`

**Interfaces:**
- Consumes: `CityPack`, `ProfileFlags`, `edgeCost`, `haversineM`.
- Produces:
  - `buildAdjacency(pack, flags): Map<number, Edge[]>` — edges are bidirectional; an edge is included only if traversable for **every** active profile (AND). Also builds a node-coordinate lookup.
  - `route(pack, flags, startId, goalId, hourIdx, tempC): RouteResult | null` — A\* with a haversine distance heuristic (admissible: heuristic uses raw meters, and `edgeCost ≥ length_m` whenever active-profile α or penalties are non-negative, which they are). Returns `null` when no path exists.
  - `nearestNode(pack, lon, lat): number` — for click-to-place origin/destination.

- [ ] **Step 1: Write the failing test**

`tests/frontend/astar.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { route, buildAdjacency, nearestNode } from "../../src/frontend/src/routing/astar";
import type { CityPack, ProfileFlags, Edge } from "../../src/frontend/src/types";

const NONE: ProfileFlags = { wheelchair: false, blind_low_vision: false, heat_sensitive: false };
const WC: ProfileFlags = { wheelchair: true, blind_low_vision: false, heat_sensitive: false };

function e(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0], confidence: "high",
    traversable: { wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true },
    ...over,
  };
}

// diamond: 1—2—4 (top) vs 1—3—4 (bottom); bottom edge 3—4 is steps
function pack(): CityPack {
  return {
    manifest: { id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
                hour_buckets: [12], generated_at: "x" },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.0, lat: 0.001 },
      { id: 3, lon: 0.001, lat: 0.0 }, { id: 4, lon: 0.001, lat: 0.001 },
    ],
    edges: [
      e(10, 1, 2), e(11, 2, 4),
      e(12, 1, 3), e(13, 3, 4, {
        is_steps: true,
        traversable: { wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true },
      }),
    ],
  };
}

describe("routing", () => {
  it("finds a path from 1 to 4", () => {
    const r = route(pack(), NONE, 1, 4, 0, 20);
    expect(r).not.toBeNull();
    expect(r!.nodeIds[0]).toBe(1);
    expect(r!.nodeIds.at(-1)).toBe(4);
  });

  it("wheelchair avoids the steps edge", () => {
    const r = route(pack(), WC, 1, 4, 0, 20);
    expect(r!.nodeIds).not.toContain(3); // must go via node 2
  });

  it("returns null when no traversable path exists", () => {
    const p = pack();
    // block both routes into node 4 for wheelchair
    p.edges[1].traversable.wheelchair = false; // 2—4
    const r = route(p, WC, 1, 4, 0, 20);
    expect(r).toBeNull();
  });

  it("nearestNode picks the closest coordinate", () => {
    expect(nearestNode(pack(), 0.0009, 0.0011)).toBe(4);
  });

  it("adjacency is bidirectional", () => {
    const adj = buildAdjacency(pack(), NONE);
    expect(adj.get(4)!.some((x) => x.to === 2 || x.from === 2)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run astar`
Expected: FAIL — cannot find `astar`.

- [ ] **Step 3: Write the implementations**

`src/frontend/src/routing/graph.ts`:
```typescript
import type { CityPack, Edge, ProfileFlags } from "../types";

export function edgeAllowed(edge: Edge, flags: ProfileFlags): boolean {
  if (flags.wheelchair && !edge.traversable.wheelchair) return false;
  if (flags.blind_low_vision && !edge.traversable.blind_low_vision) return false;
  if (flags.heat_sensitive && !edge.traversable.heat_sensitive) return false;
  return true;
}

export function buildAdjacency(pack: CityPack, flags: ProfileFlags): Map<number, Edge[]> {
  const adj = new Map<number, Edge[]>();
  const add = (n: number, e: Edge) => {
    if (!adj.has(n)) adj.set(n, []);
    adj.get(n)!.push(e);
  };
  for (const e of pack.edges) {
    if (!edgeAllowed(e, flags)) continue;
    add(e.from, e);
    add(e.to, e);
  }
  return adj;
}

export function nodeIndex(pack: CityPack): Map<number, { lon: number; lat: number }> {
  const m = new Map<number, { lon: number; lat: number }>();
  for (const n of pack.nodes) m.set(n.id, { lon: n.lon, lat: n.lat });
  return m;
}
```

`src/frontend/src/routing/astar.ts`:
```typescript
import type { CityPack, Edge, ProfileFlags, RouteResult } from "../types";
import { buildAdjacency, nodeIndex } from "./graph";
import { edgeCost } from "./cost";
import { haversineM } from "./geo";

export { buildAdjacency };

export function nearestNode(pack: CityPack, lon: number, lat: number): number {
  let best = pack.nodes[0].id, bestD = Infinity;
  for (const n of pack.nodes) {
    const d = haversineM(lon, lat, n.lon, n.lat);
    if (d < bestD) { bestD = d; best = n.id; }
  }
  return best;
}

function other(e: Edge, node: number): number {
  return e.from === node ? e.to : e.from;
}

export function route(
  pack: CityPack, flags: ProfileFlags,
  startId: number, goalId: number, hourIdx: number, tempC: number,
): RouteResult | null {
  const adj = buildAdjacency(pack, flags);
  const coords = nodeIndex(pack);
  const goal = coords.get(goalId)!;

  const h = (n: number) => {
    const c = coords.get(n)!;
    return haversineM(c.lon, c.lat, goal.lon, goal.lat);
  };

  const g = new Map<number, number>([[startId, 0]]);
  const cameFrom = new Map<number, { node: number; edge: Edge }>();
  const open = new Set<number>([startId]);

  const popLowest = () => {
    let best = -1, bestF = Infinity;
    for (const n of open) {
      const f = (g.get(n) ?? Infinity) + h(n);
      if (f < bestF) { bestF = f; best = n; }
    }
    return best;
  };

  while (open.size) {
    const cur = popLowest();
    if (cur === goalId) return reconstruct(cameFrom, goalId, hourIdx);
    open.delete(cur);
    for (const e of adj.get(cur) ?? []) {
      const nxt = other(e, cur);
      const tentative = (g.get(cur) ?? Infinity) + edgeCost(e, flags, hourIdx, tempC);
      if (tentative < (g.get(nxt) ?? Infinity)) {
        g.set(nxt, tentative);
        cameFrom.set(nxt, { node: cur, edge: e });
        open.add(nxt);
      }
    }
  }
  return null;

  function reconstruct(
    from: Map<number, { node: number; edge: Edge }>, goalN: number, hi: number,
  ): RouteResult {
    const nodeIds = [goalN];
    const edges: Edge[] = [];
    let cur = goalN;
    while (from.has(cur)) {
      const step = from.get(cur)!;
      edges.push(step.edge);
      cur = step.node;
      nodeIds.push(cur);
    }
    nodeIds.reverse(); edges.reverse();
    const totalLength = edges.reduce((s, e) => s + e.length_m, 0);
    const maxExposure = edges.reduce(
      (m, e) => Math.max(m, e.sun_exposure ? e.sun_exposure[hi] ?? 0 : 0), 0);
    const itinerary = edges.map((e) => ({
      text: describe(e), edge: e,
    }));
    return {
      nodeIds, edges,
      totalCost: g.get(goalN) ?? 0,
      totalLength_m: totalLength,
      maxExposure, itinerary,
    };
  }
}

function describe(e: Edge): string {
  const parts = [`${Math.round(e.length_m)} m`];
  if (e.is_steps) parts.push("⚠ steps");
  if (e.is_crossing) parts.push(e.crossing_signalized ? "signalized crossing" : "⚠ unsignalized crossing");
  if (e.confidence !== "high") parts.push(`(${e.confidence} confidence)`);
  return parts.join(" · ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run astar`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/routing/graph.ts src/frontend/src/routing/astar.ts tests/frontend/astar.test.ts
git commit -m "feat: add client-side A* routing with traversability filtering"
```

---

## Task 13: Route view — map, controls, and the text itinerary

**Files:**
- Create: `src/frontend/src/components/MapCanvas.tsx`, `src/frontend/src/components/ProfilePicker.tsx`, `src/frontend/src/components/TimeSlider.tsx`, `src/frontend/src/data/weather.ts`, `src/frontend/src/views/RouteView.tsx`
- Modify: `src/frontend/src/App.tsx`
- Test: `tests/frontend/weather.test.ts`

**Interfaces:**
- Consumes: `loadCityPack`, `route`, `nearestNode`, `CityPack`, `ProfileFlags`.
- Produces: `fetchCurrentTempC(lat, lon, fetchFn?): Promise<{ tempC: number; estimated: boolean }>` (Open-Meteo, spec §13 fallback to a seasonal normal on failure); the `RouteView` React component wiring click-to-place origin/destination, profile multi-select, time slider, map render, and a semantic text itinerary list.

This is the one heavy-UI task; the only unit-tested unit is the weather fallback (pure-ish). The view itself is verified by the manual smoke test in Step 6.

- [ ] **Step 1: Write the failing weather test**

`tests/frontend/weather.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { fetchCurrentTempC } from "../../src/frontend/src/data/weather";

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
    const fake = async () => { throw new Error("network down"); };
    const r = await fetchCurrentTempC(34.05, -118.25, fake as any);
    expect(r.estimated).toBe(true);
    expect(typeof r.tempC).toBe("number");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd src/frontend && npx vitest run weather`
Expected: FAIL — cannot find `weather`.

- [ ] **Step 3: Write the weather module**

`src/frontend/src/data/weather.ts`:
```typescript
type FetchFn = (url: string) => Promise<Response>;

// Conservative LA seasonal normal (°C) used only when Open-Meteo is unreachable.
const SEASONAL_NORMAL_C = 24;

export async function fetchCurrentTempC(
  lat: number, lon: number, fetchFn: FetchFn = (u) => fetch(u),
): Promise<{ tempC: number; estimated: boolean }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=apparent_temperature`;
  try {
    const res = await fetchFn(url);
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    const t = data?.current?.apparent_temperature;
    if (typeof t !== "number") throw new Error("no apparent_temperature");
    return { tempC: t, estimated: false };
  } catch {
    return { tempC: SEASONAL_NORMAL_C, estimated: true };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd src/frontend && npx vitest run weather`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the map, controls, and view**

`src/frontend/src/components/MapCanvas.tsx`:
```tsx
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CityPack, RouteResult } from "../types";

const STYLE = "https://demotiles.maplibre.org/style.json"; // no-key raster demo style

export function MapCanvas({
  pack, route, onPick,
}: {
  pack: CityPack;
  route: RouteResult | null;
  onPick: (lon: number, lat: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map>();

  useEffect(() => {
    if (!ref.current) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    const m = new maplibregl.Map({
      container: ref.current, style: STYLE,
      bounds: [minLon, minLat, maxLon, maxLat], fitBoundsOptions: { padding: 20 },
    });
    m.on("click", (e) => onPick(e.lngLat.lng, e.lngLat.lat));
    map.current = m;
    return () => m.remove();
  }, [pack]);

  useEffect(() => {
    const m = map.current;
    if (!m || !route) return;
    const coords = route.edges.flatMap((e) => e.geometry);
    const data: GeoJSON.Feature = {
      type: "Feature", properties: {},
      geometry: { type: "LineString", coordinates: coords },
    };
    const apply = () => {
      if (m.getSource("route")) {
        (m.getSource("route") as maplibregl.GeoJSONSource).setData(data);
      } else {
        m.addSource("route", { type: "geojson", data });
        m.addLayer({
          id: "route", type: "line", source: "route",
          paint: { "line-color": "#0b7", "line-width": 5 },
        });
      }
    };
    m.isStyleLoaded() ? apply() : m.once("load", apply);
  }, [route]);

  return <div ref={ref} role="application" aria-label="Route map"
              style={{ height: "60vh", width: "100%" }} />;
}
```

`src/frontend/src/components/ProfilePicker.tsx`:
```tsx
import type { ProfileFlags } from "../types";

const LABELS: { key: keyof ProfileFlags; label: string }[] = [
  { key: "wheelchair", label: "Wheelchair user" },
  { key: "heat_sensitive", label: "Heat-sensitive" },
  { key: "blind_low_vision", label: "Blind / low vision" },
];

export function ProfilePicker({
  flags, onChange,
}: { flags: ProfileFlags; onChange: (f: ProfileFlags) => void }) {
  return (
    <fieldset>
      <legend>Accessibility profile</legend>
      {LABELS.map(({ key, label }) => (
        <label key={key} style={{ display: "block" }}>
          <input
            type="checkbox" checked={flags[key]}
            onChange={(e) => onChange({ ...flags, [key]: e.target.checked })}
          />{" "}
          {label}
        </label>
      ))}
    </fieldset>
  );
}
```

`src/frontend/src/components/TimeSlider.tsx`:
```tsx
export function TimeSlider({
  buckets, index, onChange,
}: { buckets: number[]; index: number; onChange: (i: number) => void }) {
  const hour = buckets[index];
  return (
    <label style={{ display: "block" }}>
      Time of day: <strong>{String(hour).padStart(2, "0")}:00</strong>
      <input
        type="range" min={0} max={buckets.length - 1} value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`Time of day, ${hour}:00`}
        style={{ width: "100%" }}
      />
    </label>
  );
}
```

`src/frontend/src/views/RouteView.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags, RouteResult } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { route as computeRoute, nearestNode } from "../routing/astar";
import { fetchCurrentTempC } from "../data/weather";
import { MapCanvas } from "../components/MapCanvas";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";

export function RouteView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>(
    { wheelchair: false, blind_low_vision: false, heat_sensitive: false });
  const [hourIdx, setHourIdx] = useState(4);
  const [temp, setTemp] = useState<{ tempC: number; estimated: boolean }>({ tempC: 24, estimated: true });
  const [origin, setOrigin] = useState<number | null>(null);
  const [dest, setDest] = useState<number | null>(null);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [msg, setMsg] = useState<string>("Tap the map to set your start point.");

  useEffect(() => { loadCityPack(cityId).then(setPack); }, [cityId]);
  useEffect(() => {
    if (!pack) return;
    const [minLon, minLat, maxLon, maxLat] = pack.manifest.bbox;
    fetchCurrentTempC((minLat + maxLat) / 2, (minLon + maxLon) / 2).then(setTemp);
  }, [pack]);

  const onPick = (lon: number, lat: number) => {
    if (!pack) return;
    const n = nearestNode(pack, lon, lat);
    if (origin == null) { setOrigin(n); setMsg("Now tap your destination."); }
    else { setDest(n); }
  };

  useEffect(() => {
    if (!pack || origin == null || dest == null) return;
    const r = computeRoute(pack, flags, origin, dest, hourIdx, temp.tempC);
    setResult(r);
    setMsg(r
      ? `Route found: ${Math.round(r.totalLength_m)} m, peak sun exposure ${Math.round(r.maxExposure * 100)}%.`
      : "No accessible route exists for this profile between those points.");
  }, [pack, origin, dest, flags, hourIdx, temp]);

  if (!pack) return <p>Loading map…</p>;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>Passable — {pack.manifest.name}</h1>
      <p role="status" aria-live="polite">{msg}</p>
      {temp.estimated && (
        <p role="note">Temperature is an estimate — live weather is unavailable.</p>
      )}
      <ProfilePicker flags={flags} onChange={setFlags} />
      <TimeSlider buckets={pack.manifest.hour_buckets} index={hourIdx} onChange={setHourIdx} />
      <button onClick={() => { setOrigin(null); setDest(null); setResult(null);
        setMsg("Tap the map to set your start point."); }}>
        Reset points
      </button>
      <MapCanvas pack={pack} route={result} onPick={onPick} />
      {result && (
        <section aria-label="Turn-by-turn directions">
          <h2>Directions</h2>
          <ol>
            {result.itinerary.map((step, i) => (
              <li key={i}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
```

`src/frontend/src/App.tsx`:
```tsx
import { RouteView } from "./views/RouteView";
export default function App() {
  return <RouteView cityId="la" />;
}
```

- [ ] **Step 6: Smoke test the running app**

Run: `cd src/frontend && npm run dev`, open the URL.
Expected: LA map loads; tapping twice draws a route; toggling **Wheelchair user** reroutes off any steps; dragging the time slider toward 14:00 changes the route on sunny edges; the Directions list mirrors the path and marks low-confidence and unsignalized-crossing segments.

- [ ] **Step 7: Full test + build gate**

Run: `pytest tests/backend -v && cd src/frontend && npm test && npm run build`
Expected: all backend + frontend tests pass; production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/frontend/src/components src/frontend/src/views src/frontend/src/data/weather.ts src/frontend/src/App.tsx tests/frontend/weather.test.ts
git commit -m "feat: add Route view with map, profile, time slider, and text itinerary"
```

---

## Phase 2 Checkpoint

After Task 13 the submission is already a complete, novel, demoable product: a heat-aware,
step-free pedestrian router over real Downtown LA data, working offline against a committed
artifact, with a screen-reader-legible itinerary. Everything in the later plans is additive.

---

## Plan Series (deferred to their own plans)

Per the spec's defensive build order (§15), the remaining phases become their own plans,
each producing working software, written when we reach them:

- **Plan 2 — Reach + hazards (Phases 3-4):** Dijkstra-to-exhaustion under an exposure budget; the Reach view; destinations (cooling/evac centers, rest stops); hazard scenario presets; the `power_dependent` flag with honest `unknown` labeling. **Rest-stop proximity must be modelled as a reduced penalty on rest-stop-adjacent edges, never as a subtracted bonus** — `edgeCost` maintains the invariant `cost >= length_m`, without which the A\* haversine heuristic stops being admissible and routes go silently non-optimal.
- **Plan 3 — Transit + Report + realtime (Phases 5-7):** GTFS static `wheelchair_boarding` stops; the Report view (network traversability %, shade %, centers with no step-free approach, ranked heat traps via betweenness); GTFS-Realtime service alerts with staleness indicator.
- **Plan 4 — Second city + hardening (Phases 8-9):** Phoenix-or-Seattle pack (decided after inspecting OSM coverage); full accessibility hardening (keyboard origin/dest entry, focus management, live regions, WCAG AA contrast, `prefers-reduced-motion`, VoiceOver pass); real `pybdshadow` shadows if the proxy proves too coarse; deploy; ≤5-min video.

---

## Self-Review

**Spec coverage (Phases 0-2 scope):**
- §4 no-server / client-side routing → Tasks 10-13. ✓
- §5 repo layout → Task 1 file structure. ✓
- §6 data sources (OSM, Open-Meteo) → Tasks 4, 13. ✓
- §7 edge schema → Task 2; traversability predicate → Task 7; cost function → Task 11; reach/budget → deferred to Plan 2 (correctly out of MVP scope). ✓
- §7 profiles compose (AND traversability, max penalty) → Tasks 11-12. ✓
- §12 untagged ≠ safe → Task 6 confidence + Task 12 itinerary surfacing. ✓
- §13 Open-Meteo fallback, no-route message → Task 13 weather, Task 12/13 null handling. ✓
- §16 shade proxy fallback → Task 8 (proxy is the shipped MVP path). ✓
- Later-phase spec items (Reach, Report, transit, power, 2nd city, a11y hardening) → explicitly deferred to Plans 2-4. ✓

**Placeholder scan:** No "TBD"/"handle appropriately"/"similar to Task N". `REST_BONUS` is intentionally wired-but-zero with a stated reason and a named future task — real code, not a placeholder. ✓

**Type consistency:** `ProfileFlags` (3 boolean fields; `none` = all false) is used identically in `cost.ts`, `graph.ts`, `astar.ts`, and every component. `Edge.traversable` keys match the schema's `traversable` object and the Python `traversable_flags` output. `edgeCost(edge, flags, hourIdx, tempC)` signature is identical across its definition (Task 11) and both call sites (Tasks 12-13). `route(...)` returns `RouteResult | null` consistently. `hourIdx` indexes `sun_exposure`, whose length equals `hour_buckets` (enforced in Task 9 test). ✓
