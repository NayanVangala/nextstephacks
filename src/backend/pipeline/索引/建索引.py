"""以 ChromaDB 索destination與报事之文,俾以自然之言問之。

PersistentClient runs in-process against a directory on disk: no Docker, no
server, no network. That is the only shape that fits this project's constraints.

报事既立,方有corpus可索。前此destination之文寥寥,無所用其embedding;人所报之
路障,乃真自然語之料。
"""

# Chroma 限其名於 [a-zA-Z0-9._-],不受中文 —— 外物之律,非吾所能違。
_集之名 = "passable-docs"


def _得集(存於):
    import chromadb

    客 = chromadb.PersistentClient(path=存於)
    return 客.get_or_create_collection(_集之名)


def 建索引(destinations, 报事, 存於):
    """建之。回所索之數。id 同者則覆之(upsert),故再建不生重。"""
    集 = _得集(存於)

    ids, 文, 元 = [], [], []
    見 = set()  # Chroma 於重複之 id 舉錯,故先防之
    for d in destinations:
        if f"dest:{d['id']}" in 見:
            continue
        見.add(f"dest:{d['id']}")
        ids.append(f"dest:{d['id']}")
        文.append(f"{d.get('name', '')}. {d.get('source', '')}")
        元.append({"類": "destination", "kind": d.get("kind", "")})

    for r in 报事:
        # 無文者不入索 —— embedding 無所施其力
        if not r.get("note"):
            continue
        ids.append(f"report:{r['id']}")
        文.append(f"{r.get('kind', '')}: {r['note']}")
        元.append({"類": "report", "edge_id": int(r.get("edge_id", -1))})

    if not ids:
        return 0
    集.upsert(ids=ids, documents=文, metadatas=元)
    return len(ids)


def 問(存於, 問之文, n=5):
    """以自然之言問之,回最近者。索空則回空,所求多於所有則但回所有。"""
    集 = _得集(存於)
    有 = 集.count()
    if 有 == 0:
        return []
    出 = 集.query(query_texts=[問之文], n_results=min(n, 有))
    文列 = (出.get("documents") or [[]])[0]
    元列 = (出.get("metadatas") or [[]])[0]
    id列 = (出.get("ids") or [[]])[0]
    return [{"id": i, "文": t, "元": m} for i, t, m in zip(id列, 文列, 元列)]
