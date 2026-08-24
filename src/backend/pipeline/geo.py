"""地理之算：距、向、線長。皆以米為度。"""

import math

_R = 6371000.0  # earth radius, meters


def haversine_m(lon1, lat1, lon2, lat2):
    """兩點大圓之距。"""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * _R * math.asin(math.sqrt(a))


def bearing_deg(lon1, lat1, lon2, lat2):
    """初始方位角。北為零，東為九十。"""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def polyline_length_m(coords):
    """折線之總長。coords 為 [[lon, lat], ...]。"""
    return sum(
        haversine_m(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
        for i in range(len(coords) - 1)
    )
