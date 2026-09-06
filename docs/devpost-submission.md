# Passable — Devpost submission copy

Paste each section into the matching Devpost field. Everything here is copy, not
documentation; the numbers are measured from the shipped city packs and test
suite, not estimated.

---

## Elevator pitch (200 char limit)

> Google Maps will route a wheelchair user down a flight of stairs. Passable
> models step-free access and sun exposure together across 38 US downtowns — and
> says out loud where it's guessing.

Alternate, shorter:

> Heat-safe, step-free walking routes across 38 US downtowns. Models what other
> routers leave out, and marks every place the data is inferred.

---

## Project Story

```markdown
## Inspiration

Google Maps will route a wheelchair user down a flight of stairs. It will also
route someone with MS across four blocks of unshaded asphalt at 2pm in Phoenix.

Neither is a bug. Neither obstacle is *modelled at all*.

I wanted to know how bad the gap was, so I pulled the sidewalk data for one
downtown and started counting. The number that made me build this was not a
routing number — it was a data-quality number. In the Los Angeles study area,
**478 of 16,304 sidewalk segments** carry an explicit OpenStreetMap
accessibility tag — **2.9% of segments, and 1.4% of the network by length**
(3.6 km of 261.4 km). For the rest, every routing app in the world is inferring
passability and drawing you a confident line.

That is the actual problem. Not "routing is hard" — *routing looks certain when
it isn't*, and the person who pays for that false confidence is standing at the
bottom of the steps.

## What it does

Passable computes walking routes across **38 US downtowns**, weighting every segment
by sun exposure, grade, kerb height, surface and crossing signalisation, filtered
by disability profile. It runs entirely in your browser — no account, no API key,
no server.

Four views, two audiences, one graph:

- **Route** — the safest path right now, plus a written itinerary. It will also
  tell you that walking the same path at 18:00 instead of 14:00 cuts your sun
  exposure by 60%.
- **Reach** — flood outward under a distance *or* sun-exposure budget. Toggle a
  heat emergency and watch the reachable set collapse.
- **City audit** — where this city fails its disabled residents, measured.
- **Index** — every census block group ranked worst-connected first, joined to
  ACS income.

The individual and the city planner read the same truth from the same graph.

## The one rule everything is built around

**Unknown must never render as known.**

A clean line on a map reads as *trust me*, and for someone deciding whether a
route is survivable, an unearned "trust me" is the most dangerous thing an
interface can say. So:

- Inferred data prints **out of register** — the ink shifts, the way a
  misaligned print plate does. Doubt is visible without relying on colour, so it
  survives for colour-blind readers.
- An untagged segment renders as *untagged*, never as *verified passable*.
- Phoenix's shade model is **91.4% inferred** — 2,541 of its 2,781 building
  footprints have no published height. The app says so, with the number.
- When there is no route, it re-runs the search with no accessibility
  constraints and tells you whether the barrier was your profile or a genuine
  gap in the map.

## How I built it

An offline Python pipeline extracts sidewalks, kerbs, steps, surface and
building footprints from OpenStreetMap, joins GTFS transit and Census/ACS block
groups, projects building shadows against the sun's real position for eight hour
buckets, and emits a self-contained JSON pack per city. Everything after that
happens in the browser: A* over the sidewalk graph, client-side.

**Shade is computed, not measured.** Footprints are extruded to their tagged
height — or an assumed seven storeys, counted and disclosed — and their shadows
projected hour by hour. Solar position includes the longitude-to-solar-time
correction:

$$\Delta t = \frac{\lambda - \lambda_{\text{tz}}}{15^{\circ}} \text{ hours}$$

Skipping that costs up to **1.35 hours of error in Miami**, which is the
difference between "shaded" and "full sun."

### The invariant that keeps the router honest

The A\* heuristic is raw haversine distance. It is admissible only while every
cost term is additive on top of physical length:

$$c(e) \;\ge\; \ell(e) \qquad \forall\, e \in E$$

Violating this doesn't crash anything and doesn't fail a test. A\* still returns
*a* path — just not the shortest one. No error, no warning, and nobody can tell
from the screen. It is guarded deliberately, and the geometry tests assert
cross-language agreement between the TypeScript haversine and the Python one
that produces the lengths it must not exceed.

### Local knowledge

People report what only locals know — a construction detour, a blocked kerb cut,
a broken lift. Reports decay with a 90-day half-life:

\\( w(t) = w_0 \cdot 2^{-t/90} \\)

and stack with harmonic damping:

$$w(n) = \sum_{i=1}^{n} \frac{1}{i}$$

so ten reports of the same obstacle weigh about \\(2.93\times\\) one report —
more than one, nowhere near ten. Reporting is anonymous by default and always
will be. A tool that demands an account before you can say "this curb cut is
broken" has failed the person standing at the broken curb cut.

## What I found

Most of what I found was about the data, not the sidewalk.

- **LA Metro's public feeds omit the GTFS `wheelchair_boarding` field entirely**
  — not blank, *absent* — across all 299 stops in the study area.
- Its canceled-service endpoint answers `200`, with open CORS and well-formed
  JSON. The data is from **October 2022**.
- **Building height coverage is wildly uneven**: New York publishes heights for
  95% of its downtown buildings, Los Angeles 92% — Las Vegas 6%, Green Bay 2%.
  Across all 38 downtowns, **47,375 of 81,864 footprints (58%) have no published
  height at all**.
- **"98.9% traversable" is the wrong number.** Los Angeles is 98.9% traversable
  for a wheelchair profile — and 488 of 14,423 connected points still cannot be
  reached. Chicago is 97.7% traversable and strands 1,948 points, 9.2% of its
  walkable graph, behind short flights of steps. Both figures are true. Only one
  is about whether you can get anywhere.
- **36 neighbourhoods across 16 cities are 100% step-free and 0% connected.**
  Every metre passes. None of it reaches the city.
- I tested whether shade tracks income. Across the eighteen cities with
  precise-enough ACS estimates, **the sign will not hold still**: +0.51 in Miami,
  −0.34 in Boston, +0.03 in Los Angeles. A downtown extract cannot answer that
  question, and every city page says so. Reporting the measurement instead of the
  result I expected was the whole point.

## Challenges

**A test caught a security bug that reading the code could not.** Two Postgres
RLS policy names differed by one character, so a `drop policy` silently missed
its target. Postgres OR-combines permissive policies for the same command, so
the survivor won — and a signed-in user could file reports attributed to any
other account. Migrations now run against a real in-process Postgres on every
test run. Reading the SQL never would have found it; running it found it in
under a minute.

**WebGL turned the whole app into a blank white page** on machines that don't
provide it — locked-down corporate builds, low-end Android, VMs, anyone who
disables it to resist fingerprinting. The map is Leaflet on a 2D canvas now. A
vector map that renders blank without WebGL2 is not an accessibility tool.

**Canvas silently paints black.** `fillStyle = "var(--color-shade)"` is not an
error — it just paints black. Every segment on the map rendered black regardless
of sun exposure, which is the one thing the map exists to show. I then made the
*identical* mistake months later in a new component and spent a while convinced
the design was wrong before finding the one-line cause.

**Shipping a material below its own perceptual floor.** I added paper grain,
measured it, and reported it as working. It spanned 2 of 255 levels — invisible.
Later I found the cause was never opacity at all: the blend mode was gated on a
theme attribute the default never sets, so it could not have worked at any
value.

## What I learned

The thing I'll carry out of this: **verify by measuring the artifact, not by
looking at the thing you just changed.** I repeatedly "confirmed" work that
hadn't happened — a texture that rendered 2 levels of variance, a halftone plate
that rendered *zero pixels*, a deploy that reported success while creating no
deployment. Every one was caught by sampling actual output. None were caught by
looking.

Second: an accessibility tool has to survive its own defaults. A theme
preference was being written to `localStorage` on mount rather than on click, so
every returning visitor was pinned to a setting they never chose. That kind of
bug is invisible to the person who wrote it and permanent for everyone else.

Third, and the reason this project exists: **the honest number is usually less
flattering and more useful.** "98.9% traversable" would have made a better
screenshot. "488 points you cannot reach" is the finding.

## What's next

Ground-truth validation against a physical survey of one downtown — everything
here is computed from published data, and published data is exactly what this
project spent its time proving unreliable.
```

