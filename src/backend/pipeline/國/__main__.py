"""造國之表。

    python -m pipeline.國

囊既在盤,故不求於網 —— 此步可離網而行,亦不佔 Overpass 之限。
Reads the shipped packs off disk: no network, no Overpass budget, and it can be
re-run any time the packs change.
"""

import argparse
import json
from pathlib import Path

from pipeline.國.算 import 算諸城

# parents: [0]=國 [1]=pipeline [2]=backend [3]=src [4]=repo root
ROOT = Path(__file__).parents[4]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", default=str(ROOT / "src/frontend/public/city-packs"))
    ap.add_argument("--out", default=str(ROOT / "src/frontend/public/national.json"))
    args = ap.parse_args()

    表 = 算諸城(args.packs)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # 不壓 —— 三十八行,數兆而已,而其道上本已壓。壓之則前端須別為一路。
    # Left uncompressed: 38 rows is a few KB and the wire is already gzipped.
    out.write_text(json.dumps(表, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {out} — {len(表['cities'])} cities, {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
