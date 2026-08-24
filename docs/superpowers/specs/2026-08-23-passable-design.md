# Passable — Design Spec

**Event:** NextStep Hacks 2026 (HackAlphaX). Theme: *Earth Forward*.
**Submission deadline:** 2026-09-13. Deliverables: repo link, live link, video pitch ≤5 min.
**Builder:** solo.
**Budget:** ~50 focused hours across three weeks (see §15 for the phase breakdown).
**Date:** 2026-08-23.

---

## 1. Problem

Extreme heat is the deadliest climate hazard in the United States, and it is not evenly
dangerous. A wheelchair user overheats faster — less sweating surface area, a metal frame
that absorbs sun, hands in direct contact with hot pushrims. Multiple sclerosis, POTS,
and many common medications make heat genuinely hazardous rather than uncomfortable. A
blind pedestrian cannot see which side of the street carries shade.

Every routing product optimizes for shortest or fastest. A handful optimize for shade.
A separate handful optimize for step-free access. **None optimize for both at once**, and
the interaction is exactly where disabled pedestrians get hurt: the step-free route is
often the longer, more exposed one.

The same gap reappears in emergencies. Evacuation planning assumes a body that can walk,
drive, or board a bus on short notice. Los Angeles paratransit (Access Services) is a
next-day booking system. A wildfire does not give a day's notice. The transit mode
disabled residents depend on is structurally unavailable in precisely the emergency that
requires it.

## 2. What we are building

**Passable** — one conditional accessibility graph, three views.

Every sidewalk segment carries static accessibility attributes (steps, kerb, width,
surface, incline) and time-varying heat exposure (sun versus shade, by hour). A body
profile turns those into traversability and cost. The everyday question and the emergency
question are the same computation with different stopping conditions.

| View | Question | Computation |
|---|---|---|
| **Route** | What is my safest path right now? | A\* to a destination |
| **Reach** | What can I actually get to? Can I get out? | Dijkstra to exhaustion under an exposure budget |
| **Report** | Where does this city fail its disabled residents? | Aggregate statistics over the graph |

Route serves the disabled pedestrian. Report serves the city planner and emergency
manager. One graph, one cost model, two audiences.

### Primary city

**Los Angeles.** Heat and wildfire in the same setting, so Route and Reach share a
context. Strong municipal open-data portal. LA Metro publishes GTFS and GTFS-Realtime,
and Access Services provides the paratransit narrative.

A second city ships to prove the pipeline generalizes (see §11).

## 3. Non-goals

Stated so scope creep is visible when it happens:

- Not a general-purpose routing engine. One pedestrian mode, a fixed set of profiles.
- No user accounts, no saved routes, no route history.
- No native mobile app. Responsive web only.
- No machine learning. Nothing here needs a model, and adding one to chase the AI track
  would be visible padding.
- No turn-by-turn live navigation with GPS following. Static route display only.
- Not medical guidance. See §12.

## 4. Architecture — precompute offline, route in the browser

```
Python pipeline (offline, run by hand)
    │  Overpass, building heights, GTFS, city open data
    ▼
Static city-pack artifacts (JSON, committed to repo)
    │
    ▼
React app (Vite + MapLibre) — loads pack, routes client-side
    │
    └─ Open-Meteo fetched live at runtime for current conditions
```

**There is no application server.** The pipeline is a batch job whose output is committed
data. The frontend is a static deploy.

Three reasons this is the right call and not just the lazy one:

1. **Deployment risk drops to zero.** A static site on Vercel is a live link that cannot
   fall over during judging.
2. **It is fast.** A downtown-scale sidewalk network is tens of thousands of edges.
   Client-side A\* over that runs in single-digit milliseconds. No round trip.
3. **It works offline — and that is thematic, not incidental.** Cell networks fail during
   wildfires and heat-driven grid stress. An evacuation tool that needs a server to tell
   you how to leave is a broken evacuation tool. The app caches its city pack and keeps
   routing with no network. Only live temperature degrades, and it degrades to a
   documented fallback.

