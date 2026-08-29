"""日位之算，取 NOAA 近似之法。粗而足用，蓋但分時辰耳。"""

import math


def clock_to_solar(lon, clock_hour, utc_offset_h):
    """鐘之時化為日之時。

    Local solar time is UTC + lon/15; clock time is UTC + the zone's offset. A
    city sitting away from its meridian, or observing DST, therefore reads a
    clock hour that is NOT the solar hour the sun is actually at.

    量之於七城,其差自四十七分(鳳凰城,不行夏令)至一時二十一分(邁阿密,
    在東部之西陲而行夏令)。日之方位每時行十五度,故一時之差即二十度之差 ——
    影之所指遂謬。此非小數,乃蔭之模之根。

    Measured across the seven cities the error ran from 47 minutes (Phoenix,
    which does not observe DST) to 1h21m (Miami, far west in Eastern time and on
    DST). Azimuth moves ~15 deg/hour, so an hour of error points every shadow
    about 20 degrees wrong.

    尚未計者:均時差(equation of time),歲中約±十五分。較上者為小,存之而明告。
    NOT corrected: the equation of time, about +/-15 min over the year. Smaller
    than what this fixes, and stated rather than silently folded in.
    """
    return (clock_hour - utc_offset_h) + lon / 15.0


def sun_position(lat, lon, day_of_year, hour, utc_offset_h=None):
    """回 {altitude_deg, azimuth_deg}。方位以北為零，東為九十。

    `hour` is a CLOCK hour when utc_offset_h is given, and a solar hour when it
    is not. The pipeline always passes the offset; the bare form is kept for
    tests that reason directly in solar time.
    """
    if utc_offset_h is not None:
        hour = clock_to_solar(lon, hour, utc_offset_h)
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
