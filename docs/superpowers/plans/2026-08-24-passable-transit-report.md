# Passable 之三:公交、報告、實時警示(第五至七階)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三事:一曰納 GTFS 之站於囊,而知其可乘輪椅與否;二曰立「報告」之view,以城之全局告市政者;三曰取實時之警,而明告其陳舊。

**Architecture:** pipeline 增 GTFS 之取者,解 zip 中 `stops.txt`,擇 bbox 之內者,繫於圖之節,並入 destinations。前端增純函數之度量module,算網之可通率、蔭之率、無階可至之所、信之分佈、熱陷之段;報告之view 但陳其數。實時之警先探其可否於瀏覽器直取,不可則用建時之快照,並標其時。

**Tech Stack:** Python 3.11(zipfile、csv 皆在標準庫,不增依賴);TypeScript + React + MapLibre;vitest、pytest。

**Spec:** `docs/superpowers/specs/2026-08-23-passable-design.md`

**Predecessors:**
- `docs/superpowers/plans/2026-08-23-passable-mvp.md`(第零至二階,已成)
- `docs/superpowers/plans/2026-08-24-passable-reach.md`(第三至四階,已成)

## 全局之約(Global Constraints)

- **`edgeCost >= edge.length_m` 之不變式不可破。** A\* 之啟發式為直線米數,唯乘數皆 `>= 1`、加項皆 `>= 0` 時方可容。報告之算不得改此。
- **熱負荷與 cost 二者不可混。** cost 定其序,熱負荷定其限。
- **`wheelchair_boarding` 三值:`"yes" | "no" | "unknown"`,而 `unknown` 為常。** GTFS 之 `0` 與空皆為 unknown,`1` 為 yes,`2` 為 no。不得以闕為安。
- **實時之警若不能取,必明告其為建時之快照,並著其時。** 陳者不得冒為新。
- **報告所陳,必著其信之分佈。** 若某度量賴於未標之籤,則並陳其未標之數。
- **界面之文用英文**(見 CLAUDE.md);註、識別子、commit 用中文。
- **每 task 既成即 commit。** 直在 `main`,此倉不用分支。

---

## 檔之布局(File Structure)

```
src/backend/pipeline/
└── extract/公交.py              # GTFS zip -> 站之錄

src/shared/schema/
└── city-pack.schema.json        # + transit_stop kind, + wheelchair_boarding

src/frontend/src/
├── report/度量.ts                # 純函數:可通率、蔭率、無階可至、信之分佈
├── report/熱陷.ts                # 取樣介數 × 曝 = 熱陷之段
├── data/警示.ts                  # 實時之警:運行時取,敗則歸快照
├── components/度量卡.tsx
└── views/ReportView.tsx

tests/backend/test_公交.py
tests/frontend/度量.test.ts, 熱陷.test.ts, 警示.test.ts, reportimpact.test.ts
```

---

## Task 1:GTFS 靜態之取者

**Files:**
- Create: `src/backend/pipeline/extract/公交.py`
- Test: `tests/backend/test_公交.py`

**Interfaces:**
- Produces:
  - `解輪椅登車(值) -> str` — GTFS `wheelchair_boarding` 之碼化為 `"yes"|"no"|"unknown"`
  - `解站(zip之位元, bbox) -> list[dict]` — 回 `{"id","name","lon","lat","kind","backup_power","source","wheelchair_boarding"}`,`kind` 恆為 `"transit_stop"`
  - `取(url, cache_dir) -> bytes` — 取 GTFS zip,存之於盤

GTFS 之 `stops.txt` 常帶 BOM,故以 `utf-8-sig` 解之。標準庫足用,不增依賴。

- [ ] **Step 1: 先寫必敗之試**

`tests/backend/test_公交.py`:
```python
import io
import zipfile

import pytest

from pipeline.extract.公交 import 解輪椅登車, 解站


def _造zip(stops_csv, 帶BOM=False):
    """造一 GTFS zip 於記憶中,以供試。"""
    buf = io.BytesIO()
    內容 = ("﻿" if 帶BOM else "") + stops_csv
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("stops.txt", 內容)
    return buf.getvalue()


_頭 = "stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding\n"
_內 = (
    "1,Union Station,34.0560,-118.2360,1\n"
    "2,Pershing Square,34.0486,-118.2517,2\n"
    "3,Unknown Stop,34.0500,-118.2500,\n"
    "4,Far Away,40.0000,-100.0000,1\n"
)
_BBOX = [-118.2673, 34.0389, -118.2329, 34.0623]


def test_碼一為可乘():
    assert 解輪椅登車("1") == "yes"


def test_碼二為不可乘():
    assert 解輪椅登車("2") == "no"


def test_碼零為未知():
    assert 解輪椅登車("0") == "unknown"


def test_空為未知而非可乘():
    # 闕者不得冒為安
    assert 解輪椅登車("") == "unknown"
    assert 解輪椅登車(None) == "unknown"


def test_異碼為未知():
    assert 解輪椅登車("9") == "unknown"


def test_解站得bbox之內者():
    站 = 解站(_造zip(_頭 + _內), _BBOX)
    名 = {s["name"] for s in 站}
    assert "Union Station" in 名
    assert "Far Away" not in 名


def test_站之類恆為transit_stop():
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert s["kind"] == "transit_stop"


def test_站帶輪椅之狀():
    站 = {s["name"]: s for s in 解站(_造zip(_頭 + _內), _BBOX)}
    assert 站["Union Station"]["wheelchair_boarding"] == "yes"
    assert 站["Pershing Square"]["wheelchair_boarding"] == "no"
    assert 站["Unknown Stop"]["wheelchair_boarding"] == "unknown"


def test_站之備電恆為未知():
    # GTFS 無備電之欄,故不得妄言
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert s["backup_power"] == "unknown"


def test_站必著其所自():
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert "GTFS" in s["source"]


def test_BOM之首不亂其欄():
    站 = 解站(_造zip(_頭 + _內, 帶BOM=True), _BBOX)
    assert len(站) == 3


def test_闕經緯者棄之():
    壞 = _頭 + "5,Broken,,,1\n"
    assert 解站(_造zip(壞), _BBOX) == []


def test_無stops檔則舉錯():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("agency.txt", "agency_id\n1\n")
    with pytest.raises(KeyError):
        解站(buf.getvalue(), _BBOX)
```

- [ ] **Step 2: 運試以驗其敗**

Run: `python3 -m pytest tests/backend/test_公交.py -q`
Expected: FAIL — `ModuleNotFoundError: pipeline.extract.公交`

