"""國之表之試。

其算取諸囊而不取諸網,故可試之於一造之囊 —— 小而其形全,則其邊皆可指。
"""

import gzip
import json

import pytest

from pipeline.國.算 import 算一城, 算諸城, 明籤之界, 午後之序


def _邊(i, a, b, *, 長=100.0, 輪椅=True, 曝=None, 信="high"):
    return {
        "id": i, "from": a, "to": b, "length_m": 長,
        "confidence": 信,
        "sun_exposure": 曝 if 曝 is not None else [1.0] * 8,
        "traversable": {
            "wheelchair": 輪椅, "blind_low_vision": True,
            "heat_sensitive": True, "none": True,
        },
    }


def _囊(edges, *, 總樓=100, 推樓=20):
    節 = sorted({e["from"] for e in edges} | {e["to"] for e in edges})
    return {
        "manifest": {
            "id": "t", "name": "Test",
            "buildings_total": 總樓, "buildings_assumed_height": 推樓,
        },
        "nodes": [{"id": n, "lon": 0.0, "lat": 0.0} for n in 節],
        "edges": edges,
        "destinations": [],
    }


def test_可通之率以米計不以段計():
    """段有長短,數之則誣。一長段不可過者,其害過於一短段。"""
    r = 算一城(_囊([
        _邊(1, 1, 2, 長=900.0, 輪椅=False),
        _邊(2, 2, 3, 長=100.0, 輪椅=True),
    ]))
    # 以米計:一百之一千,為一成。以段計則為五成 —— 相去五倍。
    assert r["profiles"]["wheelchair"]["traversable_rate"] == pytest.approx(0.1)


def test_斷之率者網在而不可至():
    """一階居中,則其後之段雖自可通,而輪椅不得至。

    此正「可通之率」所掩者:其率猶高,而其網已斷。
    """
    r = 算一城(_囊([
        _邊(1, 1, 2),
        _邊(2, 2, 3, 輪椅=False),   # 階
        _邊(3, 3, 4),
        _邊(4, 4, 5),
    ]))
    w = r["profiles"]["wheelchair"]
    # 眾人五節皆連。輪椅則分為二支:{1,2} 與 {3,4,5};取其大者,故得三節,
    # 而一二為所斷。所取者最大之分支,非其始所在之分支 —— 此易誤。
    # The largest component is {3,4,5}, NOT the one containing node 1: severance
    # counts nodes outside the biggest reachable island, whichever it is.
    assert r["profiles"]["none"]["severed_nodes"] == 0
    assert w["severed_nodes"] == 2
    assert w["severed_rate"] == pytest.approx(0.4)


def test_蔭之分母為可通之米非全網():
    """所問者「吾所能行之路,有幾蔭」,非「此城有幾蔭」。"""
    r = 算一城(_囊([
        _邊(1, 1, 2, 曝=[0.0] * 8),               # 可通而蔭
        _邊(2, 2, 3, 曝=[1.0] * 8),               # 可通而曝
        _邊(3, 3, 4, 曝=[0.0] * 8, 輪椅=False),   # 蔭而不可通 —— 不入其算
    ]))
    # 輪椅:可通二百米,其蔭百米,故半。若以全網為分母則為三分之一。
    assert r["profiles"]["wheelchair"]["shade_rate"] == pytest.approx(0.5)


def test_曝闕者以全曝論不得謂之蔭():
    """不知者不得謂之蔭 —— 此器之首則。"""
    e = _邊(1, 1, 2)
    e["sun_exposure"] = None
    r = 算一城(_囊([e]))
    assert r["profiles"]["wheelchair"]["shade_rate"] == 0.0


def test_無樓者其率為null非零():
    """零者「皆有其高」,None 者「無樓可論」。二者不可混。"""
    r = 算一城(_囊([_邊(1, 1, 2)], 總樓=0, 推樓=0))
    assert r["assumed_height_rate"] is None


def test_籤之寡者標之而不棄之():
    """其行猶在,其數猶見,而其位不使人以為其善。"""
    寡 = 算一城(_囊([_邊(1, 1, 2, 信="low"), _邊(2, 2, 3, 信="low")]))
    assert 寡["tagged_rate"] == 0.0
    assert 寡["well_surveyed"] is False

    足 = 算一城(_囊([_邊(1, 1, 2, 信="high")]))
    assert 足["tagged_rate"] == 1.0
    assert 足["well_surveyed"] is True


def test_籤之界即其所書者():
    """其界一書於此,前端不再算之 —— 二書則必歧。"""
    assert 明籤之界 == 0.01


def test_蔭取午後之刻():
    """時序四即十四時,暑之極。與前端之城審同,不然則同城而二數。"""
    assert 午後之序 == 4
    r = 算一城(_囊([_邊(1, 1, 2, 曝=[0, 0, 0, 0, 1.0, 0, 0, 0])]))
    # 其刻全曝,故無蔭 —— 若取他刻則為十成。
    assert r["profiles"]["wheelchair"]["shade_rate"] == 0.0


def test_算諸城歷其盤而其序從其名(tmp_path):
    for 名 in ("bbb", "aaa"):
        囊 = _囊([_邊(1, 1, 2)])
        囊["manifest"]["id"] = 名
        with gzip.open(tmp_path / f"{名}.json.gz", "wt", encoding="utf-8") as f:
            json.dump(囊, f)
    表 = 算諸城(tmp_path)
    assert [c["id"] for c in 表["cities"]] == ["aaa", "bbb"]
    assert 表["tagged_threshold"] == 明籤之界
    assert 表["survey_correlation"]["n"] == 2