The one runtime dependency is Open-Meteo for current apparent temperature, and §13
specifies its failure behavior.

## 5. Repository layout

```
nextstephacks/
├── src/
│   ├── frontend/                  # Vite + React + TypeScript + MapLibre
│   │   ├── package.json           # frontend is its own package root
│   │   ├── src/
│   │   │   ├── routing/           # A*, Dijkstra reach, cost evaluation
│   │   │   ├── views/             # Route, Reach, Report
│   │   │   ├── components/
│   │   │   └── utils/
│   │   └── public/
│   │       └── city-packs/        # committed precomputed artifacts
│   ├── backend/                   # Python precompute pipeline (batch, not a server)
│   │   ├── pyproject.toml
│   │   └── pipeline/
│   │       ├── extract/           # Overpass, GTFS, city open data
│   │       ├── graph/             # graph build, attribute tagging
│   │       ├── shade/             # sun position, shadow polygons, edge exposure
│   │       └── emit/              # artifact serialization
│   └── shared/
│       └── schema/                # JSON Schema for city-pack artifacts
├── scripts/                       # build-city, deploy, validate
├── config/                        # city manifests, .env.example
├── tests/                         # mirrors src/
├── docs/
│   └── superpowers/specs/
└── README.md
```

`src/shared/schema/` earns its place: Python writes the artifacts, TypeScript reads them,
and both validate against the same JSON Schema. That is a genuine cross-tier contract
rather than a directory created out of habit.

## 6. Data sources

All free, all real, no paid tiers.

| Layer | Source | Notes |
|---|---|---|
| Sidewalk graph | OSM via Overpass API | `highway=footway` + `footway=sidewalk`, `highway=steps`, `kerb=*`, `wheelchair=*`, `incline=*`, `surface=*`, `width=*`, `tactile_paving=*`, `crossing=*` |
| Building heights | OSM `building:levels`, `height` | Levels × 3.2m when `height` absent |
| Shade | Computed — `pybdshadow` for shadow polygons, `suncalc` for sun position | Fallback proxy in §16 |
| Temperature | Open-Meteo | Free, no API key, apparent temperature |
| Rest stops | OSM | `amenity=bench`, `amenity=drinking_water`, `amenity=toilets` |
| Cooling / evacuation centers | LA city + county open data portals | Fallback: OSM tags plus hand-verified JSON |
| Transit stops | LA Metro GTFS static | `stops.txt` carries `wheelchair_boarding` (0 unknown / 1 accessible / 2 not) |
| Service disruption | LA Metro GTFS-Realtime | Service alerts only — see §9 |

## 7. Core model — the conditional accessibility graph

This is the intellectual content of the project. Everything else is presentation.

### Edge schema

```
Edge {
  id, from_node, to_node
  length_m: float
  geometry: [[lon, lat], ...]

  // static accessibility
  is_steps: bool
  step_count: int | null
  kerb: "lowered" | "raised" | "flush" | "none" | null
  wheelchair_tag: "yes" | "no" | "limited" | null
  incline_pct: float | null
  surface: string | null
  width_m: float | null
  tactile_paving: bool | null
  is_crossing: bool
  crossing_signalized: bool | null

  // time-varying
  sun_exposure: float[N_HOURS]   // fraction of edge length in direct sun, per hour bucket

  // derived
  confidence: "high" | "medium" | "low"   // how much was inferred vs tagged
}
```

`sun_exposure` is precomputed per hour bucket, not per minute. Hour buckets over daylight
hours are sufficient resolution and keep the artifact small.

### Body profiles

Four, deliberately few:

- `wheelchair` — manual or powered chair
- `heat_sensitive` — MS, POTS, heat-reactive medication, cardiac conditions
- `blind_low_vision`
- `none` — baseline, for comparison in the demo

