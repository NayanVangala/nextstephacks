"""取 OSM 步道於 Overpass，存之於盤，免屢求於遠。"""

import hashlib
import json
import os

import requests


def build_query(bbox):
    """bbox 為 [minLon, minLat, maxLon, maxLat]；Overpass 則需 (S,W,N,E)。"""
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


# Overpass rejects the default python-requests User-Agent with HTTP 406.
# An identifying UA is also required by their usage policy.
_USER_AGENT = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"


def _cache_key(bbox):
    return hashlib.sha1(repr(bbox).encode()).hexdigest()[:16]


def fetch(bbox, url, cache_dir):
    """有快取則讀之，否則求諸網而後存。"""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{_cache_key(bbox)}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    resp = requests.post(url, data={"data": build_query(bbox)},
                         headers={"User-Agent": _USER_AGENT}, timeout=180)
    resp.raise_for_status()
    data = resp.json()
    with open(path, "w") as f:
        json.dump(data, f)
    return data


def load_elements(osm_json):
    return osm_json.get("elements", [])
