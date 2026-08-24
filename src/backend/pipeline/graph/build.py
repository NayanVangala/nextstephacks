"""化 OSM 之道為可行之圖：一道析為數邊，邊各承其道之籤。"""

from pipeline.geo import polyline_length_m


def build_graph(elements):
    """回 (nodes, raw_edges)。籤之解析在 attributes，此處但傳之。"""
    coords = {e["id"]: (e["lon"], e["lat"]) for e in elements if e["type"] == "node"}
    ways = [e for e in elements if e["type"] == "way" and "nodes" in e]

    used = set()
    edges = []
    eid = 0
    for way in ways:
        # 節有闕者去之，恐其無座標。
        ns = [n for n in way["nodes"] if n in coords]
        tags = way.get("tags", {})
        for a, b in zip(ns, ns[1:]):
            (alon, alat), (blon, blat) = coords[a], coords[b]
            geom = [[alon, alat], [blon, blat]]
            edges.append({
                "id": eid, "from": a, "to": b,
                "length_m": polyline_length_m(geom),
                "geometry": geom, "tags": tags,
            })
            eid += 1
            used.add(a)
            used.add(b)

    nodes = [{"id": nid, "lon": coords[nid][0], "lat": coords[nid][1]}
             for nid in sorted(used)]
    return nodes, edges
