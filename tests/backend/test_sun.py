from pipeline.shade.sun import sun_position


def test_night_has_negative_altitude():
    # LA, winter, midnight
    p = sun_position(34.05, -118.25, 350, 0)
    assert p["altitude_deg"] < 0


def test_noon_summer_is_high():
    p = sun_position(34.05, -118.25, 172, 12)  # ~summer solstice noon
    assert p["altitude_deg"] > 45


def test_azimuth_in_range():
    p = sun_position(34.05, -118.25, 172, 9)
    assert 0.0 <= p["azimuth_deg"] < 360.0
