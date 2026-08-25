import math

import pytest
from shapely.geometry import Point, Polygon

from pipeline.extract.buildings import parse_height_m, parse_buildings, DEFAULT_HEIGHT_M
from pipeline.shade.shadows import (
    shadow_offset_deg, shadow_polygons, sample_points, compute_edge_exposures,
)

REF_LAT = 34.05


def _sun(alt, az):
    return {"altitude_deg": alt, "azimuth_deg": az}


# ---------- height parsing ----------

def test_explicit_height_wins():
    assert parse_height_m({"height": "45"}) == (45.0, False)


def test_height_with_unit_suffix():
    assert parse_height_m({"height": "45.5 m"}) == (45.5, False)


def test_levels_converted_to_metres():
    h, assumed = parse_height_m({"building:levels": "10"})
    assert h == pytest.approx(32.0) and assumed is False


def test_untagged_building_is_flagged_as_assumed():
    h, assumed = parse_height_m({"building": "yes"})
    assert h == DEFAULT_HEIGHT_M and assumed is True


def test_unparseable_height_falls_through_to_levels():
    h, assumed = parse_height_m({"height": "tall", "building:levels": "5"})
    assert h == pytest.approx(16.0) and assumed is False


def test_parse_buildings_drops_degenerate_rings():
    els = [
        {"type": "node", "id": 1, "lon": 0.0, "lat": 0.0},
        {"type": "node", "id": 2, "lon": 0.001, "lat": 0.0},
        {"type": "way", "id": 9, "nodes": [1, 2], "tags": {"building": "yes"}},
    ]
    assert parse_buildings(els) == []


# ---------- shadow geometry ----------

def test_no_shadow_when_sun_below_horizon():
    assert shadow_offset_deg(30, _sun(-5, 90), REF_LAT) is None


def test_shadow_points_away_from_the_sun():
    # sun due east (azimuth 90) -> shadow runs west -> negative longitude offset
    dlon, dlat = shadow_offset_deg(30, _sun(45, 90), REF_LAT)
    assert dlon < 0
    assert abs(dlat) < abs(dlon)  # mostly east-west


def test_shadow_from_southern_sun_runs_north():
    # LA at noon: sun to the south (azimuth 180) -> shadow runs north
    dlon, dlat = shadow_offset_deg(30, _sun(60, 180), REF_LAT)
    assert dlat > 0


def test_lower_sun_casts_a_longer_shadow():
    _, low = shadow_offset_deg(30, _sun(10, 180), REF_LAT)
    _, high = shadow_offset_deg(30, _sun(70, 180), REF_LAT)
    assert low > high


def test_taller_building_casts_a_longer_shadow():
    _, short = shadow_offset_deg(10, _sun(45, 180), REF_LAT)
    _, tall = shadow_offset_deg(80, _sun(45, 180), REF_LAT)
    assert tall > short


def test_shadow_length_is_capped_near_the_horizon():
    # without a cap, tan(0.5 deg) would throw a multi-kilometre shadow
    _, dlat = shadow_offset_deg(100, _sun(0.5, 180), REF_LAT)
    assert dlat * 111320.0 <= 400.0 + 1e-6


def test_shadow_polygon_covers_the_building_and_its_projection():
    ring = [(0.0, 0.0), (0.0002, 0.0), (0.0002, 0.0002), (0.0, 0.0002)]
    polys = shadow_polygons([{"ring": ring, "height_m": 40, "height_assumed": False}],
                            _sun(45, 180), REF_LAT)
    assert len(polys) == 1
    assert polys[0].contains(Point(0.0001, 0.0001))  # the footprint itself
    assert polys[0].area > Polygon(ring).area       # plus ground to the north


def test_no_polygons_at_night():
    ring = [(0.0, 0.0), (0.0002, 0.0), (0.0002, 0.0002), (0.0, 0.0002)]
    assert shadow_polygons([{"ring": ring, "height_m": 40, "height_assumed": False}],
                           _sun(-1, 180), REF_LAT) == []


# ---------- sampling ----------

def test_short_edge_gets_minimum_samples():
    pts = sample_points([[0.0, 0.0], [0.00001, 0.0]])
    assert len(pts) == 3


def test_long_edge_gets_more_samples_but_is_capped():
    pts = sample_points([[0.0, 0.0], [0.01, 0.0]])  # ~920 m
    assert len(pts) == 9


def test_samples_lie_on_the_segment():
    pts = sample_points([[0.0, 0.0], [0.0, 0.001]])
    assert all(abs(p[0]) < 1e-12 for p in pts)
    assert all(0.0 < p[1] < 0.001 for p in pts)


# ---------- end to end ----------

def _tower_ring(lon, lat, size=0.0004):
    return [(lon, lat), (lon + size, lat), (lon + size, lat + size), (lon, lat + size)]


def test_edge_north_of_a_tall_tower_is_shaded_at_noon():
    # LA noon: sun in the south, so shadow falls north of the building
    tower = {"ring": _tower_ring(0.0, 0.0), "height_m": 120, "height_assumed": False}
    shaded_edge = {"geometry": [[0.0001, 0.0006], [0.0003, 0.0006]]}   # just north
    open_edge = {"geometry": [[0.0001, -0.0009], [0.0003, -0.0009]]}   # south, in sun
    sun = [_sun(60, 180)]
    exp = compute_edge_exposures([shaded_edge, open_edge], [tower], sun, REF_LAT)
    assert exp[0][0] < 0.5   # north side shaded by the tower
    assert exp[1][0] == 1.0  # south side fully exposed


def test_everything_is_exposed_when_there_are_no_buildings():
    edge = {"geometry": [[0.0, 0.0], [0.0002, 0.0]]}
    exp = compute_edge_exposures([edge], [], [_sun(60, 180)], REF_LAT)
    assert exp[0][0] == 1.0


def test_night_bucket_is_zero_exposure():
    tower = {"ring": _tower_ring(0.0, 0.0), "height_m": 120, "height_assumed": False}
    edge = {"geometry": [[0.0001, 0.0006], [0.0003, 0.0006]]}
    exp = compute_edge_exposures([edge], [tower], [_sun(-5, 180)], REF_LAT)
    assert exp[0][0] == 0.0


def test_exposure_values_stay_within_bounds():
    tower = {"ring": _tower_ring(0.0, 0.0), "height_m": 60, "height_assumed": False}
    edges = [{"geometry": [[0.0001, 0.0002 * k], [0.0003, 0.0002 * k]]} for k in range(6)]
    suns = [_sun(a, 180) for a in (10, 30, 60, 85)]
    for row in compute_edge_exposures(edges, [tower], suns, REF_LAT):
        for v in row:
            assert 0.0 <= v <= 1.0


def test_high_sun_still_produces_shade_variation():
    """The whole point of the fix: at high sun the proxy flattened to no signal."""
    tower = {"ring": _tower_ring(0.0, 0.0), "height_m": 150, "height_assumed": False}
    near = {"geometry": [[0.0001, 0.00055], [0.0003, 0.00055]]}
    far = {"geometry": [[0.0001, 0.004], [0.0003, 0.004]]}
    exp = compute_edge_exposures([near, far], [tower], [_sun(75, 180)], REF_LAT)
    assert exp[0][0] < exp[1][0]
    assert math.isclose(exp[1][0], 1.0)
