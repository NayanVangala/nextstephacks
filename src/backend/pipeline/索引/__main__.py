"""建索引之 CLI。

    python -m pipeline.索引 --city la
    python -m pipeline.索引 --city la --問 "somewhere with air conditioning"

chromadb 不與 pipeline 之常路同行 —— 其重且非造囊所必需,故別為一步。
"""

import argparse
import json
from pathlib import Path

from pipeline.索引.建索引 import 建索引, 問

# parents: [0]=索引 [1]=pipeline [2]=backend [3]=src [4]=repo root
ROOT = Path(__file__).parents[4]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--city", default="la")
    ap.add_argument("--問", dest="問之文", default=None)
    ap.add_argument("--n", type=int, default=5)
    args = ap.parse_args()

    存於 = str(ROOT / f"src/backend/.chroma/{args.city}")

    if args.問之文:
        for x in 問(存於, args.問之文, n=args.n):
            print(f"[{x['元'].get('類', '?')}] {x['文']}")
        return

    囊 = json.loads(
        (ROOT / f"src/frontend/public/city-packs/{args.city}.json").read_text()
    )
    n = 建索引(囊.get("destinations", []), [], 存於)
    print(f"索引 {n} 條於 {存於}")


if __name__ == "__main__":
    main()
