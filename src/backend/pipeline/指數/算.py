"""區之度量:此區之路,幾可通、幾有蔭、幾與大網相連。

The Index turns the same graph the router uses around: instead of asking "can
this person get from A to B", it asks, for every block group, "how much of the
sidewalk here is usable at all, how much of it is shaded at the worst hour, and
how much of it is actually wired to the rest of the city."

Severance is the metric that matters most and the one no city publishes. A block
group can be 99% traversable and still be a trap: if the only ways onto its
sidewalk are steps, every one of those metres is stranded.

不變式 / INVARIANT: a block group with no sidewalk in it yields None for every
rate, never 0. Zero means "measured, and the answer is none"; None means "we did
not measure this". Rendering the second as the first is the exact failure this
whole project exists to refuse.
"""

from shapely.geometry import Polygon, MultiPolygon, shape, Point
from shapely.strtree import STRtree

# 輪椅之身。指數以此為準 —— 障之所在,於此身最明。
_輪椅之身 = "wheelchair"

# 蔭之界。與界面之 蔭之率 同,不可異 —— 二處異則同名而異實,人不能校。
_蔭之界 = 0.5


def _成多邊(geom):
    """GeoJSON 之幾何成 shapely。無效者以 buffer(0) 正之。"""
    try:
        g = shape(geom)
    except Exception:
        return None
    if not g.is_valid:
        g = g.buffer(0)
    if g.is_empty or not isinstance(g, (Polygon, MultiPolygon)):
        return None
    return g


def _段之中(edge):
    """段之中點。以之定其所屬之區 —— 段跨二區者,歸其中點之所在。"""
    g = edge["geometry"]
    a, b = g[0], g[-1]
    return Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def _最大之分支(edges):
    """可通之段中,最大連通分支之節。

    Plain BFS over the wheelchair-traversable subgraph. Deliberately NOT a port
    of the frontend's reach(): that one carries a heat budget and a cost model
    that would have to be kept in step across two languages. Connectivity has no
    tunable behaviour, so duplicating it here cannot silently diverge.
    """
    鄰 = {}
    for e in edges:
        if not e["traversable"][_輪椅之身]:
            continue
        鄰.setdefault(e["from"], []).append(e["to"])
        鄰.setdefault(e["to"], []).append(e["from"])

    見 = set()
    最大 = set()
    for 始 in 鄰:
        if 始 in 見:
            continue
        分支 = {始}
        見.add(始)
        堆 = [始]
        while 堆:
            x = 堆.pop()
            for y in 鄰.get(x, ()):
                if y not in 見:
                    見.add(y)
                    分支.add(y)
                    堆.append(y)
        if len(分支) > len(最大):
            最大 = 分支
    return 最大


def 算區之度(pack, 區之features, 入息, hour_idx=4):
    """回每區之度量。hour_idx 預設為四,即 14:00 —— 暑之極。"""
    邊 = pack["edges"]
    節之座 = {n["id"]: (n["lon"], n["lat"]) for n in pack["nodes"]}
    大分支 = _最大之分支(邊)

    形 = []
    屬 = []
    for f in 區之features:
        g = _成多邊(f.get("geometry"))
        if g is None:
            continue
        形.append(g)
        屬.append(f["properties"])
    if not 形:
        return []

    樹 = STRtree(形)
    中點 = [_段之中(e) for e in 邊]
    # 一次而盡問之。逐段而問,則萬段之圖須萬次。
    對 = 樹.query(中點, predicate="within")

    聚 = {i: {"總米": 0.0, "可通米": 0.0, "蔭米": 0.0, "連米": 0.0, "節": set()}
          for i in range(len(形))}
    for 段序, 區序 in zip(對[0], 對[1]):
        e = 邊[int(段序)]
        s = 聚[int(區序)]
        L = e["length_m"]
        s["總米"] += L
        s["節"].add(e["from"])
        s["節"].add(e["to"])
        if not e["traversable"][_輪椅之身]:
            continue
        s["可通米"] += L
        曝 = e.get("sun_exposure") or []
        if hour_idx < len(曝) and 曝[hour_idx] < _蔭之界:
            s["蔭米"] += L
        # 連者,兩端皆在大分支之內。一端在外,則此段自彼不可至。
        if e["from"] in 大分支 and e["to"] in 大分支:
            s["連米"] += L

    出 = []
    for i, p in enumerate(屬):
        s = 聚[i]
        geoid = p.get("GEOID")
        有路 = s["總米"] > 0
        可通 = s["可通米"]
        錢 = 入息.get(geoid)
        出.append({
            "geoid": geoid,
            "節數": len(s["節"]),
            "總米": round(s["總米"], 1),
            "可通米": round(可通, 1),
            # 無路之區,其率為 None —— 非零。零者,量而無有;None 者,未嘗量也。
            "通之率": round(可通 / s["總米"], 4) if 有路 else None,
            "蔭之率": round(s["蔭米"] / 可通, 4) if 可通 > 0 else None,
            "連之率": round(s["連米"] / 可通, 4) if 可通 > 0 else None,
            "入息": 錢[0] if 錢 else None,
            "入息之誤": 錢[1] if 錢 else None,
            "界": _簡界(形[i]),
        })
    return 出


