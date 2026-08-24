from pipeline.graph.build import build_graph


def _els():
    return [
        {"type": "node", "id": 100, "lon": 0.0, "lat": 0.0},
        {"type": "node", "id": 101, "lon": 0.0, "lat": 0.001},
        {"type": "node", "id": 102, "lon": 0.0, "lat": 0.002},
        {"type": "way", "id": 500, "nodes": [100, 101, 102],
         "tags": {"highway": "footway", "footway": "sidewalk"}},
    ]


def test_way_splits_into_consecutive_edges():
    nodes, edges = build_graph(_els())
    assert len(edges) == 2
    assert (edges[0]["from"], edges[0]["to"]) == (100, 101)
    assert (edges[1]["from"], edges[1]["to"]) == (101, 102)


def test_edge_carries_length_and_geometry_and_tags():
    _, edges = build_graph(_els())
    assert edges[0]["length_m"] > 100 and edges[0]["length_m"] < 120
    assert edges[0]["geometry"] == [[0.0, 0.0], [0.0, 0.001]]
    assert edges[0]["tags"]["footway"] == "sidewalk"


def test_only_nodes_referenced_by_ways_are_kept():
    els = _els() + [{"type": "node", "id": 999, "lon": 5.0, "lat": 5.0}]
    nodes, _ = build_graph(els)
    ids = {n["id"] for n in nodes}
    assert 999 not in ids and {100, 101, 102} <= ids
