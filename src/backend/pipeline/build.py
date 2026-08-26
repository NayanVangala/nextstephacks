"""一城之囊,自取至書,一以貫之。

Run order matters: fetch must precede build_graph, and the manifest's
hour_buckets must align with the sun positions passed to assemble_pack —
the frontend indexes sun_exposure by bucket position.
"""

import argparse
import datetime
import json
from pathlib import Path

from pipeline.extract.overpass import fetch, load_elements
from pipeline.extract import buildings as bldg
from pipeline.extract import destinations as dest
from pipeline.extract import 公交
from pipeline.graph.build import build_graph
from pipeline.shade.sun import sun_position
from pipeline.emit.citypack import assemble_pack, write_pack

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
    suns = [sun_position(lat, lon, _SUMMER_DAY_OF_YEAR, h)
            for h in manifest["hour_buckets"]]

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
    out = ROOT / f"src/frontend/public/city-packs/{args.city}.json"
    write_pack(pack, str(out))
    print(f"wrote {out} — {len(nodes)} nodes, {len(pack['edges'])} edges")


if __name__ == "__main__":
    main()
