# Passable

**Heat-safe, step-free walking routes across 38 US downtowns.**

**Live: <https://nayanvangala.github.io/nextstephacks/>**

Google Maps will route a wheelchair user down a flight of stairs, and it will
route someone with MS across four blocks of unshaded asphalt at 2pm in Phoenix.
Not because the data is wrong — because neither obstacle is modelled at all.
Passable models both, and says out loud when it doesn't know.

| | |
|---|---|
| **Cities** | 38 US downtowns |
| **Sidewalk segments** | 477,618 |
| **Destinations** | 13,349 — 537 cooling centres, 706 evacuation centres, 298 transit stops, 11,808 shaded rest stops |
| **Runtime** | Entirely in the browser. No API key, no server, no account |
| **Tests** | 261 frontend, 125 backend |

<details>
<summary>All 38 cities</summary>

Los Angeles, Seattle, Phoenix, New York, Chicago, San Francisco, Miami, Bellevue, Green Bay, Nashville, Memphis, St. Louis, Dallas, Houston, Orlando, Boston, Atlanta, Austin, Baltimore, Charlotte, Cleveland, Columbus, Denver, Detroit, Indianapolis, Kansas City, Las Vegas, Milwaukee, Minneapolis, New Orleans, Philadelphia, Pittsburgh, Portland, Sacramento, Salt Lake City, San Antonio, San Diego, Washington, DC

</details>

---

## What makes it different

Most map interfaces project false confidence. A clean line on a map reads as
*trust me* — and for a person deciding whether a route is survivable, an
unearned "trust me" is the most dangerous thing the interface can say.

So the design rule here is: **unknown must never render as known.**

- Inferred data is drawn with a visible **hatch texture**. Where the route
  strip looks noisy, the tool is telling you it's guessing.
- OpenStreetMap accessibility tags are sparse. An untagged segment is shown as
  *untagged*, never as *verified passable*.
- Phoenix's shade model is **91.4% inferred** — 2,541 of its 2,781 building
  footprints have no height in OSM. The app says so, in the footer, with the
  number. That's the finding, not a defect to hide.
- When there is no route, the app explains **why**: it re-runs the search with
  no accessibility constraints, and reports whether the barrier was your
  profile or a genuine gap in the map.

---

## The four views

| View | The question it answers |
|---|---|
| **Route** | What is my safest path right now? |
| **Reach** | What can I get to — and in a heat emergency, can I get out? |
| **Report** | Where does this city fail its disabled residents? |
| **Index** | Which neighbourhoods are cut off? |

**Route** does A* over the sidewalk graph with cost weighted by sun exposure,
grade, kerb height, surface, and crossing signalisation, filtered by profile.
It will also tell you that walking the same path at 18:00 instead of 14:00 cuts
your sun exposure by 60% — same route, later.

**Reach** floods outward from a point under a budget (distance, or exposure)
and shows what's inside it. Toggle a hazard scenario — heat emergency, transit
outage — and watch the reachable set collapse. "Power-dependent" mode surfaces
which destinations have backup generation.

**Report** measures the network: traversable share, shaded share, how many
connected points are cut off for a given profile, how many destinations have no
step-free approach at all.

**Index** joins the sidewalk network to Census block groups and ACS income
data. It measures the correlation between neighbourhood income and sidewalk
accessibility **every build**, so the result is reported rather than assumed —
including when the correlation is weak.

---

## Try it

```bash
npm ci --prefix src/frontend && npm run dev --prefix src/frontend
```

Open <http://localhost:5173>. Nothing else is required — no keys, no backend,
no database. City packs ship in `src/frontend/public/city-packs/`.

---

## How it works

```
OpenStreetMap ─┐
Building       ├─► Python pipeline ─► city pack (JSON) ─► browser ─► A*
  footprints  ─┤     (offline)          2.5-16 MB            (client-side)
GTFS feeds    ─┤
Census / ACS  ─┘
```

**The pipeline is offline.** It runs once per city and writes a self-contained
pack: nodes, edges, per-edge accessibility attributes, an 8-bucket sun-exposure
array, and destinations. Everything after that happens in the browser.

**Shade is computed, not measured.** Building footprints are extruded to their
tagged height (or an assumed 7 storeys, counted and disclosed), and their
shadows are projected against the sun's position for each hour bucket. Solar
position accounts for the longitude-to-solar-time correction — skipping it
costs up to 1.35 hours of error in Miami, which is the difference between
"shaded" and "full sun".