- [ ] **Step 3: 寫其實作**

`src/backend/pipeline/extract/公交.py`:
```python
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
```

- [ ] **Step 4: 運試以驗其成**

Run: `python3 -m pytest tests/backend/test_公交.py -q`
Expected: PASS(13 試)

- [ ] **Step 5: Commit**

```bash
git add src/backend/pipeline/extract/公交.py tests/backend/test_公交.py
git commit -m "feat: 取 GTFS 之站,並判其可乘輪椅與否"
```

---

## Task 2:擴 schema 與 types,接入 pipeline

**Files:**
- Modify: `src/shared/schema/city-pack.schema.json`
- Modify: `src/backend/pipeline/build.py`
- Modify: `config/cities/la.json`
- Modify: `src/frontend/src/types.ts`
- Test: `tests/backend/test_emit.py`(增)

**Interfaces:**
- `DestinationKind` 增 `"transit_stop"`
- `Destination` 增 `wheelchair_boarding?: "yes" | "no" | "unknown"`
- manifest 增 `gtfs_static_url`(可闕)

GTFS 之 url 置於 manifest,不硬寫於碼中。首行之前必先驗其可取。

- [ ] **Step 1: 先驗 GTFS 之 url 可取否**

Run:
```bash
curl -sIL "https://gitlab.com/LACMTA/gtfs_bus/-/raw/master/gtfs_bus.zip" | head -20
```
若得 200 且 `content-type` 為 zip,則用之。若否,則於 LA Metro 之開發者頁尋其今之址,записать 於 manifest。**不得妄寫未驗之址。**

若竟無可用之址,則置 `gtfs_static_url: null`,pipeline 跳之而印一告,報告之公交度量則陳「未取」。

- [ ] **Step 2: 擴 schema**

於 `properties.destinations.items.properties.kind` 之 enum 增 `"transit_stop"`:
```json
"kind": {
  "type": "string",
  "enum": ["cooling_center", "evacuation_center", "rest_stop", "transit_stop"]
}
```

於同 `properties` 增:
```json
"wheelchair_boarding": { "type": "string", "enum": ["yes", "no", "unknown"] }
```

於 `properties.manifest.properties` 增:
```json
"gtfs_static_url": { "type": ["string", "null"] },
"transit_stops_total": { "type": "integer" },
"transit_stops_accessible": { "type": "integer" }
```

- [ ] **Step 3: 增 manifest 之欄**

於 `config/cities/la.json` 增(址以 Step 1 所驗者為準):
```json
"gtfs_static_url": "<Step 1 所驗之址,或 null>"
```

- [ ] **Step 4: 先寫必敗之試**

於 `tests/backend/test_emit.py` 之末增:
```python
def test_公交之站可入囊而不亂schema():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    站 = [{"id": "gtfs-1", "name": "Union Station", "lon": 0.0, "lat": 0.0005,
           "kind": "transit_stop", "backup_power": "unknown",
           "source": "GTFS stops.txt", "wheelchair_boarding": "yes", "node_id": 2}]
    pack = assemble_pack(_manifest(), nodes, raw, suns, destinations=站)
    pack["manifest"]["generated_at"] = "2026-08-24T00:00:00Z"
    jsonschema.validate(pack, SCHEMA)
    assert pack["destinations"][0]["wheelchair_boarding"] == "yes"


def test_公交之站不作憩息之所():
    # transit_stop 非 rest_stop,不得減其曝
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    站 = [{"id": "gtfs-1", "name": "S", "lon": 0.0, "lat": 0.0005,
           "kind": "transit_stop", "backup_power": "unknown",
           "source": "GTFS", "wheelchair_boarding": "yes"}]
    pack = assemble_pack(_manifest(), nodes, raw, suns, destinations=站)
    assert pack["edges"][0]["near_rest_stop"] is False
```

- [ ] **Step 5: 運試以驗其敗**

Run: `python3 -m pytest tests/backend/test_emit.py -q`
Expected: FAIL — schema 之 enum 未含 `transit_stop`

- [ ] **Step 6: 接入 `build.py`**

於 import 之處增:
```python
from pipeline.extract import 公交
```

於 destinations 既成之後、`assemble_pack` 之前增:
```python
    公交之址 = manifest.get("gtfs_static_url")
    if 公交之址:
        try:
            zip之位元 = 公交.取(公交之址, str(ROOT / "src/backend/.cache"))
            站 = 公交.解站(zip之位元, manifest["bbox"])
            站 = dest.snap_to_nodes(站, nodes)
            destinations.extend(站)
            可乘 = sum(1 for s in 站 if s["wheelchair_boarding"] == "yes")
            print(f"公交之站:{len(站)}({可乘} 可乘輪椅)")
        except Exception as 錯:
            # 取之不得則明告而續,不默然而闕
            print(f"警:GTFS 未取得,公交之度量將闕 — {錯}")
            站 = []
    else:
        print("警:manifest 無 gtfs_static_url,公交之度量將闕")
        站 = []
```

於 manifest 之數增:
```python
    pack["manifest"]["transit_stops_total"] = len(站)
    pack["manifest"]["transit_stops_accessible"] = sum(
        1 for s in 站 if s["wheelchair_boarding"] == "yes"
    )
```

- [ ] **Step 7: 擴 TypeScript 之型**

於 `src/frontend/src/types.ts`:
```typescript
export type DestinationKind =
  | "cooling_center"
  | "evacuation_center"
  | "rest_stop"
  | "transit_stop";
```

於 `Destination` 增:
```typescript
  /** GTFS 之 wheelchair_boarding。闕者為 unknown,不得作可乘。 */
  wheelchair_boarding?: "yes" | "no" | "unknown";
```

於 `Manifest` 增:
```typescript
  gtfs_static_url?: string | null;
  transit_stops_total?: number;
  transit_stops_accessible?: number;
```

- [ ] **Step 8: 重造囊而驗之**

Run: `./scripts/build-city.sh la`
Expected: 印公交之站數;若址不可取,則印其警而不中止。

