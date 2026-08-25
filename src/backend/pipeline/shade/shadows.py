"""投樓為影,而後問路之曝。

Model: a building of height H under a sun at altitude alpha throws a shadow of
length H / tan(alpha), in the direction opposite the sun's azimuth. The shadow
footprint is approximated as the convex hull of the building outline unioned
with that outline translated along the shadow vector — exact for convex
outlines, slightly generous for concave ones.

This is what makes midday shade legible: the orientation proxy alone says every
street is equally exposed when the sun is high, but a 70-storey tower still lays
a real shadow across a sidewalk at 14:00.
"""

import math

import numpy as np
from shapely.geometry import Polygon
from shapely.strtree import STRtree

_METRES_PER_DEG_LAT = 111320.0

# 日臨地平則影長趨無窮。截之,免生巨形而無益。
# Below this altitude the whole scene is effectively shaded anyway.
_MIN_ALTITUDE_DEG = 3.0
_MAX_SHADOW_M = 400.0


def shadow_offset_deg(height_m, sun, ref_lat):
    """回 (dlon, dlat):影之位移,以度計。"""
    alt = sun["altitude_deg"]
    if alt <= 0:
        return None
    length_m = min(height_m / math.tan(math.radians(max(alt, _MIN_ALTITUDE_DEG))),
                   _MAX_SHADOW_M)
    # 影背日而行:方位加一百八十度。
    theta = math.radians(sun["azimuth_deg"] + 180.0)
    east_m = length_m * math.sin(theta)
    north_m = length_m * math.cos(theta)
    dlat = north_m / _METRES_PER_DEG_LAT
    dlon = east_m / (_METRES_PER_DEG_LAT * math.cos(math.radians(ref_lat)))
    return dlon, dlat


def shadow_polygons(buildings, sun, ref_lat):
    """一時辰之諸影。日沒則空。"""
    if sun["altitude_deg"] <= 0:
        return []
    polys = []
    for b in buildings:
        offset = shadow_offset_deg(b["height_m"], sun, ref_lat)
        if offset is None:
            continue
        dlon, dlat = offset
        base = Polygon(b["ring"])
        if not base.is_valid:
            base = base.buffer(0)
        if base.is_empty:
            continue
        moved = Polygon([(x + dlon, y + dlat) for x, y in base.exterior.coords])
        hull = base.union(moved).convex_hull
        if not hull.is_empty:
            polys.append(hull)
    return polys


def sample_points(geometry, spacing_m=15.0, min_samples=3, max_samples=9):
    """沿一邊取數點。長者多取,短者少取,恆不少於三。"""
    (alon, alat), (blon, blat) = geometry[0], geometry[-1]
    # 粗估其長,但為定取樣之數,不必精。
    approx_m = math.hypot(
        (blon - alon) * _METRES_PER_DEG_LAT * math.cos(math.radians(alat)),
        (blat - alat) * _METRES_PER_DEG_LAT,
    )
    n = int(approx_m // spacing_m) + 1
    n = max(min_samples, min(max_samples, n))
    return [
        (alon + (blon - alon) * (i + 0.5) / n, alat + (blat - alat) * (i + 0.5) / n)
        for i in range(n)
    ]


def compute_edge_exposures(edges, buildings, sun_positions, ref_lat):
    """回每邊每時辰之曝率。

    Bulk-queries one STRtree per hour rather than per point: ~500k point-in-shadow
    tests across the LA extract, which is minutes if done one at a time.
    """
    from shapely import points as shapely_points

    per_edge_samples = [sample_points(e["geometry"]) for e in edges]
    flat, owner = [], []
    for idx, pts in enumerate(per_edge_samples):
        for p in pts:
            flat.append(p)
            owner.append(idx)
    owner = np.asarray(owner, dtype=np.int64)
    sample_geoms = shapely_points(np.asarray(flat, dtype=float))

    counts = np.bincount(owner, minlength=len(edges)).astype(float)
    exposures = [[0.0] * len(sun_positions) for _ in edges]

    for h, sun in enumerate(sun_positions):
        if sun["altitude_deg"] <= 0:
            continue  # 日沒,則無所曝
        polys = shadow_polygons(buildings, sun, ref_lat)
        if not polys:
            for i in range(len(edges)):
                exposures[i][h] = 1.0
            continue

        tree = STRtree(polys)
        hit_pairs = tree.query(sample_geoms, predicate="intersects")
        shaded_mask = np.zeros(len(flat), dtype=bool)
        if hit_pairs.size:
            shaded_mask[np.unique(hit_pairs[0])] = True

        shaded_per_edge = np.bincount(owner[shaded_mask], minlength=len(edges)).astype(float)
        exposed = 1.0 - (shaded_per_edge / counts)
        for i in range(len(edges)):
            exposures[i][h] = float(round(max(0.0, min(1.0, exposed[i])), 3))

    return exposures