**Live data raises a floor, never a ceiling.** A National Weather Service heat
warning raises the modelled heat severity to at least 0.85 and shrinks the
reach budget. If the thermometer already says worse, the thermometer wins. An
alert can only ever make the tool more cautious — it can never tell you that
you can reach somewhere it would otherwise have ruled out.

### The invariant

```
edgeCost >= edge.length_m,  always.
```

The A* heuristic is raw haversine metres. It's admissible only while every cost
term is additive-on-top of physical length. Violating this doesn't crash
anything and doesn't fail a test — A* still returns *a* path, just not the
shortest one. No error, no warning, and nobody can tell from the screen. Guard
it accordingly.

### Local knowledge

Routing improves from two sources beyond the static pack:

- **Public alerts** — NWS active heat warnings, fetched keylessly.
- **Ground reports** — people report what only locals know: a construction
  detour, a blocked kerb cut, a broken lift. Reports decay with a 90-day
  half-life and are weighted with harmonic damping, so ten reports of the same
  thing count for more than one but nowhere near ten.

Reporting is **anonymous by default and always will be**. An accessibility tool
that demands an account before you can say "this curb cut is broken" has failed
the person standing at the broken curb cut. Signing in buys attribution — which
is the only path by which an `unverified` report becomes a `confirmed` one.

---

## Data sources

| Source | Used for | Key required |
|---|---|---|
| OpenStreetMap (Overpass) | Sidewalks, kerbs, steps, surface, buildings | No |
| GTFS feeds | Transit stops, wheelchair boarding, outages | No |
| NWS alerts API | Live heat warnings | No |
| Census TIGERweb + ACS | Block-group geometry and income | No |
| Open-Meteo | Current temperature | No |
| Supabase | Optional shared reports + OAuth | Optional |

Every runtime source is keyless. That's deliberate: this has to run from a
static GitHub Pages deploy with no secrets, and it has to keep working when
someone forks it.

---

## Optional: shared reports and sign-in

Without a Supabase project the app is fully functional — reports save to local
SQLite in the browser, and no sign-in button renders anywhere. A sign-in button
with nothing behind it is worse than no sign-in button.

To enable shared reports, see **[docs/auth-setup.md](docs/auth-setup.md)** and
copy `src/frontend/.env.local.example` to `.env.local`.

---

## Tests

```bash
npm test --prefix src/frontend    # 261 tests
pytest tests/backend              # 125 tests
```

Database migrations run against a real in-process Postgres (PGlite) on every
frontend test run. That test exists because of what it found: two RLS policy
names one character apart (`报事_众可插` vs `报事_众可增`) meant a `drop policy`
silently missed its target. **Postgres OR-combines RLS policies for the same
command**, so the surviving permissive policy won — and a signed-in user could
file reports attributed to any other account. Reading the SQL could not catch
it. Running it did, in under a minute.

The geometry tests assert cross-language agreement between the TypeScript
haversine (the A* heuristic) and the Python one (which computes the edge lengths
the heuristic must not exceed) against full-precision reference values. If the
two implementations ever drift, admissibility breaks silently.

---

## What is deliberately not built

- **No UPDATE policy on reports.** If a report could be edited after being
  confirmed, its text could be swapped and the confirmation would vouch for
  something nobody read.
- **No profile, avatar, or display name.** Only the auth uuid, which resolves
  solely inside `auth.users`. A reader sees "attributed" or "anonymous", never
  who.
- **Nothing is gated behind sign-in.**
- **No WebGL.** The map is Leaflet on a 2D canvas. A vector map that renders a
  blank page on a machine without WebGL2 is not an accessibility tool.

---

## Limits

Passable is a wayfinding aid, **not medical guidance**. Follow your own clinical
advice about heat.

Shade is modelled from building footprints, not measured — trees, awnings, and
bus shelters are not in it. Accessibility attributes come from OpenStreetMap and
are incomplete everywhere. Coverage is downtown cores, not whole metros. Street
names are not carried in the city packs, so blocking segments are described by
their attributes rather than by address.

---

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · shadcn/ui · Motion · Leaflet ·
sql.js · Python 3.11 (Shapely, pyproj) · Supabase (optional) · GitHub Pages