Run: `python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build`
Expected: 皆綠。

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: 納 GTFS 之站於城囊,並記其可乘輪椅之數"
```

---

## Task 3:報告之度量(純函數)

**Files:**
- Create: `src/frontend/src/report/度量.ts`
- Test: `tests/frontend/度量.test.ts`

**Interfaces:**
- `可通之率(pack, flags) -> {可通米: number, 總米: number, 率: number}`
- `蔭之率(pack, flags, hourIdx, 門檻=0.5) -> {蔭米: number, 可通米: number, 率: number}` — 但計可通之段
- `無階可至者(pack, flags, 半徑米=400) -> Destination[]` — 其最近之可通節逾半徑者
- `信之分佈(pack) -> Record<"high"|"medium"|"low", {數: number, 米: number}>`

`無階可至者` 之義:所之最近節須在該 profile 之最大連通分支內,且其距不逾半徑。二者有一不合,則謂之無階可至 —— 此正報告所欲陳者。

- [ ] **Step 1: 先寫必敗之試**

`tests/frontend/度量.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  可通之率, 蔭之率, 無階可至者, 信之分佈,
} from "../../src/frontend/src/report/度量";
import type { CityPack, ProfileFlags, Edge, Destination } from "../../src/frontend/src/types";

const 無: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};
const 輪椅: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

function 造邊(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [1], confidence: "high", near_rest_stop: false,
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

// 四節成鏈:1-2-3-4。2-3 之段為階,輪椅不可通。
function 造囊(dests: Destination[] = []): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [
      { id: 1, lon: 0.0, lat: 0.0 }, { id: 2, lon: 0.001, lat: 0.0 },
      { id: 3, lon: 0.002, lat: 0.0 }, { id: 4, lon: 0.003, lat: 0.0 },
    ],
    edges: [
      造邊(10, 1, 2, { sun_exposure: [0.1] }),
      造邊(11, 2, 3, {
        is_steps: true, confidence: "medium",
        traversable: {
          wheelchair: false, blind_low_vision: true, heat_sensitive: true, none: true,
        },
      }),
      造邊(12, 3, 4, { sun_exposure: [0.9], confidence: "low" }),
    ],
    destinations: dests,
  };
}

describe("可通之率", () => {
  it("無 profile 則全網可通", () => {
    const r = 可通之率(造囊(), 無);
    expect(r.率).toBeCloseTo(1, 6);
    expect(r.總米).toBeCloseTo(300, 6);
  });

  it("輪椅則階之段不計", () => {
    const r = 可通之率(造囊(), 輪椅);
    expect(r.可通米).toBeCloseTo(200, 6);
    expect(r.率).toBeCloseTo(2 / 3, 6);
  });
});

describe("蔭之率", () => {
  it("但計可通之段", () => {
    // 輪椅可通者為 10(曝0.1,蔭)與 12(曝0.9,曝)
    const r = 蔭之率(造囊(), 輪椅, 0, 0.5);
    expect(r.可通米).toBeCloseTo(200, 6);
    expect(r.蔭米).toBeCloseTo(100, 6);
    expect(r.率).toBeCloseTo(0.5, 6);
  });

  it("曝闕者作全曝,不作蔭", () => {
    const p = 造囊();
    p.edges.forEach((e) => { e.sun_exposure = null; });
    expect(蔭之率(p, 無, 0, 0.5).蔭米).toBe(0);
  });
});

describe("無階可至者", () => {
  const 所 = (lon: number, lat: number, node_id: number | null): Destination => ({
    id: "d", name: "Library", lon, lat, kind: "cooling_center",
    backup_power: "unknown", source: "s", node_id,
  });

  it("近於可通之節者不列", () => {
    const p = 造囊([所(0.0, 0.0, 1)]);
    expect(無階可至者(p, 輪椅, 400)).toHaveLength(0);
  });

  it("其節在輪椅不可及之分支者列之", () => {
    // 節 3、4 於輪椅而言已與 1、2 斷,故置所於 4 之側
    const p = 造囊([所(0.003, 0.0, 4)]);
    const 出 = 無階可至者(p, 輪椅, 50);
    expect(出).toHaveLength(1);
  });

  it("雖在同分支而距逾半徑者亦列之", () => {
    const p = 造囊([所(0.5, 0.5, 1)]);  // 去節甚遠
    expect(無階可至者(p, 無, 400)).toHaveLength(1);
  });

  it("節之id為null者列之", () => {
    const p = 造囊([所(0.0, 0.0, null)]);
    expect(無階可至者(p, 無, 400)).toHaveLength(1);
  });
});

describe("信之分佈", () => {
  it("按段之數與米分之", () => {
    const r = 信之分佈(造囊());
    expect(r.high.數).toBe(1);
    expect(r.medium.數).toBe(1);
    expect(r.low.數).toBe(1);
    expect(r.high.米).toBeCloseTo(100, 6);
  });
});
```

- [ ] **Step 2: 運試以驗其敗**

Run: `cd src/frontend && npx vitest run 度量`
Expected: FAIL — 無此 module

- [ ] **Step 3: 寫其實作**

`src/frontend/src/report/度量.ts`:
```typescript
import type { CityPack, Destination, ProfileFlags } from "../types";
import { buildAdjacency, edgeAllowed, largestComponent } from "../routing/graph";
import { haversineM } from "../routing/geo";

/** 網之可通率,以米計,不以段數計 —— 段有長短,數之則誣。 */
export function 可通之率(pack: CityPack, flags: ProfileFlags) {
  let 可通米 = 0;
  let 總米 = 0;
  for (const e of pack.edges) {
    總米 += e.length_m;
    if (edgeAllowed(e, flags)) 可通米 += e.length_m;
  }
  return { 可通米, 總米, 率: 總米 === 0 ? 0 : 可通米 / 總米 };
}

/**
 * 可通之網中,蔭者幾何。
 *
 * 分母為可通之米,非全網之米 —— 問者所欲知者,乃「吾所能行之路,有幾蔭」。
 * 曝闕者以全曝論,故不入蔭。
 */
export function 蔭之率(
  pack: CityPack,
  flags: ProfileFlags,
  hourIdx: number,
  門檻 = 0.5,
) {
  let 蔭米 = 0;
  let 可通米 = 0;
  for (const e of pack.edges) {
    if (!edgeAllowed(e, flags)) continue;
    可通米 += e.length_m;
    const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
    if (曝 < 門檻) 蔭米 += e.length_m;
  }
  return { 蔭米, 可通米, 率: 可通米 === 0 ? 0 : 蔭米 / 可通米 };
}

/**
 * 無階可至之所。
 *
 * A destination counts as approachable only if a node in THIS profile's largest
 * connected component lies within the radius. Both halves matter: a node that is
 * near but stranded is not an approach, and a connected node that is 2km away is
 * not an approach either.
 */
