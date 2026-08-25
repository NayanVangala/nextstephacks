from pipeline.graph.reststops import mark_rest_stop_edges


def _edge(lon_a, lat_a, lon_b, lat_b):
    return {"geometry": [[lon_a, lat_a], [lon_b, lat_b]]}


def _rest(lon, lat):
    return {"id": "r", "name": "Bench", "lon": lon, "lat": lat,
            "kind": "rest_stop", "backup_power": "unknown", "source": "s"}


def _cooling(lon, lat):
    return {"id": "c", "name": "Library", "lon": lon, "lat": lat,
            "kind": "cooling_center", "backup_power": "unknown", "source": "s"}


def test_edge_with_a_bench_at_its_midpoint_is_marked():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_rest(0.0, 0.0001)]) == [True]


def test_distant_bench_does_not_mark_the_edge():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_rest(0.01, 0.01)]) == [False]


def test_only_rest_stop_kind_counts():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], [_cooling(0.0, 0.0001)]) == [False]


def test_no_destinations_marks_nothing():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    assert mark_rest_stop_edges([e], []) == [False]


def test_radius_is_respected():
    e = _edge(0.0, 0.0, 0.0, 0.0002)
    far = _rest(0.0, 0.0007)  # ~55 m from the midpoint
    assert mark_rest_stop_edges([e], [far], radius_m=20.0) == [False]
    assert mark_rest_stop_edges([e], [far], radius_m=80.0) == [True]


def test_flags_align_with_edge_order():
    near = _edge(0.0, 0.0, 0.0, 0.0002)
    far = _edge(0.05, 0.05, 0.05, 0.0502)
    assert mark_rest_stop_edges([near, far], [_rest(0.0, 0.0001)]) == [True, False]
