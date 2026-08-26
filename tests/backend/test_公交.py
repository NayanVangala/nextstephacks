import io
import zipfile

import pytest

from pipeline.extract.公交 import 解輪椅登車, 解站


def _造zip(stops_csv, 帶BOM=False):
    """造一 GTFS zip 於記憶中,以供試。"""
    buf = io.BytesIO()
    內容 = ("﻿" if 帶BOM else "") + stops_csv
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("stops.txt", 內容)
    return buf.getvalue()


_頭 = "stop_id,stop_name,stop_lat,stop_lon,wheelchair_boarding\n"
_內 = (
    "1,Union Station,34.0560,-118.2360,1\n"
    "2,Pershing Square,34.0486,-118.2517,2\n"
    "3,Unknown Stop,34.0500,-118.2500,\n"
    "4,Far Away,40.0000,-100.0000,1\n"
)
_BBOX = [-118.2673, 34.0389, -118.2329, 34.0623]


def test_碼一為可乘():
    assert 解輪椅登車("1") == "yes"


def test_碼二為不可乘():
    assert 解輪椅登車("2") == "no"


def test_碼零為未知():
    assert 解輪椅登車("0") == "unknown"


def test_空為未知而非可乘():
    # 闕者不得冒為安
    assert 解輪椅登車("") == "unknown"
    assert 解輪椅登車(None) == "unknown"


def test_異碼為未知():
    assert 解輪椅登車("9") == "unknown"


def test_解站得bbox之內者():
    站 = 解站(_造zip(_頭 + _內), _BBOX)
    名 = {s["name"] for s in 站}
    assert "Union Station" in 名
    assert "Far Away" not in 名


def test_站之類恆為transit_stop():
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert s["kind"] == "transit_stop"


def test_站帶輪椅之狀():
    站 = {s["name"]: s for s in 解站(_造zip(_頭 + _內), _BBOX)}
    assert 站["Union Station"]["wheelchair_boarding"] == "yes"
    assert 站["Pershing Square"]["wheelchair_boarding"] == "no"
    assert 站["Unknown Stop"]["wheelchair_boarding"] == "unknown"


def test_站之備電恆為未知():
    # GTFS 無備電之欄,故不得妄言
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert s["backup_power"] == "unknown"


def test_站必著其所自():
    for s in 解站(_造zip(_頭 + _內), _BBOX):
        assert "GTFS" in s["source"]


def test_BOM之首不亂其欄():
    站 = 解站(_造zip(_頭 + _內, 帶BOM=True), _BBOX)
    assert len(站) == 3


def test_闕經緯者棄之():
    壞 = _頭 + "5,Broken,,,1\n"
    assert 解站(_造zip(壞), _BBOX) == []


def test_無stops檔則舉錯():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("agency.txt", "agency_id\n1\n")
    with pytest.raises(KeyError):
        解站(buf.getvalue(), _BBOX)
