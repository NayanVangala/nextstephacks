"""取 LA Metro 之停運之數。

NOT service alerts. LA Metro's public API has no alerts endpoint — this is
canceled trips, which is a different thing, and the interface must say so.

The feed answers 200 with well-formed JSON and open CORS, which makes it look
live. It is not: as of this writing its own `last_updated` reads 2022-10-04.
That is precisely why `更新於` is carried through untouched and never defaulted
to "now" — the staleness check downstream is the whole point of shipping this.
"""

import json
import os

import requests

_使用者標識 = "passable/0.1 (NextStep Hacks 2026; +https://github.com/NayanVangala/nextstephacks)"


def 無停運之囊():
    """無源、或取之不得時,所置於囊者。"""
    return {"總": 0, "路": {}, "更新於": None}


def 取(url, cache_dir):
    """取其 JSON。敗則回 None,不舉錯 —— 一 feed 之敗不當壞全囊。"""
    os.makedirs(cache_dir, exist_ok=True)
    path = os.path.join(cache_dir, "canceled_service.json")
    try:
        resp = requests.get(url, headers={"User-Agent": _使用者標識}, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        with open(path, "w") as f:
            json.dump(data, f)
        return data
    except Exception:
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)  # 舊者猶勝於無,其時自著於資料中
        return None


def 解停運(資):
    """化其應為囊中之形。非字典者、闕者,皆歸於無停運之囊。"""
    if not isinstance(資, dict):
        return 無停運之囊()

    原路 = 資.get("canceled_trips_summary")
    路 = {}
    if isinstance(原路, dict):
        for k, v in 原路.items():
            if isinstance(v, bool) or not isinstance(v, int):
                continue  # 數非整者棄之,不強解
            路[str(k)] = v

    總 = 資.get("total_canceled_trips")
    if not isinstance(總, int) or isinstance(總, bool):
        總 = sum(路.values())

    更新於 = 資.get("last_updated")
    if not isinstance(更新於, str) or not 更新於.strip():
        更新於 = None  # 不知其時者,不得冒為新

    return {"總": 總, "路": 路, "更新於": 更新於}
