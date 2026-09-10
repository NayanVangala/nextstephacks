"""合節、邊、日曝為一城之囊,驗之於 schema,而後書。"""

import gzip
import json
from pathlib import Path

import jsonschema

from pipeline.graph.attributes import parse_attributes
from pipeline.graph.traversability import traversable_flags
from pipeline.graph.reststops import mark_rest_stop_edges
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


def assemble_pack(manifest, nodes, raw_edges, sun_positions, buildings=None,
                  ref_lat=None, destinations=None):
    """籤解為屬,屬定可通,幾何定日曝,憩息之側亦標之。

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

    destinations = list(destinations or [])
    rest_flags = mark_rest_stop_edges(raw_edges, destinations)

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
            "near_rest_stop": rest_flags[i],
            "traversable": traversable_flags(attrs),
        })
    quantized_nodes = [{"id": n["id"],
                        "lon": round(n["lon"], _COORD_PRECISION),
                        "lat": round(n["lat"], _COORD_PRECISION)}
                       for n in nodes]
    """日之高度,書之於 manifest —— 前端賴此以別夜與蔭。

    前此不書,故前端無以別「日已沒」與「此路全蔭」,但以其曝之零推之。
    其果:十八時之日尚二十二度而路全在影中者,器棄之如夜,反舉十六時之次者。
    量之於洛城五十六路,如此者二。

    The frontend cannot otherwise distinguish "the sun is down" from "this route
    happens to be fully shaded", and inferring it from zero exposure discards
    exactly the advice a heat-sensitive person most wants. See 算遲行之利.
    """
    出 = {"manifest": dict(manifest), "nodes": quantized_nodes,
          "edges": edges, "destinations": destinations}
    出["manifest"]["sun_altitude_deg"] = [
        round(s["altitude_deg"], 2) for s in sun_positions
    ]
    return 出


def write_pack(pack, out_path):
    """Validate BEFORE writing — a malformed pack must never reach the frontend.

    囊以 gzip 書之。三十八城之生文二百五十兆,壓之則十六 —— 庫與所部署者
    皆輕十五倍,而其在道上本已壓,故無所增於其行。前端以 DecompressionStream
    解之,不假外物。

    The caller MUST supply a .json.gz path. gzip.open writes gzip whatever the
    filename says, so a .json path here yields a gzip file the frontend fetches
    as JSON — failing with a parse error that names nothing useful.
    """
    assert str(out_path).endswith(".json.gz"), f"囊之路當終於 .json.gz:{out_path}"
    jsonschema.validate(pack, _SCHEMA)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(out_path, "wt", encoding="utf-8", compresslevel=9) as f:
        json.dump(pack, f, separators=(",", ":"))
