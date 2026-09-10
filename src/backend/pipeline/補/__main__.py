"""補囊之闕。

    python -m pipeline.補

離網而行,冪等 —— 已補者不再動。
"""

import argparse
from pathlib import Path

from pipeline.補.日高 import 補諸囊

# parents: [0]=補 [1]=pipeline [2]=backend [3]=src [4]=repo root
ROOT = Path(__file__).parents[4]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", default=str(ROOT / "src/frontend/public/city-packs"))
    args = ap.parse_args()
    改 = 補諸囊(args.packs)
    print(f"補其日高:{len(改)} 囊" + (f" — {', '.join(改)}" if 改 else "(皆已有之)"))


if __name__ == "__main__":
    main()
