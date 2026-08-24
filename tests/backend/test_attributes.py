from pipeline.graph.attributes import parse_attributes


def test_steps_detected_with_count():
    a = parse_attributes({"highway": "steps", "step_count": "12"})
    assert a["is_steps"] is True and a["step_count"] == 12


def test_incline_percent_parsed():
    assert parse_attributes({"incline": "9%"})["incline_pct"] == 9.0


def test_incline_up_keyword_is_unknown_not_zero():
    assert parse_attributes({"incline": "up"})["incline_pct"] is None


def test_width_meters_parsed():
    assert parse_attributes({"width": "0.8"})["width_m"] == 0.8


def test_crossing_flags():
    a = parse_attributes({"highway": "footway", "footway": "crossing",
                          "crossing": "traffic_signals"})
    assert a["is_crossing"] is True and a["crossing_signalized"] is True


def test_missing_access_tags_lowers_confidence():
    assert parse_attributes({"highway": "footway", "footway": "sidewalk"})["confidence"] == "medium"


def test_explicit_wheelchair_is_high_confidence():
    a = parse_attributes({"highway": "footway", "footway": "sidewalk", "wheelchair": "yes"})
    assert a["confidence"] == "high" and a["wheelchair_tag"] == "yes"


def test_ambiguous_path_is_low_confidence():
    assert parse_attributes({"highway": "path"})["confidence"] == "low"
