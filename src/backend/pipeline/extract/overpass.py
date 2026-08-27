"""取 OSM 步道於 Overpass，存之於盤，免屢求於遠。"""

import hashlib
import json
import os
import time

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


# Overpass 之公器共用於眾,故限其求。退而再請,乃其用法所明命者。
# Retry ONLY on statuses that a later attempt could plausibly succeed on:
#   429 rate limited, 502/503/504 gateway or overload.
# A 400 means the query itself is malformed and every retry will fail the same
# way — retrying it burns the rate limit that the next real request needs.
_可再求之狀 = frozenset({429, 502, 503, 504})
_退之秒 = (5, 15, 45)


def 取而存(bbox, url, cache_dir, query, 鑰, timeout=240):
    """取諸 Overpass 而存之於盤。三者共用之,免其重。

    Cache-first: a hit never touches the network, which is what makes a failed
    multi-stage build cheap to resume — the stages that already succeeded are
    read from disk on the next run.
    """
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, f"{鑰}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)

    末誤 = None
    for 次 in range(len(_退之秒) + 1):
        try:
            resp = requests.post(url, data={"data": query},
                                 headers={"User-Agent": _USER_AGENT},
                                 timeout=timeout)
            if resp.status_code in _可再求之狀 and 次 < len(_退之秒):
                待 = _退之秒[次]
                print(f"警:Overpass 回 {resp.status_code},待 {待} 秒而再求"
                      f"({次 + 1}/{len(_退之秒)})")
                time.sleep(待)
                continue
            resp.raise_for_status()
            data = resp.json()
            with open(path, "w") as f:
                json.dump(data, f)
            return data
        except (requests.ConnectionError, requests.Timeout) as 誤:
            末誤 = 誤
            if 次 >= len(_退之秒):
                raise
            待 = _退之秒[次]
            print(f"警:Overpass 不可達({誤.__class__.__name__}),待 {待} 秒而再求"
                  f"({次 + 1}/{len(_退之秒)})")
            time.sleep(待)

    # 退盡而猶不得。明擲之,不可默然而回空 —— 空囊之城,其圖無路而人不知其故。
    raise RuntimeError(
        f"Overpass 屢求不得,已退 {len(_退之秒)} 次:{url}"
    ) from 末誤


def fetch(bbox, url, cache_dir):
    """有快取則讀之，否則求諸網而後存。"""
    return 取而存(bbox, url, cache_dir, build_query(bbox), _cache_key(bbox),
                  timeout=180)


def load_elements(osm_json):
    return osm_json.get("elements", [])
