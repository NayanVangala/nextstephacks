"""判邊之可通，依身而異。

An excluded edge is REMOVED from the graph before search, not merely penalised.
This is the difference between "a longer walk" and "you physically cannot pass".
Only hard, tag-supported exclusions belong here; soft preferences belong in cost.
"""

_OFFROAD = {"sand", "gravel", "ground", "grass", "dirt", "earth", "mud"}
_ADA_MAX_INCLINE = 8.33  # percent — ADA ramp maximum, 1:12


def traversable_flags(attrs):
    """回四profile之可通與否。輪椅有硬阻，餘者以罰值治之。"""
    wc = True
    if attrs["is_steps"]:
        wc = False
    if attrs["wheelchair_tag"] == "no":
        wc = False
    if attrs["kerb"] == "raised" and attrs["is_crossing"]:
        wc = False
    if attrs["incline_pct"] is not None and attrs["incline_pct"] > _ADA_MAX_INCLINE:
        wc = False
    if attrs["surface"] in _OFFROAD:
        wc = False
    if attrs["width_m"] is not None and attrs["width_m"] < 0.9:
        wc = False

    return {"wheelchair": wc, "blind_low_vision": True,
            "heat_sensitive": True, "none": True}
