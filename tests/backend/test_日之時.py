"""鐘之時與日之時。

The shade model's whole output hangs on this: get the hour wrong and every
shadow in every city points the wrong way, silently and consistently. It was
wrong until 2026-08-28 — sun_position accepted a longitude and never used it,
so a clock hour was treated as a solar hour.
"""

import math

from pipeline.shade.sun import clock_to_solar, sun_position


def test_子午線之上者無所偏():
    """正當其區之子午線,且不行夏令,則鐘之時即日之時。"""
    # 東部之子午線為西經七十五度,冬時 UTC-5。
    assert clock_to_solar(-75.0, 12.0, -5.0) == 12.0


def test_偏西者其日之時早於鐘():
    """在其區之西陲,則日先於鐘 —— 邁阿密是也。"""
    # 邁阿密 -80.19,東部夏令 UTC-4。
    v = clock_to_solar(-80.19, 14.0, -4.0)
    assert v < 14.0
    # 差約一時二十一分。
    assert math.isclose(v, 14 - 1.346, abs_tol=0.02)


def test_夏令增其差_而鳳凰城最小():
    """行夏令則差增一時。鳳凰城不行之,故其差最小。"""
    # 鳳凰城 -112.07,不行夏令,故夏亦 UTC-7。
    phx = clock_to_solar(-112.07, 14.0, -7.0)
    # 洛杉磯 -118.25,夏令 UTC-7(冬為 -8)。
    la = clock_to_solar(-118.25, 14.0, -7.0)
    assert abs(phx - 14) < abs(la - 14)
    assert math.isclose(phx, 14 - 0.471, abs_tol=0.02)


def test_不與其偏則其時不改():
    """不授其偏者,以其時為日之時 —— 舊之行止,測賴之。"""
    a = sun_position(34.05, -118.25, 200, 14)
    b = sun_position(34.05, -118.25, 200, 14, None)
    assert a == b


def test_既正之後其位大異():
    """此非小數。洛城午後,方位差近二十度,而高差近十度。"""
    舊 = sun_position(34.05, -118.25, 200, 14)
    新 = sun_position(34.05, -118.25, 200, 14, -7.0)
    assert abs(新["azimuth_deg"] - 舊["azimuth_deg"]) > 15
    # 既正,則其時實近於日中,故其日愈高。
    assert 新["altitude_deg"] > 舊["altitude_deg"]


def test_日中之時其日最高():
    """日之時十二,其高當為一日之極 —— 此為其自洽之驗。"""
    lat, lon, off = 34.05, -118.25, -7.0
    高 = []
    for h in range(6, 21):
        p = sun_position(lat, lon, 200, h, off)
        高.append((p["altitude_deg"], h))
    頂 = max(高)[1]
    # 鐘之十三時,其日之時約十二 —— 故其極當在十三前後。
    assert 頂 in (12, 13), f"peak altitude at clock {頂}, expected 12 or 13"


def test_經度愈西則日之時愈遲():
    """同區之內,愈西者其日愈遲於鐘。"""
    東 = clock_to_solar(-118.0, 14.0, -7.0)
    西 = clock_to_solar(-122.4, 14.0, -7.0)
    assert 西 < 東