def _簡界(g, 容 = 0.00012):
    """簡其界而回其環。囊之大小有度,全精之界則過巨。

    ~13m tolerance at these latitudes: invisible on a city-scale choropleth,
    and it cuts the emitted ring count by roughly an order of magnitude.
    """
    s = g.simplify(容, preserve_topology=True)
    if isinstance(s, MultiPolygon):
        # 取其最大者。區之界偶有飛地,於此圖無足輕重。
        s = max(s.geoms, key=lambda x: x.area)
    if not isinstance(s, Polygon):
        return []
    return [[round(x, 5), round(y, 5)] for x, y in s.exterior.coords]


def _斯氏之相關(xs, ys):
    """Spearman 之秩相關。無 scipy,自為之 —— 二十行而已。

    Rank correlation, not Pearson: the relationship need not be linear, and
    block-group income has a long right tail that would let a handful of wealthy
    outliers drive a Pearson coefficient on its own.
    """
    n = len(xs)
    if n < 3:
        return None
    def 秩(v):
        序 = sorted(range(len(v)), key=lambda i: v[i])
        r = [0] * len(v)
        for 位, i in enumerate(序):
            r[i] = 位 + 1
        return r
    rx, ry = 秩(xs), 秩(ys)
    d2 = sum((rx[i] - ry[i]) ** 2 for i in range(n))
    return round(1 - 6 * d2 / (n * (n * n - 1)), 3)


# 誤逾此比者,其估不足以定次序。
# Above this ratio the ACS margin swamps the estimate: a block group reported at
# $71,721 +/- $33,092 cannot be ranked against one at $85,000 in any meaningful
# way, and including it manufactures a correlation out of noise.
_可信之誤比 = 0.25


def 算相關(區之度):
    """入息與蔭、與連,果相關否。並記其樣本之數與所棄者。

    IMPORTANT: this is measured and emitted, never asserted. The project's whole
    claim is that it reports what the data says rather than what the thesis
    wants, and the Index is the place that claim is easiest to violate — so the
    coefficient the interface displays is computed here, from the same rows the
    map draws, and recomputed on every build.
    """
    有錢 = [r for r in 區之度 if r["入息"] is not None]
    可信 = [r for r in 有錢
            if r["入息之誤"] is not None
            and r["入息之誤"] <= r["入息"] * _可信之誤比]

    def 對(組, 鍵):
        g = [r for r in 組 if r.get(鍵) is not None]
        if len(g) < 8:
            return None
        return _斯氏之相關([r[鍵] for r in g], [r["入息"] for r in g])

    return {
        "區之數": len(區之度),
        "有入息者": len(有錢),
        "可信者": len(可信),
        "誤比之界": _可信之誤比,
        "蔭與入息": 對(有錢, "蔭之率"),
        "蔭與入息_可信": 對(可信, "蔭之率"),
        "連與入息": 對(有錢, "連之率"),
        "連與入息_可信": 對(可信, "連之率"),
    }
