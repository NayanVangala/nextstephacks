# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two confirmed audiences, treated as co-equal peers rather than primary and
secondary. One engine, two front doors.

**The individual pedestrian.** A disabled person planning a specific trip in a
US downtown, deciding whether a route is survivable right now. Four profiles the
product models explicitly:

- wheelchair users — steps, steep grade, high kerbs, narrow or unpaved surface
- heat-sensitive — MS, POTS, cardiac conditions, or medication that reacts to heat
- blind or low vision — unsignalised crossings, tactile paving
- power-dependent — powered chair, ventilator, refrigerated medication, home
  dialysis; needs to know which destinations have backup generation

They are often deciding under time pressure, in heat, on a phone, sometimes with
a caregiver on a different device.

**The planner or institution.** Someone asking which neighbourhoods are cut off,
ranked worst-first, and whether that correlates with anything. Reads the same
graph as the individual, at population scale.

Near-term evaluation audience: NextStep Hacks "Earth Forward" judges, deadline
2026-09-13. Judge impact leads this month where it does not cost a real user
anything; real usability is the floor it may not break.

## Product Purpose

Passable computes heat-safe, step-free walking routes across 38 US downtowns,
and measures who cannot get where in a heat event, per disability profile and
per hour.

Mainstream routing models neither obstacle. It will route a wheelchair user down
a flight of stairs, and route a heat-sensitive person across four unshaded
blocks at 2pm in Phoenix — not because its data is wrong, but because neither
barrier is represented at all.

Success is a person correctly deciding a trip is or is not survivable, and a
city being shown a number about its own network that did not previously exist.

## Positioning

Two claims a neighbouring product could not truthfully copy:

1. **It models sun exposure per segment per hour**, computed by projecting
   building footprints extruded to tagged height against the sun's real
   position, with the longitude-to-solar-time correction applied. Not measured
   shade — computed, and disclosed as computed.
2. **It says out loud when it does not know.** Unknown never renders as known.
   This is the product's spine, not a caveat: an interface that projects false
   confidence to a person deciding whether a route is survivable is the most
   dangerous thing it could do.

The second claim is what makes the first trustworthy.

## Operating Context

- Runs entirely in the browser. No server, no API key, no account, no database.
- Deploys as static files to GitHub Pages; must keep working when forked.
- City packs (nodes, edges, per-edge accessibility attributes, an 8-bucket
  sun-exposure array, destinations, block-group index) are precomputed offline
  by a Python pipeline and shipped as JSON, 2.5–16 MB each.
- A* runs client-side over the sidewalk graph.
- Live sources are keyless and raise a floor, never a ceiling: an NWS heat
  warning can only make the tool more cautious, never clear a route it would
  otherwise have ruled out.
- Ground reports decay with a 90-day half-life and harmonic damping. Reporting
  is anonymous by default; signing in buys attribution only.

## Capabilities and Constraints

Four views: Route (safest path now), Reach (what is inside a distance or
exposure budget, and what a hazard scenario removes), City audit (where this
city fails its disabled residents), Index (block groups ranked by connectivity).

Hard technical constraints:

- **No WebGL.** Leaflet on a 2D canvas. A vector map that renders blank without
  WebGL2 is not an accessibility tool.
- **No CDN assets.** Fonts are bundled; the app must work offline.
- **`edgeCost >= edge.length_m`, always.** The A* heuristic is raw haversine
  metres and is admissible only while every cost term is additive on top of
  physical length. Violating this does not crash, does not fail a test, and
  cannot be seen on screen — it silently returns a non-shortest path.
- No UPDATE policy on reports; a confirmed report's text can never be swapped.
- No profile, avatar, or display name — only the auth uuid.

Data on hand: 38 city packs, 477,618 sidewalk segments, 13,349 destinations
(537 cooling centres, 706 evacuation centres, 298 transit stops, 11,808 rest
stops), Census block-group geometry and ACS income.

## Brand Commitments

- Name: **Passable**.
- All user-facing UI copy is English. The codebase — identifiers, comments,
  commits — is Chinese by project policy; this never leaks into the interface.
- Voice: plain, exact, unhedged. States numbers and their uncertainty together.
  Never reassuring about something it has not measured.
- Live at https://nayanvangala.github.io/nextstephacks/

## Evidence on Hand

Real, verifiable, and safe to cite:

- 38 city packs with the counts above, recomputed from the shipped data.
- Phoenix: 2,541 of 2,781 building footprints have no published height (91.4%),
  so its shade model is mostly inference — stated in the product, with the number.
- Across all 38 downtowns, 47,375 of 81,864 footprints (58%) have no published
  height. New York publishes 95%, Los Angeles 92%, Las Vegas 6%, Green Bay 2%.
- Los Angeles GTFS omits `wheelchair_boarding` entirely across every stop.
- The income-to-accessibility correlation is measured every build and reported
  as measured, including when it is weak or collapses on the credible subset.

Absences future work must not fabricate: no testimonials, no user counts, no
partnerships, no press, no pricing, no accuracy benchmark against a competitor.

## Product Principles

1. **Unknown never renders as known.** Inference is marked wherever it appears.
   Where a number is uncertain, the uncertainty ships beside it.
2. **One colour means one thing.** Colour that encodes measured data may not
   also decorate; a scale that means two things means neither.
3. **The accessibility floor is not a style layer.** 44px targets, visible
   focus, keyboard reachability, reduced-motion compliance, screen-reader
   parity, and no WebGL dependency hold regardless of aesthetic direction.
4. **Nothing is gated.** No account, no key, no server. A tool that demands a
   login before someone can report a broken kerb cut has failed the person
   standing at the broken kerb cut.
5. **Both doors are front doors.** The individual and the institution read the
   same truth from the same graph; neither is a subordinate view of the other.

## Accessibility & Inclusion

The audience is the requirement. Motor impairment sets the touch-target floor
and rules out motion that moves targets away from an imprecise pointer. Heat
sensitivity and fatigue set the demand for fast, scannable answers. Low vision
sets contrast and focus visibility. Reduced-motion preference is honoured, not
approximated. Screen-reader users receive the same findings as sighted users,
including every uncertainty marker.
