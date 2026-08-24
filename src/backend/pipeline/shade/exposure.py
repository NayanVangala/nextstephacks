"""邊之曝於日者幾何。

MVP ships the proxy (spec §16 fallback): bearing-versus-azimuth, no building
geometry. `edge_sun_exposure` is the seam where real shadow polygons land later —
it delegates to the proxy whenever no building footprints are supplied.
"""

import math


def proxy_exposure(edge_bearing_deg, sun_positions):
    """街向與日方相較。

    順於日者（街渠與日同向）曝甚,日光直貫其中,旁樓無所蔽。
    橫於日者曝微,旁樓投影橫覆其街。日高則無論何向皆曝,日沒則零。
    """
    out = []
    for s in sun_positions:
        alt = s["altitude_deg"]
        if alt <= 0:
            out.append(0.0)
            continue
        # align: 一為順(街與日同向),零為橫。
        align = abs(math.cos(math.radians(s["azimuth_deg"] - edge_bearing_deg)))
        # alt_factor: 零為地平,一為天頂。日愈高,街向愈不足論。
        alt_factor = math.sin(math.radians(alt))
        out.append(max(0.0, min(1.0, alt_factor + (1.0 - alt_factor) * align)))
    return out


def edge_sun_exposure(edge_geom, buildings, sun_positions):
    """有樓影則算之,無則歸於 proxy。"""
    from pipeline.geo import bearing_deg

    if not buildings:
        b = bearing_deg(edge_geom[0][0], edge_geom[0][1], edge_geom[-1][0], edge_geom[-1][1])
        return proxy_exposure(b, sun_positions)
    raise NotImplementedError("pybdshadow path lands in the Phase-2 plan")