Profiles compose. A wheelchair user who is also heat-sensitive selects both, and the
predicates and penalties union.

### Traversability predicate

Hard exclusions, evaluated per profile. An excluded edge is removed from the graph before
search, not merely penalized — this is the difference between "a longer walk" and "you
physically cannot".

| Profile | Excludes |
|---|---|
| `wheelchair` | `is_steps`; `wheelchair_tag == "no"`; `kerb == "raised"` on a crossing without a lowered counterpart; `incline_pct > 8.33` (ADA ramp maximum); `surface` in {sand, gravel, ground, grass}; `width_m < 0.9` where tagged |
| `blind_low_vision` | nothing hard-excluded — unsignalized wide crossings are heavily penalized instead |
| `heat_sensitive` | nothing hard-excluded — governed by exposure budget |
| `none` | nothing |

Untagged is not the same as absent. Where a tag is missing, the edge is admitted with
`confidence` downgraded and the UI marks the route as containing unverified segments.
Silently assuming an untagged sidewalk is step-free would make the tool dangerous.

### Cost function

```
heat_index_norm = clamp((apparent_temp_C - 25) / 15, 0, 1)

heat_multiplier  = 1 + α_profile × sun_exposure[hour] × heat_index_norm
surface_factor   = table lookup, 1.0 for asphalt/concrete, higher for rough surfaces
slope_penalty    = β_profile × max(0, incline_pct - 3) × length_m
crossing_penalty = γ_profile, higher when unsignalized, higher again for blind_low_vision
rest_bonus       = δ if a bench, water fountain, or shade refuge sits within 20m of the edge

cost = length_m × heat_multiplier × surface_factor
     + slope_penalty + crossing_penalty − rest_bonus
```

`α_wheelchair` and `α_heat_sensitive` are substantially higher than `α_none`. Tuning these
constants against real LA geometry is the work; the shape of the function is fixed.

The demo hinges on this being visibly non-trivial: at 08:00 the route is direct, at 14:00
it detours onto the shaded side of the street, and toggling `wheelchair` rejects a
shortcut containing three steps.

### Reach and the exposure budget

Reach runs Dijkstra to exhaustion, accumulating a separate quantity from cost:

```
heat_load = Σ (length_m × sun_exposure[hour] × heat_index_norm)
```

Expansion halts when `heat_load` exceeds the profile's budget. The reachable edge set is
rendered directly rather than hulled into an isochrone polygon — rendering the actual
edges is both simpler and more honest about where the boundary really is.

Evacuation feasibility reduces to a set-membership test: is any designated cooling or
evacuation center inside the reachable set?

**These budgets are heuristics, not clinical thresholds.** See §12.

## 8. The three views

### Route

Origin, destination, profile selection, time-of-day slider. Renders the path, an
exposure strip showing sun and shade along the route, rest stops, and any low-confidence
segments called out explicitly.

A parallel text view — full turn-by-turn as a semantic list — is a first-class view, not a
screen-reader afterthought. It is toggleable by any user and is what gets read aloud.

### Reach

Profile, hazard scenario, start point. Renders reachable network, unreachable-but-nearby
destinations in a distinct treatment, and a plain-language verdict: *"From here, at 14:00
in a heat advisory, no cooling center is reachable."*

Hazard scenarios are presets that shift temperature and, in the wildfire case, mark
specific corridors as closed.

### Report

City-level, generated from the same graph:

- Share of sidewalk network traversable, per profile
- Share of traversable network shaded at 14:00
- Cooling and evacuation centers with no step-free approach within 400m
- Accessible transit stops with no step-free approach
- Ranked heat-trap segments — high exposure weighted by betweenness centrality
- Data confidence breakdown, so the reader knows what is tagged versus inferred

This is the artifact a city employee could act on, and it costs one extra view over
machinery that already exists for Route and Reach.

## 9. Transit layer

