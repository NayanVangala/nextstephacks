"""一城之囊,自取至書,一以貫之。

Run order matters: fetch must precede build_graph, and the manifest's
hour_buckets must align with the sun positions passed to assemble_pack —
the frontend indexes sun_exposure by bucket position.
"""

import argparse
import datetime
import json
import zoneinfo
from pathlib import Path

from pipeline.extract.overpass import fetch, load_elements
from pipeline.extract import buildings as bldg
from pipeline.extract import destinations as dest
from pipeline.extract import 公交
from pipeline.extract import 停運
from pipeline.graph.build import build_graph
from pipeline.shade.sun import sun_position
from pipeline.emit.citypack import assemble_pack, write_pack
from pipeline.指數 import 區 as 指數之區, 算 as 指數之算

# parents: [0]=pipeline [1]=backend [2]=src [3]=repo root
ROOT = Path(__file__).parents[3]

_SUMMER_DAY_OF_YEAR = 200  # 取夏日之中者,以擬洛城暑候


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", required=True)
    args = ap.parse_args()

    manifest = json.loads((ROOT / f"config/cities/{args.city}.json").read_text())
    osm = fetch(manifest["bbox"], manifest["overpass_url"],
                str(ROOT / "src/backend/.cache"))
    nodes, raw = build_graph(load_elements(osm))

    lon = (manifest["bbox"][0] + manifest["bbox"][2]) / 2
    lat = (manifest["bbox"][1] + manifest["bbox"][3]) / 2
    # 鐘之時非日之時。城有偏於其子午線者,又有行夏令者,故必以其區之偏正之。
    # ORDER MATTERS: the offset must be taken for the same day the sun is being
    # modelled, not for today — otherwise a build run in winter would model a
    # summer day with a winter DST offset.
    tz = zoneinfo.ZoneInfo(manifest.get("timezone", "America/Los_Angeles"))
    _擬之日 = (datetime.date(2026, 1, 1)
               + datetime.timedelta(days=_SUMMER_DAY_OF_YEAR - 1))
    utc_off = (datetime.datetime.combine(_擬之日, datetime.time(12), tzinfo=tz)
               .utcoffset().total_seconds() / 3600.0)
    suns = [sun_position(lat, lon, _SUMMER_DAY_OF_YEAR, h, utc_off)
            for h in manifest["hour_buckets"]]
    print(f"日之位:{manifest['timezone']} UTC{utc_off:+.0f},"
          f"鐘 {manifest['hour_buckets'][4]}:00 = 日之 "
          f"{(manifest['hour_buckets'][4] - utc_off + lon / 15):.2f} 時")

    bldg_osm = bldg.fetch(manifest["bbox"], manifest["overpass_url"],
                          str(ROOT / "src/backend/.cache"))
    footprints = bldg.parse_buildings(load_elements(bldg_osm))
    assumed = sum(1 for b in footprints if b["height_assumed"])
    print(f"buildings: {len(footprints)} ({assumed} with assumed height)")

    curated_path = ROOT / f"config/cities/{args.city}-destinations.json"
    curated = []
    if curated_path.exists():
        curated = json.loads(curated_path.read_text())["destinations"]
    dest_osm = dest.fetch(manifest["bbox"], manifest["overpass_url"],
                          str(ROOT / "src/backend/.cache"))
    destinations = dest.parse_destinations(load_elements(dest_osm), curated)
    destinations = dest.snap_to_nodes(destinations, nodes)
    kinds = {}
    for d in destinations:
        kinds[d["kind"]] = kinds.get(d["kind"], 0) + 1
    print(f"destinations: {len(destinations)} {kinds}")

    # 公交之站。LA Metro 分 bus 與 rail 為二囊,故取一列之址。
    公交之站 = []
    有輪椅之欄 = False
    for 址 in manifest.get("gtfs_static_urls", []):
        try:
            zip之位元 = 公交.取(址, str(ROOT / "src/backend/.cache"))
            此囊之站 = 公交.解站(zip之位元, manifest["bbox"])
            有輪椅之欄 = 有輪椅之欄 or 公交.欄有輪椅乎(zip之位元)
            公交之站.extend(此囊之站)
            print(f"公交:{址.rsplit('/', 1)[-1]} 得站 {len(此囊之站)}")
        except Exception as 錯:
            # 取之不得則明告而續,不默然而闕,亦不敗其全
            print(f"警:GTFS 未取得 — {址}:{錯}")
    if 公交之站:
        公交之站 = dest.snap_to_nodes(公交之站, nodes)
        destinations.extend(公交之站)
    # 二 feed 之 stop_id 或相撞,故合而去其重
    前 = len(destinations)
    destinations = dest.去重(destinations)
    if len(destinations) != 前:
        print(f"去重:{前 - len(destinations)} 條重複之所已合")
    可乘 = sum(1 for s in 公交之站 if s["wheelchair_boarding"] == "yes")
    if 公交之站 and not 有輪椅之欄:
        print(f"發現:此 feed 全無 wheelchair_boarding 之欄 — "
              f"{len(公交之站)} 站之無障礙狀,published data 無從得知")

    pack = assemble_pack(manifest, nodes, raw, suns, buildings=footprints,
                         ref_lat=lat, destinations=destinations)
    pack["manifest"]["transit_stops_total"] = len(公交之站)
    pack["manifest"]["transit_stops_accessible"] = 可乘
    pack["manifest"]["transit_wheelchair_field_present"] = 有輪椅之欄
    pack["manifest"]["generated_at"] = (
        datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    # 補高之樓數入囊,俾界面得以告人。
    pack["manifest"]["buildings_total"] = len(footprints)
    pack["manifest"]["buildings_assumed_height"] = assumed
    # 停運之數。非「服務警示」—— LA Metro 之公開 API 無警示之端。
    停運之址 = manifest.get("canceled_service_url")
    if 停運之址:
        原 = 停運.取(停運之址, str(ROOT / "src/backend/.cache"))
        pack["canceled_service"] = 停運.解停運(原)
        pack["canceled_service_fetched_at"] = (
            datetime.datetime.now(datetime.timezone.utc).isoformat() if 原 else None
        )
        更 = pack["canceled_service"]["更新於"]
        print(f"停運:{pack['canceled_service']['總']} 班,"
              f"涉 {len(pack['canceled_service']['路'])} 路,其自稱更新於 {更}")
    else:
        pack["canceled_service"] = 停運.無停運之囊()
        pack["canceled_service_fetched_at"] = None

    # 指數:區區之通、蔭、連,並其入息。
    #
    # Failure here must NOT be silent. If Census is down the pack ships with
    # index=None and a stated reason, and the interface says "not computed for
    # this city" — it must never render an empty index as though every block
    # group scored zero. Same rule as the missing GTFS wheelchair column.
    try:
        區之f = 指數之區.取區界(manifest["bbox"], str(ROOT / "src/backend/.cache"))
        所需 = {f["properties"]["GEOID"] for f in 區之f}
        入息 = 指數之區.取入息(str(ROOT / "src/backend/.cache"), 所需)
        區之度 = 指數之算.算區之度(pack, 區之f, 入息)
        pack["index"] = 區之度
        pack["index_correlation"] = 指數之算.算相關(區之度)
        pack["index_unavailable_reason"] = None
        有錢 = sum(1 for r in 區之度 if r["入息"] is not None)
        無路 = sum(1 for r in 區之度 if r["通之率"] is None)
        print(f"指數:{len(區之度)} 區,{有錢} 有入息,{無路} 無路(其率為 None,非零)")
    except Exception as 錯:
        pack["index"] = None
        pack["index_correlation"] = None
        pack["index_unavailable_reason"] = f"{type(錯).__name__}: {錯}"
        print(f"警:指數未成 — {錯}")

    out = ROOT / f"src/frontend/public/city-packs/{args.city}.json"
    write_pack(pack, str(out))
    print(f"wrote {out} — {len(nodes)} nodes, {len(pack['edges'])} edges")


if __name__ == "__main__":
    main()
