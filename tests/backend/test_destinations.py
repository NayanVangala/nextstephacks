from pipeline.extract.destinations import (
    build_query, parse_destinations, snap_to_nodes, classify_kind,
)


def _els():
    return [
        {"type": "node", "id": 1, "lon": -118.2551, "lat": 34.0505,
         "tags": {"amenity": "library", "name": "Central Library"}},
        {"type": "node", "id": 2, "lon": -118.2500, "lat": 34.0500,
         "tags": {"amenity": "bench"}},
        {"type": "node", "id": 3, "lon": -118.2490, "lat": 34.0490,
         "tags": {"amenity": "drinking_water"}},
        {"type": "node", "id": 4, "lon": -118.2480, "lat": 34.0480,
         "tags": {"amenity": "shelter", "name": "Evac Point"}},
        {"type": "node", "id": 5, "lon": -118.2470, "lat": 34.0470,
         "tags": {"amenity": "restaurant", "name": "Not A Destination"}},
    ]


def test_query_requests_civic_amenities():
    q = build_query([-118.27, 34.03, -118.23, 34.06])
    for a in ("library", "community_centre", "bench", "drinking_water"):
        assert a in q


def test_library_classified_as_cooling_center():
    assert classify_kind({"amenity": "library"}) == "cooling_center"


def test_bench_classified_as_rest_stop():
    assert classify_kind({"amenity": "bench"}) == "rest_stop"


def test_shelter_classified_as_evacuation_center():
    assert classify_kind({"amenity": "shelter"}) == "evacuation_center"


def test_irrelevant_amenity_classified_as_none():
    assert classify_kind({"amenity": "restaurant"}) is None


def test_parse_skips_irrelevant_amenities():
    got = parse_destinations(_els(), curated=[])
    assert all(d["kind"] is not None for d in got)
    assert not any("Not A Destination" == d["name"] for d in got)


def test_every_destination_has_provenance_and_unknown_power():
    for d in parse_destinations(_els(), curated=[]):
        assert d["source"]
        assert d["backup_power"] == "unknown"


def test_curated_entries_are_included_and_keep_their_source():
    curated = [{
        "id": "x", "name": "Curated Place", "lon": -118.25, "lat": 34.05,
        "kind": "cooling_center", "backup_power": "unknown", "source": "curated: test",
    }]
    got = parse_destinations(_els(), curated=curated)
    match = [d for d in got if d["id"] == "x"]
    assert len(match) == 1 and match[0]["source"] == "curated: test"


def test_unnamed_amenity_gets_a_readable_fallback_name():
    got = parse_destinations(_els(), curated=[])
    bench = [d for d in got if d["kind"] == "rest_stop"][0]
    assert bench["name"]


def test_snap_attaches_the_nearest_graph_node():
    nodes = [{"id": 900, "lon": -118.2551, "lat": 34.0505},
             {"id": 901, "lon": -118.2000, "lat": 34.0000}]
    dests = [{"id": "a", "name": "n", "lon": -118.2551, "lat": 34.0506,
              "kind": "cooling_center", "backup_power": "unknown", "source": "s"}]
    assert snap_to_nodes(dests, nodes)[0]["node_id"] == 900


def test_snap_on_empty_graph_yields_null_node():
    dests = [{"id": "a", "name": "n", "lon": 0.0, "lat": 0.0,
              "kind": "cooling_center", "backup_power": "unknown", "source": "s"}]
    assert snap_to_nodes(dests, [])[0]["node_id"] is None