**GTFS static.** Parse `stops.txt`, retain `wheelchair_boarding`. Accessible stops become
destinations in Reach and a metric in Report. Cheap, high value.

**GTFS-Realtime.** Service alerts only — not vehicle positions, not trip updates. An
alert affecting a stop marks it degraded in Reach. Protobuf parsing via `gtfs-realtime-bindings`.
Fetched at runtime with a documented staleness indicator; when unavailable the app falls
back to static and says so.

**Paratransit.** Not an integration — Access Services has no public booking API. It ships
as a documented constant in the city manifest (`advance_booking_hours: 24`) that the Reach
view surfaces when a user's profile indicates paratransit dependence, and that the Report
states plainly. The insight is the deliverable; the plumbing would be a day spent for
nothing.

## 10. Power dependency

Restored at the user's direction, built honestly.

There is no open dataset of facilities with backup power. Rather than invent one:

- `power_dependent` is a user-declared profile flag (powered wheelchair, ventilator,
  refrigerated medication, home dialysis).
- When set, destinations carry a `backup_power` field of `yes` / `no` / **`unknown`**,
  sourced only from published city data where it exists.
- **Most destinations will read `unknown`, and the UI says so directly** rather than
  rendering absence as safety.
- The Report states the coverage gap as a finding: *"Backup power status is unpublished
  for N of M designated cooling centers."*

An unpublished dataset is itself a finding worth reporting. That is the honest version of
this feature, and it is more interesting than a fabricated one.

## 11. Multi-city

A **city pack** is a directory of artifacts plus a manifest:

```json
{
  "id": "la",
  "name": "Los Angeles",
  "bbox": [...],
  "timezone": "America/Los_Angeles",
  "gtfs_static_url": "...",
  "gtfs_rt_alerts_url": "...",
  "destination_sources": [...],
  "paratransit": { "operator": "Access Services", "advance_booking_hours": 24 },
  "generated_at": "..."
}
```

The pipeline runs `python -m pipeline.build --city la`. Nothing city-specific lives in
code; it lives in `config/cities/*.json`. Shipping a second city is then a manifest plus a
pipeline run.

Second city: **Phoenix** if OSM sidewalk coverage proves adequate on inspection, otherwise
**Seattle**, whose sidewalk data is the best in the country and whose 2021 heat dome is a
strong narrative about infrastructure that was never built for heat.

## 12. Safety and honesty constraints

**This tool must not be presented as medical guidance.** A heat-exposure budget that a
heat-sensitive user trusts could contribute to real harm if it is wrong. Therefore:

- Exposure budgets are conservative by default.
- The interface states plainly that budgets are heuristics, not clinical thresholds, and
  that users should follow their own medical guidance.
- The app never says "you are safe." It says what it computed and what it does not know.
- Low-confidence and untagged data are surfaced in the route, not hidden to make output
  look cleaner.

**Accessibility of the app itself is non-negotiable.** Judges scoring an accessibility
project will open a screen reader, and map applications are notoriously bad here — which
makes this cheap differentiation:

- Full keyboard operation, including origin and destination selection without a mouse
- Turn-by-turn text as a first-class view with correct semantic structure
- Managed focus on view transitions and route recomputation
- Live regions announcing route changes
- WCAG AA contrast minimum, verified
- `prefers-reduced-motion` respected on all map animation
- Tested with VoiceOver, not merely with an automated linter

## 13. Failure and degradation

| Failure | Behavior |
|---|---|
| `building:levels` absent | Default height by building footprint area and land use; edge `confidence` → `medium`; surfaced in Report |
| Overpass timeout or rate limit | Pipeline is offline and cached; committed extracts mean a build never blocks on Overpass |
| Open-Meteo unreachable | Fall back to seasonal normal for the date and hour, banner states temperature is estimated |
| GTFS-RT unreachable | Static data only, staleness indicator shown |
| Destination dataset missing a field | Render `unknown`, never infer |
| No route exists for the profile | Explicit "no accessible route exists" plus the specific blocking segments — a far more useful answer than silently returning a route the user cannot use |

