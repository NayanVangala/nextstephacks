"""日位之算，取 NOAA 近似之法。粗而足用，蓋但分時辰耳。"""

import math


def sun_position(lat, lon, day_of_year, hour):
    """回 {altitude_deg, azimuth_deg}。方位以北為零，東為九十。

    `hour` is local solar hour, not clock time — the caller supplies the bucket.
    """
    lat_r = math.radians(lat)
    # 赤緯：隨歲而遷，冬至前後為極。
    decl = math.radians(-23.44) * math.cos(math.radians(360.0 / 365.0 * (day_of_year + 10)))
    hour_angle = math.radians(15.0 * (hour - 12.0))

    alt = math.asin(math.sin(lat_r) * math.sin(decl) +
                    math.cos(lat_r) * math.cos(decl) * math.cos(hour_angle))
    az = math.atan2(
        math.sin(hour_angle),
        math.cos(hour_angle) * math.sin(lat_r) - math.tan(decl) * math.cos(lat_r),
    )
    azimuth = (math.degrees(az) + 180.0) % 360.0
    return {"altitude_deg": math.degrees(alt), "azimuth_deg": azimuth}
