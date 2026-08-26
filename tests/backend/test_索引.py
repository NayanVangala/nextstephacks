import pytest

chromadb = pytest.importorskip("chromadb")

from pipeline.索引.建索引 import 建索引, 問  # noqa: E402


def _所():
    return [
        {"id": "d1", "name": "Los Angeles Central Library", "kind": "cooling_center",
         "source": "curated: designated cooling centre with air conditioning"},
        {"id": "d2", "name": "Pershing Square", "kind": "rest_stop",
         "source": "curated: public plaza with shade and seating"},
        {"id": "d3", "name": "Union Station", "kind": "transit_stop",
         "source": "GTFS stops.txt"},
    ]


def test_建索引回其數(tmp_path):
    assert 建索引(_所(), [], str(tmp_path)) == 3


def test_报事之文亦入索(tmp_path):
    报 = [{"id": "r1", "edge_id": 42, "kind": "curb_cut_broken",
           "note": "The kerb ramp at 5th and Hill is cracked"}]
    assert 建索引(_所(), 报, str(tmp_path)) == 4


def test_报事無文者不入索(tmp_path):
    报 = [{"id": "r1", "edge_id": 42, "kind": "other", "note": None}]
    assert 建索引(_所(), 报, str(tmp_path)) == 3


def test_問得相近者(tmp_path):
    建索引(_所(), [], str(tmp_path))
    出 = 問(str(tmp_path), "somewhere with air conditioning", n=2)
    assert len(出) == 2
    assert any("Library" in x["文"] for x in 出)


def test_問空索則回空(tmp_path):
    建索引([], [], str(tmp_path))
    assert 問(str(tmp_path), "anything", n=3) == []


def test_再建則不重(tmp_path):
    建索引(_所(), [], str(tmp_path))
    建索引(_所(), [], str(tmp_path))
    assert len(問(str(tmp_path), "library", n=10)) <= 3


def test_所問多於所有則但回所有(tmp_path):
    建索引(_所(), [], str(tmp_path))
    assert len(問(str(tmp_path), "anything", n=99)) == 3


def test_元載其類(tmp_path):
    建索引(_所(), [], str(tmp_path))
    出 = 問(str(tmp_path), "library", n=1)
    assert 出[0]["元"]["類"] == "destination"
