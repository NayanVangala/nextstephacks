from pipeline.shade.exposure import proxy_exposure


def test_below_horizon_is_zero():
    suns = [{"altitude_deg": -5, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns) == [0.0]


def test_low_sun_parallel_edge_is_high():
    # street running E-W (bearing 90) with a low eastern sun (azimuth 90):
    # the sun shines down the canyon, nothing flanking blocks it
    suns = [{"altitude_deg": 10, "azimuth_deg": 90}]
    assert proxy_exposure(90.0, suns)[0] > 0.7


def test_low_sun_perpendicular_edge_is_low():
    # street running N-S (bearing 0) with a low eastern sun: buildings on the
    # east side cast long shadows across the roadway
    suns = [{"altitude_deg": 10, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns)[0] < 0.3


def test_high_sun_is_exposed_regardless_of_orientation():
    suns = [{"altitude_deg": 85, "azimuth_deg": 90}]
    assert proxy_exposure(0.0, suns)[0] > 0.9
    assert proxy_exposure(90.0, suns)[0] > 0.9


def test_values_bounded_0_1():
    suns = [{"altitude_deg": a, "azimuth_deg": 90} for a in (-10, 5, 30, 60, 89)]
    for v in proxy_exposure(45.0, suns):
        assert 0.0 <= v <= 1.0