export function 無階可至者(
  pack: CityPack,
  flags: ProfileFlags,
  半徑米 = 400,
): Destination[] {
  const 分支 = largestComponent(buildAdjacency(pack, flags));
  const 節 = pack.nodes.filter((n) => 分支.has(n.id));
  const 出: Destination[] = [];

  for (const d of pack.destinations) {
    let 最近 = Infinity;
    for (const n of 節) {
      const 距 = haversineM(d.lon, d.lat, n.lon, n.lat);
      if (距 < 最近) 最近 = 距;
    }
    if (最近 > 半徑米) 出.push(d);
  }
  return 出;
}

/** 信之分佈:各等之段數與米數。未標者多寡,於此可見。 */
export function 信之分佈(pack: CityPack) {
  const 出 = {
    high: { 數: 0, 米: 0 },
    medium: { 數: 0, 米: 0 },
    low: { 數: 0, 米: 0 },
  };
  for (const e of pack.edges) {
    出[e.confidence].數 += 1;
    出[e.confidence].米 += e.length_m;
  }
  return 出;
}
```

- [ ] **Step 4: 運試以驗其成**

Run: `cd src/frontend && npx vitest run 度量`
Expected: PASS(9 試)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/report/度量.ts tests/frontend/度量.test.ts
git commit -m "feat: 立報告之度量 —— 可通率、蔭率、無階可至、信之分佈"
```

---

## Task 4:熱陷之段(取樣介數 × 曝)

**Files:**
- Create: `src/frontend/src/report/熱陷.ts`
- Test: `tests/frontend/熱陷.test.ts`

**Interfaces:**
- `造亂數(種子: number) -> () => number` — 定種之偽亂數,俾試可重
- `熱陷(pack, flags, hourIdx, {取樣數, 取幾, 種子}) -> {edge, 介數, 曝, 分}[]`

介數之精算為 O(VE),萬節之圖不可為。故取樣 K 節,各行一 Dijkstra,計各段之用次,以為介數之近似。分 = 介數 × 曝。**取樣既為近似,則必於界面明告其為近似,不得冒為精。**

- [ ] **Step 1: 先寫必敗之試**

`tests/frontend/熱陷.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { 熱陷, 造亂數 } from "../../src/frontend/src/report/熱陷";
import type { CityPack, ProfileFlags, Edge } from "../../src/frontend/src/types";

const 無: ProfileFlags = {
  wheelchair: false, blind_low_vision: false, heat_sensitive: false,
};

function 造邊(id: number, from: number, to: number, over: Partial<Edge> = {}): Edge {
  return {
    id, from, to, length_m: 100, geometry: [[0, 0], [0, 0]],
    is_steps: false, step_count: null, kerb: null, wheelchair_tag: null,
    incline_pct: null, surface: null, width_m: null, tactile_paving: null,
    is_crossing: false, crossing_signalized: null,
    sun_exposure: [0], confidence: "high", near_rest_stop: false,
    traversable: {
      wheelchair: true, blind_low_vision: true, heat_sensitive: true, none: true,
    },
    ...over,
  };
}

/**
 * 啞鈴之形:左三節相連,右三節相連,唯 3-4 一段通之。
 * 3-4 者,必經之橋也,其介數當最高。使之全曝,則當為熱陷之首。
 */
function 造啞鈴(): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [1, 2, 3, 4, 5, 6].map((id) => ({
      id, lon: 0.001 * id, lat: 0.0,
    })),
    edges: [
      造邊(10, 1, 2), 造邊(11, 2, 3), 造邊(12, 1, 3),
      造邊(13, 3, 4, { sun_exposure: [1] }),   // 橋,全曝
      造邊(14, 4, 5), 造邊(15, 5, 6), 造邊(16, 4, 6),
    ],
    destinations: [],
  };
}

describe("造亂數", () => {
  it("同種則同列,俾試可重", () => {
    const a = 造亂數(42);
    const b = 造亂數(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("異種則異列", () => {
    const a = 造亂數(1);
    const b = 造亂數(2);
    expect(a()).not.toEqual(b());
  });

  it("其值在零一之間", () => {
    const r = 造亂數(7);
    for (let i = 0; i < 50; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("熱陷", () => {
  it("必經而全曝之橋列於首", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 3, 種子: 42 });
    expect(出[0].edge.id).toBe(13);
  });

  it("全蔭之段其分為零", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 7, 種子: 42 });
    const 蔭者 = 出.filter((x) => x.edge.id !== 13);
    for (const x of 蔭者) expect(x.分).toBe(0);
  });

  it("取幾則回幾", () => {
    expect(熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 2, 種子: 42 })).toHaveLength(2);
  });

  it("其序自高而下", () => {
    const 出 = 熱陷(造啞鈴(), 無, 0, { 取樣數: 6, 取幾: 7, 種子: 42 });
    for (let i = 1; i < 出.length; i++) {
      expect(出[i - 1].分).toBeGreaterThanOrEqual(出[i].分);
    }
  });

  it("同種則同果", () => {
    const a = 熱陷(造啞鈴(), 無, 0, { 取樣數: 4, 取幾: 3, 種子: 9 });
    const b = 熱陷(造啞鈴(), 無, 0, { 取樣數: 4, 取幾: 3, 種子: 9 });
    expect(a.map((x) => x.edge.id)).toEqual(b.map((x) => x.edge.id));
  });

  it("網空則回空,不舉錯", () => {
    const p = 造啞鈴();
    p.edges = [];
    expect(熱陷(p, 無, 0, { 取樣數: 4, 取幾: 3, 種子: 1 })).toEqual([]);
  });
});
```

- [ ] **Step 2: 運試以驗其敗**

Run: `cd src/frontend && npx vitest run 熱陷`
Expected: FAIL — 無此 module

- [ ] **Step 3: 寫其實作**

