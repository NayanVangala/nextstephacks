import math
from pipeline.geo import haversine_m, bearing_deg, polyline_length_m


def test_haversine_known_distance():
    # ~111.19 m per 0.001 deg latitude at the equator
    d = haversine_m(0.0, 0.0, 0.0, 0.001)
    assert math.isclose(d, 111.19, rel_tol=0.01)


def test_bearing_east_is_90():
    assert math.isclose(bearing_deg(0.0, 0.0, 0.001, 0.0), 90.0, abs_tol=0.5)


def test_polyline_length_sums_segments():
    coords = [[0.0, 0.0], [0.0, 0.001], [0.0, 0.002]]
    assert math.isclose(polyline_length_m(coords), 222.38, rel_tol=0.01)
