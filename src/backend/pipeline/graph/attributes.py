"""解 OSM 之籤為通行之屬，並定其可信之等。

Untagged is NOT the same as absent: a missing tag lowers `confidence`, it never
asserts that the segment is passable. Downstream code must surface low confidence
rather than treat it as safe.
"""


def _num(v):
    """取數於籤。"up"、"down" 之類則回 None，闕也，非零也。"""
    if v is None:
        return None
    try:
        return float(str(v).strip().rstrip("%").split()[0])
    except (ValueError, IndexError):
        return None


def parse_attributes(tags):
    highway = tags.get("highway")
    footway = tags.get("footway")

    is_steps = highway == "steps"
    raw_steps = _num(tags.get("step_count"))
    step_count = int(raw_steps) if raw_steps is not None else None

    kerb = tags.get("kerb")
    wheelchair_tag = tags.get("wheelchair")
    incline_pct = _num(tags.get("incline"))
    surface = tags.get("surface")
    width_m = _num(tags.get("width"))

    tactile = tags.get("tactile_paving")
    tactile_paving = (tactile == "yes") if tactile in ("yes", "no") else None

    is_crossing = footway == "crossing" or highway == "crossing"
    crossing = tags.get("crossing")
    crossing_signalized = None
    if is_crossing:
        crossing_signalized = crossing in ("traffic_signals", "signals", "pelican", "toucan")

    # 有明籤則信高；道類含糊則信低；餘者中。
    if wheelchair_tag is not None or kerb is not None or is_steps:
        confidence = "high"
    elif highway == "path" and "foot" not in tags and "surface" not in tags:
        confidence = "low"
    else:
        confidence = "medium"

    return {
        "is_steps": is_steps, "step_count": step_count, "kerb": kerb,
        "wheelchair_tag": wheelchair_tag, "incline_pct": incline_pct,
        "surface": surface, "width_m": width_m, "tactile_paving": tactile_paving,
        "is_crossing": is_crossing, "crossing_signalized": crossing_signalized,
        "confidence": confidence,
    }