`src/frontend/src/report/熱陷.ts`:
```typescript
import type { CityPack, Edge, ProfileFlags } from "../types";
import { buildAdjacency, largestComponent } from "../routing/graph";
import { MinHeap } from "../routing/heap";

/**
 * 定種之偽亂數(LCG)。
 *
 * Math.random 不可用於此:報告若每次刷新而異,則不可信、不可校、不可試。
 */
export function 造亂數(種子: number): () => number {
  let s = 種子 >>> 0;
  return () => {
    // Numerical Recipes 之常數
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface 熱陷之項 {
  edge: Edge;
  介數: number;
  曝: number;
  分: number;
}

/**
 * 熱陷之段:人所必經,而日所必曝者。
 *
 * 介數之精算為 O(VE),萬節之圖不可為,故取樣 K 節各行一 Dijkstra,
 * 計段之用次以為近似。此為近似,界面必明告之。
 */
export function 熱陷(
  pack: CityPack,
  flags: ProfileFlags,
  hourIdx: number,
  { 取樣數 = 50, 取幾 = 10, 種子 = 1 } = {},
): 熱陷之項[] {
  const adj = buildAdjacency(pack, flags);
  if (adj.size === 0) return [];

  const 分支 = largestComponent(adj);
  const 節列 = [...分支];
  if (節列.length === 0) return [];

  const 亂 = 造亂數(種子);
  const 用次 = new Map<number, number>();

  const k = Math.min(取樣數, 節列.length);
  for (let i = 0; i < k; i++) {
    const 始 = 節列[Math.floor(亂() * 節列.length)];
    const 距 = new Map<number, number>([[始, 0]]);
    const 由 = new Map<number, Edge>();
    const 定 = new Set<number>();
    const 堆 = new MinHeap<number>();
    堆.push(0, 始);

    while (堆.size > 0) {
      const 今 = 堆.pop()!;
      if (定.has(今)) continue;
      定.add(今);
      for (const e of adj.get(今) ?? []) {
        const 次 = e.from === 今 ? e.to : e.from;
        if (定.has(次)) continue;
        const d = (距.get(今) ?? Infinity) + e.length_m;
        if (d < (距.get(次) ?? Infinity)) {
          距.set(次, d);
          由.set(次, e);
          堆.push(d, 次);
        }
      }
    }

    // 樹中每段之用次加一 —— 介數之近似
    for (const e of 由.values()) {
      用次.set(e.id, (用次.get(e.id) ?? 0) + 1);
    }
  }

  const 出: 熱陷之項[] = [];
  for (const e of pack.edges) {
    const 介數 = 用次.get(e.id) ?? 0;
    const 曝 = e.sun_exposure ? e.sun_exposure[hourIdx] ?? 1 : 1;
    出.push({ edge: e, 介數, 曝, 分: 介數 * 曝 });
  }
  出.sort((a, b) => b.分 - a.分);
  return 出.slice(0, 取幾);
}
```

- [ ] **Step 4: 運試以驗其成**

