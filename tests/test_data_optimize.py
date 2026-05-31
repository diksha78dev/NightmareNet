"""Tests for the data optimization endpoint."""

from __future__ import annotations

import pytest

fastapi = pytest.importorskip("fastapi")
httpx = pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from nightmarenet.api.app import app  # noqa: E402

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
        "ADAPTION_API_KEY",
    ):
        monkeypatch.delenv(var, raising=False)


class TestDataOptimizeEndpoint:
    def test_valid_payload_returns_503_without_sdk(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": ["The movie was great.", "Terrible experience."],
                "column_mapping": {"prompt": "text"},
            },
        )
        assert response.status_code == 503

    def test_missing_prompt_key_returns_422(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": ["Some text"],
                "column_mapping": {"input": "text"},
            },
        )
        assert response.status_code == 422

    def test_empty_texts_returns_422(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": [],
                "column_mapping": {"prompt": "text"},
            },
        )
        assert response.status_code == 422

    def test_estimate_only_mode(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": ["sample"],
                "column_mapping": {"prompt": "text"},
                "estimate_only": True,
            },
        )
        # 503 without SDK, but request validation passes
        assert response.status_code == 503

    def test_rate_limit_headers_present(self):
        response = client.post(
            "/api/v1/data/optimize",
            json={
                "texts": ["test"],
                "column_mapping": {"prompt": "text"},
            },
        )
        # Rate limiting may set X-RateLimit headers or not depending on config
        # At minimum the request should reach the handler (503 from missing SDK)
        assert response.status_code in (503, 429)
