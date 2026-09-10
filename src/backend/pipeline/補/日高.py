"""補其囊之日高。

manifest 前此不載日之高度,故前端無以別「日已沒」與「此路全蔭」,
但以其曝之零推之。其果:十八時之日尚二十二度而路全在影中者,
器棄之如夜,反舉十六時之次者。量之於洛城五十六路,如此者二。

其高度可自其囊而算 —— 賴者三:其bbox之中、其區、其刻,皆在 manifest 之中。
故不必再求於 Overpass,亦不佔其限。三十八囊,數秒而畢。

Backfills manifest.sun_altitude_deg on packs built before the field existed.
Everything it needs — bbox centre, timezone, hour buckets — is already in the
manifest, so this never touches the network and does not spend Overpass budget.

其算取諸 shade/sun.py 之 諸日之位,與 build 所用者同一物,故不能歧。
"""

import gzip
import json
from pathlib import Path

from pipeline.shade.sun import 諸日之位


def 補一囊(囊):
    """回 (囊, 是否有所改)。已有其高者不動 —— 冪等,故可屢行之。"""
    m = 囊["manifest"]
    有 = m.get("sun_altitude_deg")
    if 有 and len(有) == len(m["hour_buckets"]):
        return 囊, False
    諸位, _ = 諸日之位(m)
    m["sun_altitude_deg"] = [round(s["altitude_deg"], 2) for s in 諸位]
    return 囊, True


def 補諸囊(囊之處):
    """歷其處之諸囊而補之。回其所改之名。"""
    囊之處 = Path(囊之處)
    改 = []
    for p in sorted(囊之處.glob("*.json.gz")):
        with gzip.open(p, "rt", encoding="utf-8") as f:
            囊 = json.load(f)
        囊, 動 = 補一囊(囊)
        if not 動:
            continue
        # 就地而書。壓之之等須與 emit 同,不然則其囊之重無故而異。
        with gzip.open(p, "wt", encoding="utf-8", compresslevel=9) as f:
            json.dump(囊, f, separators=(",", ":"))
        改.append(p.name)
    return 改
