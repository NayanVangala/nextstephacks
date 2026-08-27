"""取區之界與其入息。

區者,Census block group 也 —— 美國統計之最細單位,而有人口之資可繫。
取其界於 TIGERweb,取其入息於 ACS 之總表。

Why block groups and not a grid: a grid can only say "this cell is poorly
served." A block group can be joined to income, age and race, which is what
turns a coverage map into an environmental-justice finding.

Why the bulk summary file and not the ACS API: as of 2026 the API returns
HTTP 200 with an HTML "Missing Key" page for every vintage and geography level,
which is a failure shape that silently poisons a naive json() call. The
table-based summary file needs no key and carries the margin of error the API
call would have dropped.
"""

import json
import os
import time

import requests

_USER_AGENT = (
    "passable/0.1 (NextStep Hacks 2026; "
    "+https://github.com/NayanVangala/nextstephacks)"
)

_TIGERWEB = (
    "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/"
    "tigerWMS_Current/MapServer/10/query"
)
_ACS年 = 2023
_ACS表 = "b19013"  # 家戶入息之中位
_ACS址 = (
    f"https://www2.census.gov/programs-surveys/acs/summary_file/{_ACS年}/"
    f"table-based-SF/data/5YRData/acsdt5y{_ACS年}-{_ACS表}.dat"
)

# ACS 以此為闕。取之為數則得 -666666666 元之戶,荒矣。
# The ACS jam value for a suppressed or unavailable estimate. Treating it as a
# number yields a household earning negative 666 million dollars.
_闕之值 = {"-666666666", "-999999999", "", "null", "*", "-"}

_退之秒 = (5, 15, 45)


def _取而存(url, params, 存之路, 為文=False):
    """取而存之於盤。退讓之法同 overpass.取而存。"""
    if os.path.exists(存之路):
        with open(存之路, "rb" if 為文 else "r") as f:
            return f.read() if 為文 else json.load(f)

    末誤 = None
    for 次 in range(len(_退之秒) + 1):
        try:
            r = requests.get(url, params=params,
                             headers={"User-Agent": _USER_AGENT}, timeout=300)
            if r.status_code in (429, 502, 503, 504) and 次 < len(_退之秒):
                待 = _退之秒[次]
                print(f"警:Census 回 {r.status_code},待 {待} 秒而再求")
                time.sleep(待)
                continue
            r.raise_for_status()
            os.makedirs(os.path.dirname(存之路), exist_ok=True)
            if 為文:
                with open(存之路, "wb") as f:
                    f.write(r.content)
                return r.content
            # HTTP 200 而body為 HTML —— Census 之「Missing Key」即如是。
            # 若徑呼 json() 則擲於他處,其誤之狀掩其真因。
            if not r.text.lstrip().startswith(("[", "{")):
                raise RuntimeError(
                    f"Census 回 200 而非 JSON(首八十字:{r.text.lstrip()[:80]!r})"
                )
            data = r.json()
            os.makedirs(os.path.dirname(存之路), exist_ok=True)
            with open(存之路, "w") as f:
                json.dump(data, f)
            return data
        except (requests.ConnectionError, requests.Timeout) as 誤:
            末誤 = 誤
            if 次 >= len(_退之秒):
                raise
            time.sleep(_退之秒[次])
    raise RuntimeError(f"Census 屢求不得:{url}") from 末誤


def 取區界(bbox, cache_dir):
    """取 bbox 所涉之區界。回 GeoJSON 之 features。"""
    鑰 = f"bg_{bbox[0]:.4f}_{bbox[1]:.4f}_{bbox[2]:.4f}_{bbox[3]:.4f}.json"
    d = _取而存(_TIGERWEB, {
        "where": "1=1",
        "geometry": f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}",
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "spatialRel": "esriSpatialRelIntersects",
        "outFields": "GEOID,STATE,COUNTY,TRACT,BLKGRP",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }, os.path.join(cache_dir, 鑰))
    return d.get("features", [])


def 取入息(cache_dir, 所需之geoid):
    """回 {geoid: (中位, 誤)}。闕者不入,不以零充之。

    The margin of error is carried, not dropped. Block-group income estimates
    routinely carry margins above 40% of the estimate — a downtown Phoenix block
    group measured $71,721 +/- $33,092 — and publishing the point estimate alone
    would state as fact a number the source itself does not claim to know.
    """
    路 = os.path.join(cache_dir, f"acs_{_ACS表}_{_ACS年}.dat")
    位元 = _取而存(_ACS址, None, 路, 為文=True)

    出 = {}
    for line in 位元.decode("utf-8", "replace").splitlines()[1:]:
        parts = line.split("|")
        if len(parts) < 3:
            continue
        g = parts[0]
        # 1500000US 者,block group 之層也。
        if not g.startswith("1500000US"):
            continue
        geoid = g[len("1500000US"):]
        if geoid not in 所需之geoid:
            continue
        中位 = parts[1].strip()
        誤 = parts[2].strip()
        if 中位 in _闕之值:
            continue
        try:
            出[geoid] = (int(float(中位)),
                         None if 誤 in _闕之值 else int(float(誤)))
        except ValueError:
            continue
    return 出
