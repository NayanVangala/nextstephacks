"""三十八城之表。

其城各有其囊,而囊各自足 —— 故前此每數皆一城之數,無可相較者。
README 舉三十八城,而器但示其一;其「五十八成之樓無其高」云者,
乃離線算之而書於文,非其器所能自陳。此表補之。

── 何以在此而不在前端 ────────────────────────────────────────────────

三十八囊,生文二百五十一兆。一頁而盡載之,必崩(loadCityPack 之註已量之,
故其記止於二)。故必先算而後遺,算之於此。

── 何以不再實現其算 ─────────────────────────────────────────────────

可通、蔭、信三者,皆一列之和,其定義即其一行,兩語不能異。
斷之率則賴連通之算,而此算 Python 已有之(指數/算.py 之 _最大之分支),
其註自言「連通無可調之處,故兩語並存不能默然而歧」。故取之,不另作。

其相符,別有一試驗之(tests/backend/test_國.py 與前端之 tests/國之表.test.ts):
同一囊,兩語所得須合。歧則其試敗,不待人覺。
"""

import gzip
import json
from pathlib import Path

from pipeline.指數.算 import _最大之分支, _斯氏之相關

# 四身。none 者無所限,為斷之率之所本。
諸身 = ("none", "wheelchair", "blind_low_vision", "heat_sensitive")

# 蔭之界與其刻,必與前端同 —— 異則同一城而二數。
# MUST match 度量.ts: 蔭之率 uses a 0.5 threshold, and the city audit reads
# hour bucket 4 (14:00, peak heat). Different constants here would make the
# national table and the city audit disagree about the same city.
蔭之界 = 0.5
午後之序 = 4


def _率(a, b):
    return 0.0 if b == 0 else a / b


# 籤之寡者,其次序不足信。逾此比乃可論。
#
# 三十八城之中,十有八其明籤之米不及百之一 —— 拉斯維加斯、綠灣、奧蘭多者,
# 其明籤之米近於零,而其表為「百之百可通、無所斷」。此非其城之善,
# 乃其城之未測:無一段標為不可過,則無一段見為不可過。
#
# 若徑以斷之率次其城,則未測者居其末,而讀者以為其善 ——
# 正此器所立以拒之事。故其寡者別為一類,而其界書於其表。
#
# STATED THRESHOLD, not a hidden one. Eighteen of the 38 cities have under 1% of
# their network explicitly tagged. Las Vegas, Green Bay and Orlando are near
# zero, and they score 100% traversable with 0% severance — which is not a
# finding about those cities but about their survey coverage. Ranking them
# against Bellevue (25% tagged, 7.1% severed) would tell a reader that the
# least-surveyed city is the most accessible one, which is precisely the false
# confidence this product exists to refuse.
明籤之界 = 0.01


