"""取樓之形與高於 OSM,以為投影之本。

Height resolution order: explicit `height` tag, then `building:levels` x 3.2m,
then an assumed default. Assumed heights are FLAGGED, not silently blended —
the count travels into the manifest so the interface can disclose it.
"""

import hashlib
import json
import os

import requests

_USER_AGENT = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"

_METRES_PER_LEVEL = 3.2

# 洛城市中,樓高之中位數約七層。用戶擇此為闕者之補。
# Observed median in the Downtown LA extract: 7 levels.
DEFAULT_HEIGHT_M = 7 * _METRES_PER_LEVEL


def build_query(bbox):
    """bbox 為 [minLon, minLat, maxLon, maxLat];Overpass 則需 (S,W,N,E)。"""
    s, w, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    return (
        "[out:json][timeout:180];"
        f'way["building"]({s},{w},{n},{e});'
        "(._;>;);"
        "out body;"
    )


def _cache_key(bbox):
    return "bldg_" + hashlib.sha1(repr(bbox).encode()).hexdigest()[:16]


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


def parse_height_m(tags, default_height_m=DEFAULT_HEIGHT_M):
    """回 (height_m, assumed)。assumed 者,籤所無而補之者也。"""
    raw = tags.get("height")
    if raw is not None:
        try:
            # "45", "45 m", "45.5m" 皆可。呎者罕見,略之。
            return float(str(raw).lower().replace("m", "").strip().split()[0]), False
        except (ValueError, IndexError):
            pass

    levels = tags.get("building:levels")
    if levels is not None:
        try:
            return float(str(levels).split(";")[0]) * _METRES_PER_LEVEL, False
        except ValueError:
            pass

    return default_height_m, True


def parse_buildings(elements, default_height_m=DEFAULT_HEIGHT_M):
    """化 OSM 元素為 [{ring, height_m, height_assumed}]。環不足三點者棄之。"""
    coords = {e["id"]: (e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    out = []
    for el in elements:
        if el.get("type") != "way" or "building" not in el.get("tags", {}):
            continue
        ring = [coords[n] for n in el.get("nodes", []) if n in coords]
        if len(ring) < 3:
            continue
        height_m, assumed = parse_height_m(el["tags"], default_height_m)
        if height_m <= 0:
            continue
        out.append({"ring": ring, "height_m": height_m, "height_assumed": assumed})
    return out
