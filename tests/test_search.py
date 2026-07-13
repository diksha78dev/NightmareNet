import numpy as np
import pytest

from nightmarenet_server.search.embedder import ExperimentDocument, ExperimentEmbedder
from nightmarenet_server.search.index import SearchIndex
from nightmarenet_server.search.query_parser import parse_query


def test_embedding_determinism_without_model() -> None:
    embedder = ExperimentEmbedder(model=False)
    doc = ExperimentDocument(
        run_id="exp-1",
        name="synonym stress",
        config={"distortions": ["synonym"], "nightmare_strength": 0.8},
        metrics={"robustness": 0.72},
    )

    first = embedder.embed_run(doc)
    second = embedder.embed_run(doc)

    assert first.shape == (384,)
    assert np.allclose(first, second)


def test_index_crud_and_persistence(tmp_path) -> None:
    index = SearchIndex(path=str(tmp_path), backend="numpy")
    vector = np.zeros(384, dtype=np.float32)
    vector[0] = 1

    index.add("run-1", vector, {"status": "completed"})
    assert index.search(vector, top_k=1)[0].run_id == "run-1"

    loaded = SearchIndex(path=str(tmp_path), backend="numpy")
    assert loaded.search(vector, top_k=1)[0].metadata["status"] == "completed"

    loaded.delete("run-1")
    assert loaded.search(vector) == []


def test_hybrid_filtering(tmp_path) -> None:
    index = SearchIndex(path=str(tmp_path), backend="numpy")
    query = np.zeros(384, dtype=np.float32)
    query[2] = 1
    index.add(
        "good",
        query,
        {
            "status": "completed",
            "model": "DistilBERT",
            "metrics": {"robustness": 0.82},
            "config": {"nightmare_strength": 0.8},
        },
    )
    other = np.zeros(384, dtype=np.float32)
    other[3] = 1
    index.add(
        "bad",
        other,
        {"status": "failed", "model": "GPT-2", "metrics": {"robustness": 0.2}},
    )

    hits = index.hybrid_search(
        query,
        filters={
            "status": "completed",
            "metrics": [{"field": "robustness", "op": ">", "value": 0.7}],
        },
    )

    assert [hit.run_id for hit in hits] == ["good"]

    config_hits = index.hybrid_search(
        query,
        filters={"metrics": [{"field": "nightmare_strength", "op": ">", "value": 0.7}]},
    )
    assert [hit.run_id for hit in config_hits] == ["good"]


def test_query_parser_extracts_filters() -> None:
    parsed = parse_query("completed runs where nightmare strength > 0.7 and not char_swap")

    assert parsed.filters["status"] == "completed"
    assert parsed.filters["exclude_terms"] == ["char_swap"]
    assert parsed.filters["metrics"][0] == {
        "field": "nightmare_strength",
        "op": ">",
        "value": 0.7,
    }


def test_search_endpoint_returns_ranked_results(monkeypatch, tmp_path) -> None:
    fastapi = pytest.importorskip("fastapi")
    testclient = pytest.importorskip("fastapi.testclient")
    from nightmarenet_server.search import endpoints as search_endpoints

    index = SearchIndex(path=str(tmp_path), backend="numpy")
    vector = np.zeros(384, dtype=np.float32)
    vector[5] = 1
    index.add(
        "exp-47",
        vector,
        {
            "run_id": "exp-47",
            "name": "char-swap robustness",
            "model": "DistilBERT",
            "status": "completed",
            "metrics": {"robustness": 0.91},
        },
    )

    class DummyEmbedder:
        def embed_query(self, query: str) -> np.ndarray:
            return vector

    monkeypatch.setattr(search_endpoints, "get_embedder", lambda: DummyEmbedder())
    monkeypatch.setattr(search_endpoints, "get_index", lambda: index)

    app = fastapi.FastAPI()
    app.include_router(search_endpoints.build_search_router())
    client = testclient.TestClient(app)

    response = client.post(
        "/api/v1/search",
        json={"query": "completed runs with robustness > 0.8", "top_k": 5},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["results"][0]["run_id"] == "exp-47"
    assert body["results"][0]["relevance_score"] > 0
    assert body["filters"]["status"] == "completed"