Run: `cd src/frontend && npx vitest run 熱陷`
Expected: PASS(9 試)

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/report/熱陷.ts tests/frontend/熱陷.test.ts
git commit -m "feat: 以取樣介數乘日曝,得熱陷之段"
```

---

## Task 5:報告之 view

**Files:**
- Create: `src/frontend/src/components/度量卡.tsx`
- Create: `src/frontend/src/views/ReportView.tsx`
- Modify: `src/frontend/src/App.tsx`(增第三 tab)

**Interfaces:**
- 消 Task 3、4 之函數。
- 報告之算約半秒,故必有 loading 之狀,不可默然而僵。

報告乃市政者所讀之物,故其文必直,其數必著其所自,其近似必明言。

- [ ] **Step 1: 寫 `度量卡`**

`src/frontend/src/components/度量卡.tsx`:
```tsx
export function 度量卡({
  題, 數, 註,
}: {
  題: string;
  數: string;
  註?: string;
}) {
  return (
    <div style={{
      border: "1px solid var(--line)", borderRadius: 8,
      padding: "0.85rem 1rem", background: "var(--panel)",
    }}>
      <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{題}</div>
      <div style={{
        fontSize: "1.6rem", fontWeight: 600, fontVariantNumeric: "tabular-nums",
      }}>
        {數}
      </div>
      {註 && (
        <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{註}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 寫 `ReportView`**

`src/frontend/src/views/ReportView.tsx`:
```tsx
import { useEffect, useMemo, useState } from "react";
import type { CityPack, ProfileFlags } from "../types";
import { loadCityPack } from "../data/loadCityPack";
import { 可通之率, 蔭之率, 無階可至者, 信之分佈 } from "../report/度量";
import { 熱陷 } from "../report/熱陷";
import { ProfilePicker } from "../components/ProfilePicker";
import { TimeSlider } from "../components/TimeSlider";
import { 度量卡 } from "../components/度量卡";

const 午後 = 4; // hour_buckets[4] === 14:00

const 輪椅之身: ProfileFlags = {
  wheelchair: true, blind_low_vision: false, heat_sensitive: false,
};

const 百分 = (x: number) => `${(x * 100).toFixed(1)}%`;
const 公里 = (m: number) => `${(m / 1000).toFixed(1)} km`;

export function ReportView({ cityId = "la" }: { cityId?: string }) {
  const [pack, setPack] = useState<CityPack | null>(null);
  const [flags, setFlags] = useState<ProfileFlags>(輪椅之身);
  const [hourIdx, setHourIdx] = useState(午後);
  const [算中, set算中] = useState(false);

  useEffect(() => { loadCityPack(cityId).then(setPack); }, [cityId]);

  // 熱陷之算約半秒,故先示 loading 而後算,免界面僵而不應
  useEffect(() => {
    if (!pack) return;
    set算中(true);
    const t = setTimeout(() => set算中(false), 0);
    return () => clearTimeout(t);
  }, [pack, flags, hourIdx]);

  const 報 = useMemo(() => {
    if (!pack) return null;
    return {
      通: 可通之率(pack, flags),
      蔭: 蔭之率(pack, flags, hourIdx),
      無階: 無階可至者(pack, flags, 400),
      信: 信之分佈(pack),
      陷: 熱陷(pack, flags, hourIdx, { 取樣數: 40, 取幾: 8, 種子: 20260824 }),
    };
  }, [pack, flags, hourIdx]);

  if (!pack) return <p style={{ padding: 24 }}>Loading city data…</p>;
  if (!報) return null;

  const 納涼無階 = 報.無階.filter((d) => d.kind === "cooling_center");
  const 公交無階 = 報.無階.filter((d) => d.kind === "transit_stop");
  const 總米 = 報.信.high.米 + 報.信.medium.米 + 報.信.low.米;

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "1.5rem 1rem", lineHeight: 1.5 }}>
      <header>
        <h1 style={{ marginBottom: "0.25rem" }}>Report — {pack.manifest.name}</h1>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          Where this city fails its disabled residents, measured on{" "}
          {pack.edges.length.toLocaleString()} sidewalk segments.
        </p>
      </header>

      <ProfilePicker flags={flags} onChange={setFlags} />
      <TimeSlider
        buckets={pack.manifest.hour_buckets}
        index={hourIdx}
        onChange={setHourIdx}
      />

      <section aria-label="Network summary" style={{
        display: "grid", gap: "0.75rem", marginTop: "1.5rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}>
        <度量卡
          題="Network traversable"
          數={百分(報.通.率)}
          註={`${公里(報.通.可通米)} of ${公里(報.通.總米)}`}
        />
        <度量卡
          題={`Shaded at ${pack.manifest.hour_buckets[hourIdx]}:00`}
          數={百分(報.蔭.率)}
          註={`${公里(報.蔭.蔭米)} of traversable network`}
        />
        <度量卡
          題="Cooling centres with no step-free approach"
          數={String(納涼無階.length)}
          註="within 400 m of a connected sidewalk"
        />
        <度量卡
          題="Transit stops with no step-free approach"
          數={String(公交無階.length)}
          註={
            pack.manifest.transit_stops_total
              ? `of ${pack.manifest.transit_stops_total} stops`
              : "GTFS not loaded"
          }
        />
      </section>

      <section aria-label="Data confidence" style={{ marginTop: "2rem" }}>
        <h2>Data confidence</h2>
        <p>
          Accessibility attributes come from OpenStreetMap. A segment is only{" "}
          <strong>high</strong> confidence when a wheelchair, kerb, or steps tag was
          explicitly present. Everything else was inferred, and an inferred segment is
          not a verified-passable one.
        </p>
        <ul>
          {(["high", "medium", "low"] as const).map((k) => (
            <li key={k}>
              <strong>{k}</strong>: {報.信[k].數.toLocaleString()} segments,{" "}
              {公里(報.信[k].米)} ({百分(總米 === 0 ? 0 : 報.信[k].米 / 總米)})
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Heat traps" style={{ marginTop: "2rem" }}>
        <h2>Heat traps</h2>
        <p>
          Segments that carry the most foot traffic <em>and</em> the most sun at{" "}
          {pack.manifest.hour_buckets[hourIdx]}:00. Traffic is estimated by sampling
          shortest paths, so these are approximate rankings, not measured counts.
        </p>
        {算中 ? <p role="status">Computing…</p> : (
          <ol>
            {報.陷.map((x) => (
              <li key={x.edge.id}>
                {Math.round(x.edge.length_m)} m · exposure {(x.曝 * 100).toFixed(0)}%
                {x.edge.confidence !== "high" && ` · ${x.edge.confidence} confidence`}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Paratransit" style={{ marginTop: "2rem" }}>
        <h2>Paratransit</h2>
        <p>
          {pack.manifest.name}'s ADA paratransit operator requires advance booking. A
          wildfire or a heat emergency does not give that much notice, so the transit
          mode many disabled residents depend on is structurally unavailable in exactly
          the emergency that would require it. This is a policy finding, not a routing
          one — no scheduling API exists to model it.
        </p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: 增第三 tab 於 `App.tsx`**

改 view 之型為 `"route" | "reach" | "report"`,並增一 button:
```tsx
        <button
          type="button"
          onClick={() => setView("report")}
          aria-current={view === "report" ? "page" : undefined}
          style={view === "report" ? { background: "var(--panel)", fontWeight: 600 } : undefined}
        >
          Report
        </button>
```
並於末改為:
```tsx
      {view === "route" && <RouteView cityId="la" />}
      {view === "reach" && <ReachView cityId="la" />}
      {view === "report" && <ReportView cityId="la" />}
```

- [ ] **Step 4: 於瀏覽器驗之**

Run: `npm run dev --prefix src/frontend`,擇 Report 之 tab。
Expected: 四卡有數;易 profile 為輪椅,則可通率降;移時辰之滑塊,則蔭率隨之而變;熱陷之列有段。

- [ ] **Step 5: 全驗**

Run:
```bash
python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build
```
Expected: 皆綠。

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: 立報告之view —— 網之可通、蔭、無階可至、信之分佈、熱陷"
```

---

## Task 6:實時警示之探,與建時之快照

**Files:**
- Create: `src/backend/pipeline/extract/警示.py`
- Modify: `src/backend/pipeline/build.py`
- Modify: `src/shared/schema/city-pack.schema.json`
- Test: `tests/backend/test_警示.py`

**Interfaces:**
- `解警示(protobuf之位元) -> list[dict]` — 回 `{"id","header","description","stop_ids":[...],"severity"}`
- pipeline 於造囊時取之,存於 `pack.alerts`,並記 `alerts_fetched_at`

**先探而後作。** GTFS-Realtime 為 protobuf,而各agency多不設 CORS 之頭,則瀏覽器直取必敗。故:

1. 建時取之,存於囊 —— 此為必可成者,且合「離網可用」之旨。
2. 運行時再取,成則用之,敗則歸於快照(Task 7)。

- [ ] **Step 1: 探其址與 CORS**

Run:
```bash
# 一探其址可取否
curl -sI "<LA Metro GTFS-RT alerts URL>" | head -10
# 二探其 CORS 之頭
curl -sI -H "Origin: http://localhost:5173" "<同上>" | grep -i "access-control-allow-origin" || echo "無 CORS 之頭 —— 瀏覽器不可直取"
```

記其果於此 task 之下。若無 CORS,則 Task 7 之運行時取必敗而歸快照 —— 此為預期,非缺陷,然必於界面明告。

若竟無可用之址,則置 `alerts` 為空、`alerts_fetched_at` 為 null,而界面陳「無警示之源」。

- [ ] **Step 2: 先寫必敗之試**

`tests/backend/test_警示.py`:
```python
import pytest

from pipeline.extract.警示 import 解警示, 無警示之囊


def test_空之位元回空而不舉錯():
    assert 解警示(b"") == []


def test_壞之位元回空而不舉錯():
    # 實時之源時或返 HTML 之錯頁;不可因之而中止全 pipeline
    assert 解警示(b"<html>503</html>") == []


def test_無警示之囊其時為null():
    囊 = 無警示之囊()
    assert 囊["alerts"] == []
    assert 囊["alerts_fetched_at"] is None
```

若 Step 1 得一真 protobuf 之樣本,則存之於 `tests/backend/fixtures/alerts.pb`,並增:
```python
def test_真樣本可解():
    from pathlib import Path
    樣 = Path(__file__).parent / "fixtures/alerts.pb"
    if not 樣.exists():
        pytest.skip("無真樣本 —— Step 1 未得其址")
    出 = 解警示(樣.read_bytes())
    assert isinstance(出, list)
    for a in 出:
        assert "id" in a and "header" in a
```

- [ ] **Step 3: 運試以驗其敗**

Run: `python3 -m pytest tests/backend/test_警示.py -q`
Expected: FAIL — 無此 module

- [ ] **Step 4: 寫其實作**

`src/backend/pipeline/extract/警示.py`:
```python
"""取 GTFS-Realtime 之服務警示。

Failure here must never abort the build: a realtime feed that returns an HTML
error page, times out, or changes format is an expected operating condition, not
a reason to lose the whole city pack. Every failure path returns an empty list
and the caller records that alerts are absent.
"""

import hashlib
import os

import requests

_使用者標識 = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"


def 無警示之囊():
    """無源、或取之不得時,所置於囊者。"""
    return {"alerts": [], "alerts_fetched_at": None}


def 取(url, cache_dir):
    """取 protobuf 之位元。敗則回 None,不舉錯。"""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(
        cache_dir, "alerts_" + hashlib.sha1(url.encode()).hexdigest()[:16] + ".pb"
    )
    try:
        resp = requests.get(url, headers={"User-Agent": _使用者標識}, timeout=60)
        resp.raise_for_status()
        with open(path, "wb") as f:
            f.write(resp.content)
        return resp.content
    except Exception:
        if os.path.exists(path):
            with open(path, "rb") as f:
                return f.read()  # 舊者猶勝於無,然其時必著於囊
        return None


def 解警示(位元):
    """解 protobuf。無 gtfs-realtime-bindings 則回空,不中止。"""
    if not 位元:
        return []
    try:
        from google.transit import gtfs_realtime_pb2
    except ImportError:
        # 依賴未備 —— 明告於 build 之出,而不敗其全
        return []
    try:
        餵 = gtfs_realtime_pb2.FeedMessage()
        餵.ParseFromString(位元)
    except Exception:
        return []  # 非 protobuf(多為 HTML 之錯頁)

    出 = []
    for 項 in 餵.entity:
        if not 項.HasField("alert"):
            continue
        警 = 項.alert
        頭 = 警.header_text.translation[0].text if 警.header_text.translation else ""
        述 = 警.description_text.translation[0].text if 警.description_text.translation else ""
        站 = [e.stop_id for e in 警.informed_entity if e.stop_id]
        出.append({
            "id": 項.id,
            "header": 頭,
            "description": 述,
            "stop_ids": 站,
            "severity": str(警.severity_level) if 警.HasField("severity_level") else "unknown",
        })
    return 出
```

於 `src/backend/pyproject.toml` 之 dependencies 增 `"gtfs-realtime-bindings>=1.0"`。若 Step 1 判其址不可用,則不增此依賴,而 `解警示` 恆回空。

- [ ] **Step 5: 擴 schema**

於 `properties` 增:
```json
"alerts": {
  "type": "array",
  "items": {
    "type": "object",
    "required": ["id", "header"],
    "properties": {
      "id": { "type": "string" },
      "header": { "type": "string" },
      "description": { "type": "string" },
      "stop_ids": { "type": "array", "items": { "type": "string" } },
      "severity": { "type": "string" }
    }
  }
},
"alerts_fetched_at": { "type": ["string", "null"] }
```

- [ ] **Step 6: 接入 `build.py`**

```python
    from pipeline.extract import 警示 as 警
    警之址 = manifest.get("gtfs_rt_alerts_url")
    if 警之址:
        位元 = 警.取(警之址, str(ROOT / "src/backend/.cache"))
        pack["alerts"] = 警.解警示(位元)
        pack["alerts_fetched_at"] = (
            datetime.datetime.now(datetime.timezone.utc).isoformat() if 位元 else None
        )
        print(f"警示:{len(pack['alerts'])}")
    else:
        pack.update(警.無警示之囊())
        print("警:manifest 無 gtfs_rt_alerts_url,警示將闕")
```

- [ ] **Step 7: 運試而後造囊**

Run: `python3 -m pytest tests/backend/test_警示.py -q && ./scripts/build-city.sh la`
Expected: 試綠;造囊之出印警示之數(或其闕之告)。

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 取 GTFS-Realtime 之服務警示,存於城囊而記其時"
```

---

## Task 7:運行時取警,敗則歸快照,並著其陳

**Files:**
- Create: `src/frontend/src/data/警示.ts`
- Modify: `src/frontend/src/views/ReachView.tsx`(陳警示於destination之側)
- Test: `tests/frontend/警示.test.ts`

**Interfaces:**
- `警之狀(pack, 今) -> {alerts, 取於, 陳否, 陳幾時}`
- `取實時之警(url, fetchFn?) -> alerts | null` — 敗則 null(CORS 之敗亦在其中)

此正 §13 所謂之降級:先試運行時,敗則歸建時之快照,而**必著其時與其陳**。陳者不得冒為新。

- [ ] **Step 1: 先寫必敗之試**

`tests/frontend/警示.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { 警之狀, 取實時之警, 陳之限之毫秒 } from "../../src/frontend/src/data/警示";
import type { CityPack } from "../../src/frontend/src/types";

function 造囊(alerts: unknown[] = [], 取於: string | null = null): CityPack {
  return {
    manifest: {
      id: "t", name: "T", bbox: [0, 0, 1, 1], timezone: "UTC",
      hour_buckets: [12], generated_at: "x",
    },
    nodes: [], edges: [], destinations: [],
    alerts, alerts_fetched_at: 取於,
  } as unknown as CityPack;
}

const 今 = new Date("2026-08-24T12:00:00Z").getTime();

describe("警之狀", () => {
  it("無源則陳其無,而不作已無警示", () => {
    const s = 警之狀(造囊([], null), 今);
    expect(s.取於).toBeNull();
    expect(s.陳否).toBe(true);  // 未知之時當作陳,不得作新
  });

  it("新取者不為陳", () => {
    const s = 警之狀(造囊([], "2026-08-24T11:55:00Z"), 今);
    expect(s.陳否).toBe(false);
    expect(s.陳幾時).toBeLessThan(陳之限之毫秒);
  });

  it("逾限者為陳", () => {
    const s = 警之狀(造囊([], "2026-08-23T12:00:00Z"), 今);
    expect(s.陳否).toBe(true);
  });

  it("警示之列原樣傳之", () => {
    const a = [{ id: "1", header: "Elevator out", description: "", stop_ids: [], severity: "WARNING" }];
    expect(警之狀(造囊(a, "2026-08-24T11:59:00Z"), 今).alerts).toEqual(a);
  });

  it("時之文不可解者作陳", () => {
    expect(警之狀(造囊([], "not-a-date"), 今).陳否).toBe(true);
  });
});

describe("取實時之警", () => {
  it("CORS 之敗回 null 而不舉錯", async () => {
    const 敗 = async () => { throw new TypeError("Failed to fetch"); };
    expect(await 取實時之警("http://x", 敗 as never)).toBeNull();
  });

  it("非二百之應回 null", async () => {
    const 壞 = async () => ({ ok: false, status: 503 }) as Response;
    expect(await 取實時之警("http://x", 壞)).toBeNull();
  });

  it("得 JSON 之警則回之", async () => {
    const 好 = async () => ({
      ok: true,
      json: async () => ({ alerts: [{ id: "9", header: "Detour" }] }),
    }) as Response;
    const 出 = await 取實時之警("http://x", 好);
    expect(出).toHaveLength(1);
    expect(出![0].id).toBe("9");
  });
});
```

- [ ] **Step 2: 運試以驗其敗**

Run: `cd src/frontend && npx vitest run 警示`
Expected: FAIL — 無此 module

- [ ] **Step 3: 寫其實作**

`src/frontend/src/data/警示.ts`:
```typescript
import type { CityPack } from "../types";

export interface 警示 {
  id: string;
  header: string;
  description?: string;
  stop_ids?: string[];
  severity?: string;
}

/** 逾一時辰則謂之陳。 */
export const 陳之限之毫秒 = 60 * 60 * 1000;

/**
 * 警示之狀,並判其陳否。
 *
 * An unknown or unparseable timestamp counts as STALE. Treating unknown
 * freshness as fresh would let an hours-old service alert read as current —
 * the same class of error as letting an untagged sidewalk read as passable.
 */
export function 警之狀(pack: CityPack, 今 = Date.now()) {
  const p = pack as unknown as { alerts?: 警示[]; alerts_fetched_at?: string | null };
  const alerts = p.alerts ?? [];
  const 取於 = p.alerts_fetched_at ?? null;

  if (!取於) return { alerts, 取於: null, 陳否: true, 陳幾時: Infinity };
  const t = Date.parse(取於);
  if (Number.isNaN(t)) return { alerts, 取於, 陳否: true, 陳幾時: Infinity };

  const 陳幾時 = 今 - t;
  return { alerts, 取於, 陳否: 陳幾時 > 陳之限之毫秒, 陳幾時 };
}

type 取者 = (url: string) => Promise<Response>;

/**
 * 試取運行時之警。
 *
 * Most transit agencies serve GTFS-Realtime without CORS headers, so a browser
 * fetch throws TypeError before any response arrives. That is an expected
 * outcome, not an error worth surfacing — the caller falls back to the
 * build-time snapshot and labels it as such.
 */
export async function 取實時之警(
  url: string,
  fetchFn: 取者 = (u) => fetch(u),
): Promise<警示[] | null> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : data?.alerts;
    return Array.isArray(list) ? (list as 警示[]) : null;
  } catch {
    return null;  // CORS、網斷、非 JSON,皆歸於此
  }
}
```

- [ ] **Step 4: 陳警示於 `ReachView`**

於 import 增:
```tsx
import { 警之狀 } from "../data/警示";
```

於 destination 之 section 之前增:
```tsx
      {(() => {
        const 狀 = 警之狀(pack);
        if (狀.alerts.length === 0 && !狀.取於) return null;
        return (
          <section aria-label="Service alerts" style={{ marginTop: "1.5rem" }}>
            <h2>Service alerts</h2>
            <p role="note" style={{ color: "#92400e" }}>
              {狀.取於
                ? `Captured ${new Date(狀.取於).toLocaleString()}${狀.陳否 ? " — this snapshot is stale, check the operator for current alerts." : "."}`
                : "No live alert feed is available for this city."}
            </p>
            <ul>
              {狀.alerts.slice(0, 10).map((a) => (
                <li key={a.id}>
                  <strong>{a.header}</strong>
                  {a.description ? ` — ${a.description}` : ""}
                </li>
              ))}
            </ul>
          </section>
        );
      })()}
```

- [ ] **Step 5: 運試以驗其成**

Run: `cd src/frontend && npx vitest run 警示`
Expected: PASS(8 試)

- [ ] **Step 6: 全驗而後 commit**

Run:
```bash
python3 -m pytest tests/backend -q && cd src/frontend && npx vitest run && npm run build
```

```bash
git add -A
git commit -m "feat: 運行時取警,敗則歸建時之快照,並明著其陳"
```

---

## 第七階之驗(Phase 7 Checkpoint)

至此,Passable 有三view:Route 答日常之問,Reach 答急難之問,Report 以城之全局告市政者。三者共一圖、一模型。所餘者,第二城與精修而已(Plan 4)。

---

## 自校(Self-Review)

**Spec 之覆蓋(第五至七階):**
- §9 GTFS static、`wheelchair_boarding` → Task 1、2。✓
- §9 GTFS-Realtime,但取服務警示,不取車位與行程 → Task 6。✓
- §9 paratransit 為 manifest 之常數,非 integration → Task 5 之 Paratransit section。✓
- §8 Report:可通率、蔭率、無階可至之納涼所、無階可至之公交站、熱陷、信之分佈 → Task 3、4、5。✓
- §13 GTFS-RT 不可取則歸靜態並著其陳 → Task 7。✓
- §12 近似必明告 → Task 5 之熱陷section明言「approximate rankings, not measured counts」。✓
- 延於 Plan 4 者:第二城(§11)、a11y 之精修(§12)、deploy、video。✓

**無placeholder:** 無 "TBD"、無 "handle appropriately"、無 "同 Task N"。唯 Task 2 Step 1、Task 6 Step 1 為**探**,其址須先驗而後填 —— 此非 placeholder,乃拒絕妄寫未驗之址。

**型之相合:**
- `Destination.kind` 之 enum 於 schema(Task 2 Step 2)、TS(Task 2 Step 7)、Python(Task 1 之 `"transit_stop"`)三處相合。
- `wheelchair_boarding` 三值於 Python `解輪椅登車`、schema、TS 三處相合。
- `熱陷(pack, flags, hourIdx, opts)` 定於 Task 4,用於 Task 5,其名與參數同。
- `可通之率`、`蔭之率`、`無階可至者`、`信之分佈` 定於 Task 3,皆用於 Task 5,回值之欄相合。
- `警之狀(pack, 今)` 定於 Task 7,用於 Task 7 Step 4,同。
- `度量卡({題, 數, 註})` 定於 Task 5 Step 1,用於同 task Step 2。✓

**不變式:** 此plan無一處改 `edgeCost`,故 `cost >= length_m` 不動。熱陷之算用 `length_m` 為權,與 cost 無涉。✓
