"""合節、邊、日曝為一城之囊,驗之於 schema,而後書。"""

import json
from pathlib import Path

import jsonschema

from pipeline.graph.attributes import parse_attributes
from pipeline.graph.traversability import traversable_flags
from pipeline.shade.exposure import edge_sun_exposure
from pipeline.shade.shadows import compute_edge_exposures

# parents: [0]=emit [1]=pipeline [2]=backend [3]=src [4]=repo root
_SCHEMA = json.loads(
    (Path(__file__).parents[4] / "src/shared/schema/city-pack.schema.json").read_text()
)


# 六位小數約當十公分,遠密於人行道之測。過此則徒增囊之重。
_COORD_PRECISION = 6


def _quantize_coords(coords):
    return [[round(lon, _COORD_PRECISION), round(lat, _COORD_PRECISION)]
            for lon, lat in coords]


def assemble_pack(manifest, nodes, raw_edges, sun_positions, buildings=None, ref_lat=None):
    """籤解為屬,屬定可通,幾何定日曝。原籤不入囊,免其臃腫。

    With `buildings`, exposure comes from projected building shadows (bulk-computed
    for all edges at once). Without them it falls back to the orientation proxy,
    which cannot see midday shade — see docs/superpowers/specs §16.
    """
    if buildings:
        if ref_lat is None:
            ref_lat = (manifest["bbox"][1] + manifest["bbox"][3]) / 2
        all_exposures = compute_edge_exposures(raw_edges, buildings, sun_positions, ref_lat)
    else:
        all_exposures = None

    edges = []
    for i, e in enumerate(raw_edges):
        attrs = parse_attributes(e["tags"])
        exposure = (
            all_exposures[i]
            if all_exposures is not None
            else [round(v, 3) for v in edge_sun_exposure(e["geometry"], [], sun_positions)]
        )
        edges.append({
            "id": e["id"], "from": e["from"], "to": e["to"],
            "length_m": round(e["length_m"], 1),
            "geometry": _quantize_coords(e["geometry"]),
            **attrs,
            "sun_exposure": exposure,
            "traversable": traversable_flags(attrs),
        })
    quantized_nodes = [{"id": n["id"],
                        "lon": round(n["lon"], _COORD_PRECISION),
                        "lat": round(n["lat"], _COORD_PRECISION)}
                       for n in nodes]
    return {"manifest": dict(manifest), "nodes": quantized_nodes, "edges": edges}


def write_pack(pack, out_path):
    """Validate BEFORE writing — a malformed pack must never reach the frontend."""
    jsonschema.validate(pack, _SCHEMA)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(json.dumps(pack, separators=(",", ":")))
