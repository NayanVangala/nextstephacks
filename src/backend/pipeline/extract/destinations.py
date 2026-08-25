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
