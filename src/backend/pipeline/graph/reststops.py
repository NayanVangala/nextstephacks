"""標憩息之側。

A rest stop does not make a segment cheaper — it makes the sun on that segment
survivable, because you can pause in shade. Phase 4 models it as reduced
effective exposure, never as a cost discount, so the A* heuristic stays
admissible.
"""

from pipeline.geo import haversine_m

_DEFAULT_RADIUS_M = 20.0


def mark_rest_stop_edges(raw_edges, destinations, radius_m=_DEFAULT_RADIUS_M):
    """回每邊一旗:其中點之側有憩息之處否。"""
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
