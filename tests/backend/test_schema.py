import json
from pathlib import Path
import jsonschema

SCHEMA = Path(__file__).parents[2] / "src/shared/schema/city-pack.schema.json"


def load_schema():
    return json.loads(SCHEMA.read_text())


def test_minimal_valid_pack_passes():
    schema = load_schema()
    pack = {
        "manifest": {"id": "la", "name": "Los Angeles", "bbox": [0, 0, 1, 1],
                     "timezone": "America/Los_Angeles", "hour_buckets": [12],
                     "generated_at": "2026-08-23T00:00:00Z"},
        "nodes": [{"id": 1, "lon": 0.0, "lat": 0.0}, {"id": 2, "lon": 0.001, "lat": 0.0}],
        "edges": [{
            "id": 1, "from": 1, "to": 2, "length_m": 100.0,
            "geometry": [[0.0, 0.0], [0.001, 0.0]],
            "is_steps": False, "is_crossing": False, "confidence": "high",
            "sun_exposure": [0.5],
            "traversable": {"wheelchair": True, "blind_low_vision": True,
                            "heat_sensitive": True, "none": True}
        }]
    }
    jsonschema.validate(pack, schema)  # must not raise


def test_bad_confidence_rejected():
    schema = load_schema()
    pack = {
        "manifest": {"id": "la", "name": "LA", "bbox": [0, 0, 1, 1],
                     "timezone": "UTC", "hour_buckets": [12], "generated_at": "x"},
        "nodes": [], "edges": [{
            "id": 1, "from": 1, "to": 2, "length_m": 1.0, "geometry": [[0, 0], [1, 1]],
            "is_steps": False, "is_crossing": False, "confidence": "great",
            "traversable": {"wheelchair": True, "blind_low_vision": True,
                            "heat_sensitive": True, "none": True}
        }]
    }
    try:
        jsonschema.validate(pack, schema)
        assert False, "expected ValidationError"
    except jsonschema.ValidationError:
        pass
