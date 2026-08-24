import json
from pathlib import Path
from pipeline.extract.overpass import build_query, load_elements, fetch, _cache_key

FIX = Path(__file__).parent / "fixtures/overpass_downtown_la_small.json"


def test_query_contains_bbox_and_footway():
    q = build_query([-118.27, 34.03, -118.23, 34.06])
    assert "footway" in q
    assert "34.03" in q and "-118.27" in q


def test_load_elements_returns_ways_and_nodes():
    osm = json.loads(FIX.read_text())
    els = load_elements(osm)
    assert any(e["type"] == "way" for e in els)
    assert any(e["type"] == "node" for e in els)


def test_fetch_uses_cache_without_network(tmp_path):
    osm = json.loads(FIX.read_text())
    # pre-seed the cache so fetch must not hit the network
    key = _cache_key([-118.27, 34.03, -118.23, 34.06])
    (tmp_path / f"{key}.json").write_text(json.dumps(osm))
    got = fetch([-118.27, 34.03, -118.23, 34.06], url="http://invalid.invalid",
                cache_dir=str(tmp_path))
    assert got == osm