---

## Built with (25 tag limit — these are the real dependencies)

```
typescript
react
vite
tailwindcss
shadcn-ui
leaflet
python
canvas
openstreetmap
overpass-api
gtfs
census-api
american-community-survey
national-weather-service-api
open-meteo
supabase
postgresql
pglite
sqlite
sql.js
a-star
github-actions
vercel
github-pages
vitest
```

---

## Try it out links

```
https://passable-la.vercel.app
https://nayanvangala.github.io/nextstephacks/
https://github.com/NayanVangala/nextstephacks
```

---

## Media notes

**Video (top of page, under 5 min).** Suggested beat sheet:

1. Open on the LA map at 14:00. Set a wheelchair profile. Show the route bend
   away from the short exposed path. *(~40s)*
2. Drag the hour slider to 18:00. Same route, exposure drops. *(~20s)*
3. Switch to Reach, toggle heat emergency, watch the reachable set collapse and
   the cooling-centre count change. *(~40s)*
4. City audit on **Phoenix** — the 91% assumed-height figure printing out of
   register is the single clearest shot of the thesis. *(~40s)*
5. Index, ranked worst-connected first, and the block group that is 100%
   step-free and 0% connected. *(~40s)*
6. Close on the honest line: the income correlation that would not hold still.
   *(~30s)*

**Gallery (3:2, up to 15).** Highest-value stills, in order:

1. Landing hero — the halftone city
2. Route view with a computed path and the exposure strip
3. Phoenix City audit showing the misregistered 91%
4. Index table, ranked, with the stranded block group
5. The "no route" state naming the actual barrier
6. Mobile view — most of this audience is on a phone