def 算一城(pack):
    """一囊之表。其入為已解之囊,不為其路 —— 故可試之於一造之囊。"""
    edges = pack["edges"]
    manifest = pack["manifest"]

    總米 = sum(e["length_m"] for e in edges)

    # 諸身之最大分支。斷之率賴 none 與其身相減,故必先皆算之。
    分支 = {身: _最大之分支(edges, 身) for 身 in 諸身}
    眾人之節 = len(分支["none"])

    身之度 = {}
    for 身 in 諸身:
        可通米 = sum(e["length_m"] for e in edges if e["traversable"][身])
        # 蔭之分母為可通之米,非全網 —— 所問者「吾所能行之路,有幾蔭」。
        # 曝闕者以全曝論,故不入蔭。
        蔭米 = sum(
            e["length_m"]
            for e in edges
            if e["traversable"][身]
            and (e["sun_exposure"][午後之序] if e.get("sun_exposure") else 1) < 蔭之界
        )
        斷之節 = max(0, 眾人之節 - len(分支[身]))
        身之度[身] = {
            "traversable_rate": round(_率(可通米, 總米), 4),
            "shade_rate": round(_率(蔭米, 可通米), 4),
            "severed_nodes": 斷之節,
            "severed_rate": round(_率(斷之節, 眾人之節), 4),
        }

    信 = {k: {"count": 0, "length_m": 0.0} for k in ("high", "medium", "low")}
    for e in edges:
        信[e["confidence"]]["count"] += 1
        信[e["confidence"]]["length_m"] += e["length_m"]
    for k in 信:
        信[k]["length_m"] = round(信[k]["length_m"], 1)

    總樓 = manifest.get("buildings_total") or 0
    推之樓 = manifest.get("buildings_assumed_height") or 0

    return {
        "id": manifest["id"],
        "name": manifest["name"],
        "segments": len(edges),
        "length_m": round(總米, 1),
        "nodes": len(pack["nodes"]),
        "destinations": len(pack.get("destinations") or []),
        "connected_nodes": 眾人之節,
        # 樓之高:所推者幾何。此為其資之質,非其城之質 —— 二者不可混。
        # 無樓則其率為 None,非零。零者「皆有其高」,None 者「無樓可論」。
        "buildings_total": 總樓,
        "buildings_assumed_height": 推之樓,
        "assumed_height_rate": round(推之樓 / 總樓, 4) if 總樓 else None,
        "confidence": 信,
        # 明籤之比與其足信否,皆算於此。前端不再算之 —— 其界二書則必歧。
        # Computed here, not in the view: a threshold written in two places is a
        # threshold that will eventually disagree with itself.
        "tagged_rate": round(_率(信["high"]["length_m"], 總米), 4),
        "well_surveyed": _率(信["high"]["length_m"], 總米) >= 明籤之界,
        "profiles": 身之度,
    }


def 算諸城(囊之處):
    """歷其處之諸囊而表之。其序從其名,俾其出可復。"""
    囊之處 = Path(囊之處)
    出 = []
    囊之日 = []
    for p in sorted(囊之處.glob("*.json.gz")):
        with gzip.open(p, "rt", encoding="utf-8") as f:
            囊 = json.load(f)
        出.append(算一城(囊))
        日 = 囊["manifest"].get("generated_at")
        if 日:
            囊之日.append(日)
    return {
        # 其日從其囊之最新者,不從其算之時。
        #
        # 二故。其一,實也:此表之新不逾其囊之新。囊建於八月而以今日書之,
        # 是以陳為新,正此器所拒之事。
        # 其二,可復也:從其鐘則每算而其文異,而 CI 之驗(再造而較之)必敗於
        # 一無所改之時。既從其囊,則同囊必得同文。
        #
        # Taken from the newest pack, never the wall clock. Two reasons, and the
        # first is the real one: this table is no fresher than its inputs, and
        # stamping today's date on packs built in August asserts a currency that
        # does not exist. The second is that a clock makes the output
        # nondeterministic, so CI's regenerate-and-diff check would fail on every
        # run with nothing actually changed.
        "generated_at": max(囊之日) if 囊之日 else None,
        "hour_bucket_index": 午後之序,
        "shade_threshold": 蔭之界,
        "tagged_threshold": 明籤之界,
        "survey_correlation": 算籤與斷之相關(出),
        "cities": 出,
    }


def 算籤與斷之相關(諸城):
    """籤之多寡與斷之率,果相關否。量之而書之,不臆之。

    MEASURED AND EMITTED, never asserted — the same discipline the Index applies
    to income. If this correlation is strong, the table is substantially a
    measure of how well each city has been surveyed, and the view must say so
    rather than let a reader read the ranking as a league table of accessibility.
    A weak result would be reported just as plainly.

    取秩相關,不取皮氏 —— 其籤之比長尾甚著(自零至二五成),
    數城之偏可獨挾皮氏之數。
    """
    xs, ys = [], []
    for c in 諸城:
        if c["length_m"] <= 0:
            continue
        xs.append(c["confidence"]["high"]["length_m"] / c["length_m"])
        ys.append(c["profiles"]["wheelchair"]["severed_rate"])
    return {
        "n": len(xs),
        "tagged_vs_severed": _斯氏之相關(xs, ys),
        "below_threshold": sum(1 for x in xs if x < 明籤之界),
    }
