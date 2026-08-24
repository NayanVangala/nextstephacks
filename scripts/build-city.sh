#!/usr/bin/env bash
# 造一城之囊。城名為引,預設洛城。
set -euo pipefail
cd "$(dirname "$0")/../src/backend"
python3 -m pipeline.build --city "${1:-la}"
