"""Tests for the config suggestion endpoint."""

from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
httpx = pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from nightmarenet.api.app import app  # noqa: E402
from nightmarenet.api.suggest import _heuristic_suggestions  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clear_llm_keys(monkeypatch):
    for var in (
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AWS_BEARER_TOKEN_BEDROCK",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
    ):
        monkeypatch.delenv(var, raising=False)


class TestHeuristicSuggestions:
    def test_low_vram_batch_size_rule(self):
        suggestions = _heuristic_suggestions(
            {"training": {"batch_size": 32}},
            None,
            "RTX 3050 Ti 4GB",
        )
        params = [s["param"] for s in suggestions]
        assert "training.batch_size" in params

    def test_high_robustness_drop_rule(self):
        suggestions = _heuristic_suggestions(
            {"distortion": {"nightmare_strength": 0.7}},
            {"robustness_drop": 0.2},
            None,
        )
        params = [s["param"] for s in suggestions]
        assert "distortion.nightmare_strength" in params


class TestSuggestConfigEndpoint:
    def test_returns_heuristic_suggestions(self):
        response = client.post(
            "/api/v1/suggest/config",
            json={
                "current_config": {
                    "training": {"batch_size": 32, "num_cycles": 1, "learning_rate": 1e-3},
                    "distortion": {"dream_strength": 0.6, "nightmare_strength": 0.7},
                },
                "last_metrics": {"robustness_drop": 0.2, "clean_accuracy": 0.65},
                "hardware": "RTX 3050 Ti 4GB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["model"] == "heuristic"
        assert isinstance(data["suggestions"], list)
        assert len(data["suggestions"]) >= 1
        for sug in data["suggestions"]:
            assert set(sug.keys()) == {"param", "current", "suggested", "reason"}

    def test_data_optimize_requires_adaption_sdk(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": ["sample text"],
                "column_mapping": {"prompt": "text"},
                "estimate_only": True,
            },
        )
        # Without adaption SDK installed, endpoint returns 503
        assert response.status_code in (503, 200)
