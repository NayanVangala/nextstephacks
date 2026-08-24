import json
from pathlib import Path
import jsonschema
from pipeline.emit.citypack import assemble_pack

SCHEMA = json.loads(
    (Path(__file__).parents[2] / "src/shared/schema/city-pack.schema.json").read_text()
)


def _manifest():
    return {"id": "t", "name": "Test", "bbox": [0, 0, 0.01, 0.01],
            "timezone": "UTC", "hour_buckets": [8, 12, 16]}


def _inputs():
    nodes = [{"id": 1, "lon": 0.0, "lat": 0.0}, {"id": 2, "lon": 0.0, "lat": 0.001}]
    raw = [{"id": 0, "from": 1, "to": 2, "length_m": 111.0,
            "geometry": [[0.0, 0.0], [0.0, 0.001]],
            "tags": {"highway": "steps"}}]
    return nodes, raw


def test_assembled_pack_is_schema_valid():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3  # one per hour bucket
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    pack["manifest"]["generated_at"] = "2026-08-23T00:00:00Z"
    jsonschema.validate(pack, SCHEMA)


def test_steps_edge_marked_untraversable_for_wheelchair():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert pack["edges"][0]["traversable"]["wheelchair"] is False
    assert pack["edges"][0]["is_steps"] is True


def test_sun_exposure_length_matches_hour_buckets():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert len(pack["edges"][0]["sun_exposure"]) == 3


def test_raw_tags_do_not_leak_into_the_pack():
    nodes, raw = _inputs()
    suns = [{"altitude_deg": 30, "azimuth_deg": 90}] * 3
    pack = assemble_pack(_manifest(), nodes, raw, suns)
    assert "tags" not in pack["edges"][0]
