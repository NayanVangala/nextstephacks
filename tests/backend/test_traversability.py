from pipeline.graph.attributes import parse_attributes
from pipeline.graph.traversability import traversable_flags


def flags(tags):
    return traversable_flags(parse_attributes(tags))


def test_steps_block_wheelchair_only():
    f = flags({"highway": "steps"})
    assert f["wheelchair"] is False
    assert f["blind_low_vision"] and f["heat_sensitive"] and f["none"]


def test_wheelchair_no_blocks():
    assert flags({"highway": "footway", "wheelchair": "no"})["wheelchair"] is False


def test_steep_incline_blocks_wheelchair():
    assert flags({"highway": "footway", "incline": "10%"})["wheelchair"] is False


def test_gentle_incline_ok():
    assert flags({"highway": "footway", "incline": "4%"})["wheelchair"] is True


def test_narrow_tagged_width_blocks_wheelchair():
    assert flags({"highway": "footway", "width": "0.7"})["wheelchair"] is False


def test_offroad_surface_blocks_wheelchair():
    assert flags({"highway": "footway", "surface": "gravel"})["wheelchair"] is False


def test_untagged_sidewalk_admitted_for_wheelchair():
    # untagged != impassable; admitted (confidence handled separately)
    assert flags({"highway": "footway", "footway": "sidewalk"})["wheelchair"] is True


def test_none_profile_always_true():
    assert flags({"highway": "steps"})["none"] is True
