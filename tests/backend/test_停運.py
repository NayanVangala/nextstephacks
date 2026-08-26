from pipeline.extract.停運 import 解停運, 無停運之囊


def test_空之應回無之囊():
    assert 解停運(None) == 無停運之囊()


def test_非字典之應不舉錯():
    assert 解停運("<html>503</html>") == 無停運之囊()


def test_解其總與路():
    出 = 解停運({
        "canceled_trips_summary": {"720": 17, "251": 14},
        "total_canceled_trips": 31,
        "last_updated": "2022-10-04 15:56",
    })
    assert 出["總"] == 31
    assert 出["路"]["720"] == 17
    assert 出["更新於"] == "2022-10-04 15:56"


def test_闕總則以路之和補之():
    出 = 解停運({"canceled_trips_summary": {"1": 2, "2": 3}})
    assert 出["總"] == 5


def test_闕更新之時則為None而非今():
    # 不知其時者,不得冒為新
    出 = 解停運({"canceled_trips_summary": {}, "total_canceled_trips": 0})
    assert 出["更新於"] is None


def test_無停運之囊其時為None():
    囊 = 無停運之囊()
    assert 囊["總"] == 0
    assert 囊["路"] == {}
    assert 囊["更新於"] is None


def test_路之數非整者棄之():
    出 = 解停運({
        "canceled_trips_summary": {"720": 17, "壞": "many"},
        "total_canceled_trips": 17,
    })
    assert "壞" not in 出["路"]
    assert 出["路"]["720"] == 17
