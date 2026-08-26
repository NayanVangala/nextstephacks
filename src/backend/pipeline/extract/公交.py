"""取 GTFS 之站,而知其可乘輪椅與否。

GTFS wheelchair_boarding: 0 or empty = unknown, 1 = accessible, 2 = not
accessible. Empty MUST map to unknown, never to accessible — treating an
unfilled field as safe is exactly the failure this project refuses.
"""

import csv
import hashlib
import io
import os
import zipfile

import requests

_使用者標識 = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"

_碼表 = {"1": "yes", "2": "no", "0": "unknown"}


def 解輪椅登車(值):
    """碼化為三言。闕、空、異碼皆為未知。"""
    if 值 is None:
        return "unknown"
    return _碼表.get(str(值).strip(), "unknown")


def _快取名(url):
    return "gtfs_" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".zip"


def 取(url, cache_dir):
    """取 GTFS zip。有快取則讀之,否則求諸網而後存。"""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, _快取名(url))
    if os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    resp = requests.get(url, headers={"User-Agent": _使用者標識}, timeout=300)
    resp.raise_for_status()
    with open(path, "wb") as f:
        f.write(resp.content)
    return resp.content


def 解站(zip之位元, bbox):
    """解 stops.txt,擇 bbox 之內者。bbox 為 [minLon, minLat, maxLon, maxLat]。"""
    minLon, minLat, maxLon, maxLat = bbox
    出 = []
    with zipfile.ZipFile(io.BytesIO(zip之位元)) as z:
        # 無 stops.txt 則非 GTFS,舉 KeyError 而止,不默然回空
        with z.open("stops.txt") as f:
            # utf-8-sig:GTFS 之檔常帶 BOM,不去之則首欄之名不合
            讀者 = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            for 列 in 讀者:
                try:
                    lat = float(列["stop_lat"])
                    lon = float(列["stop_lon"])
                except (TypeError, ValueError):
                    continue  # 闕經緯者棄之
                if not (minLon <= lon <= maxLon and minLat <= lat <= maxLat):
                    continue
                出.append({
                    "id": f"gtfs-{列['stop_id']}",
                    "name": 列.get("stop_name") or f"Stop {列['stop_id']}",
                    "lon": lon,
                    "lat": lat,
                    "kind": "transit_stop",
                    "backup_power": "unknown",  # GTFS 無此欄
                    "source": f"GTFS stops.txt wheelchair_boarding={列.get('wheelchair_boarding', '')!r}",
                    "wheelchair_boarding": 解輪椅登車(列.get("wheelchair_boarding")),
                })
    return 出