The last row matters. The failure case is the product's best moment: showing *why* there
is no accessible route is the argument the whole project is making.

## 14. Testing

| Layer | Approach |
|---|---|
| Pipeline | pytest — graph build invariants (connectivity, no orphan nodes, geometry validity), traversability predicate truth table per profile, shade exposure bounded to [0,1] |
| Routing | vitest — A\* correctness against brute-force shortest path on small fixture graphs; cost monotonicity; reach set is a superset of any route within budget |
| Artifacts | JSON Schema validation in CI; golden-file tests on a small fixture city |
| Accessibility | axe-core in CI, plus a manual VoiceOver pass recorded in the repo |
| Data quality | Ten hand-verified LA routes checked against ground truth via street imagery |

TDD applies to the routing and cost code specifically — it is pure, deterministic, and the
place where a silent bug produces a plausible-looking wrong answer.

## 15. Build order

Sequenced defensively. Every phase ends at a demoable product, and the optional layers
land last, so time pressure cuts from the end rather than leaving something half-wired.

| Phase | Deliverable | Hours |
|---|---|---|
| 0 | Scaffold, city manifest, schema, CI | 2 |
| 1 | Graph build + traversability + Route view, no heat | 6 |
| 2 | Shade model + heat cost — **the demo exists after this phase** | 6 |
| 3 | Reach view + exposure budget | 4 |
| 4 | Destinations, hazard scenarios, power-dependency flag | 3 |
| 5 | GTFS static, accessible stops | 2 |
| 6 | Report view | 4 |
| 7 | GTFS-Realtime alerts | 4 |
| 8 | Second city pack | 5 |
| 9 | Accessibility hardening, polish, deploy, video | 10 |
| — | Buffer | 4 |
| | **Total** | **50** |

Phase 2 is the checkpoint. If Phase 2 lands and everything after it is lost, the
submission is still a complete, novel, demoable product.

## 16. Risks

| Risk | Mitigation |
|---|---|
| Shade precompute consumes the schedule | Fallback proxy: street bearing against sun azimuth plus building height each side. Visually identical in the demo, roughly two hours instead of six. Decision point at the end of Phase 2, day one. |
| LA OSM sidewalk coverage is patchy in places | Scope to a downtown bounding box with verified coverage; the confidence system makes gaps a displayed feature rather than a silent flaw |
| Cost constants produce uninteresting routes | Tune against ten hand-picked LA origin-destination pairs chosen because a shade detour should exist; if the function never detours, the weights are wrong, not the idea |
| Client-side graph payload too large | Quantize coordinates, drop unused tags, gzip. Downtown-scale should land in low single-digit MB; if not, tile the graph |
| Scope at 50h overruns three weeks | Build order guarantees a shippable product from Phase 2 onward |

## 17. Judging alignment

| Criterion | How this scores |
|---|---|
| Originality | Joint heat and step-free cost optimization does not exist in any shipped product; no accessibility-climate crossover appears among the 2026 winners at TreeHacks, Cal Hacks 12.0, or LA Hacks (winners surveyed, not full galleries) |
| Theme adherence | Extreme heat and wildfire evacuation are core climate resilience; the Report is a municipal adaptation artifact |
| Completion | Defensive build order; Phase 2 is a complete product |
| Learning | Graph search, computational geometry for shadows, GTFS, WCAG |
| Design | Accessibility of the app is itself the design thesis |
| Technical impressiveness | Custom cost model, precomputed shadow geometry, client-side routing, offline capability |

## 18. Deliverables

- Public repo with README documenting what was built during the event
- Live link, static deploy
- Video ≤5 min. Structure: the interaction gap in one sentence, the time slider rerouting,
  the wheelchair toggle rejecting the stairs, the Reach view finding no reachable cooling
  center, the Report, and the offline claim demonstrated with the network disabled.
