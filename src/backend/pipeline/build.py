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

    pack = assemble_pack(manifest, nodes, raw, suns)
    pack["manifest"]["generated_at"] = (
        datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    out = ROOT / f"src/frontend/public/city-packs/{args.city}.json"
    write_pack(pack, str(out))
    print(f"wrote {out} — {len(nodes)} nodes, {len(pack['edges'])} edges")


if __name__ == "__main__":
    main()
