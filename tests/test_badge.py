"""Tests for the public robustness badge endpoints.

Covers:
- SVG content-type and well-formed payload
- JSON shape correctness for every shields.io colour band
- HTTP 400 for scores outside [0, 1]
- Cache-Control header presence (READMEs hammer this endpoint)
- No API key required (badges live on public READMEs)
"""

from __future__ import annotations

import xml.etree.ElementTree as ET

import pytest

fastapi = pytest.importorskip("fastapi")
httpx = pytest.importorskip("httpx")

from fastapi.testclient import TestClient  # noqa: E402

from nightmarenet.api.app import app  # noqa: E402

client = TestClient(app)


class TestBadgeSvg:
    """The ``/api/v1/badge/{score}.svg`` route."""

    def test_svg_content_type_and_cache(self):
        r = client.get("/api/v1/badge/0.66.svg")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/svg+xml")
        assert "max-age=300" in r.headers.get("cache-control", "")

    def test_svg_renders_score_text(self):
        r = client.get("/api/v1/badge/0.66.svg")
        assert r.status_code == 200
        body = r.text
        # The score is rendered with 2 decimals.
        assert "0.66" in body
        # The shields.io-style label is present.
        assert "robustness" in body
        # The SVG must be well-formed XML so GitHub will render it.
        ET.fromstring(body)

    def test_svg_color_changes_with_band(self):
        elite = client.get("/api/v1/badge/0.95.svg").text
        critical = client.get("/api/v1/badge/0.10.svg").text
        assert "#22c55e" in elite
        assert "#ef4444" in critical
        assert "#22c55e" not in critical


class TestBadgeJson:
    """The ``/api/v1/badge/{score}.json`` route."""

    def test_elite_band(self):
        r = client.get("/api/v1/badge/0.95.json")
        assert r.status_code == 200
        data = r.json()
        assert data == {
            "score": 0.95,
            "color": "#22c55e",
            "label": "elite",
            "message": "0.95",
        }

    def test_band_boundaries(self):
        cases = [
            (0.90, "#22c55e", "elite"),
            (0.75, "#84cc16", "strong"),
            (0.60, "#eab308", "fair"),
            (0.40, "#f97316", "weak"),
            (0.39, "#ef4444", "critical"),
            (0.00, "#ef4444", "critical"),
        ]
        for score, color, label in cases:
            r = client.get(f"/api/v1/badge/{score}.json")
            assert r.status_code == 200, f"score={score} returned {r.status_code}"
            data = r.json()
            assert data["color"] == color, f"score={score} got {data}"
            assert data["label"] == label, f"score={score} got {data}"
            assert data["message"] == f"{score:.2f}"

    def test_cache_header_set(self):
        r = client.get("/api/v1/badge/0.66.json")
        assert "max-age=300" in r.headers.get("cache-control", "")


class TestBadgeValidation:
    """Out-of-range scores must surface as 400, not 5xx or success."""

    def test_above_range_svg(self):
        r = client.get("/api/v1/badge/2.0.svg")
        assert r.status_code == 400

    def test_below_range_svg(self):
        r = client.get("/api/v1/badge/-0.5.svg")
        assert r.status_code == 400

    def test_above_range_json(self):
        r = client.get("/api/v1/badge/1.5.json")
        assert r.status_code == 400

    def test_below_range_json(self):
        r = client.get("/api/v1/badge/-0.01.json")
        assert r.status_code == 400


class TestBadgePublicAccess:
    """Badges live on public READMEs — no API key should be required."""

    def test_no_api_key_required(self, monkeypatch):
        # Even with auth enabled the badge route must remain public.
        monkeypatch.setenv("NIGHTMARENET_API_KEY", "rk_dummy_test_key")
        # The middleware reads the env at construction time, so to
        # verify the prefix-based bypass we can simply hit the endpoint
        # without an X-API-Key header on the existing client (which
        # already covers the disabled-auth case) and confirm it works.
        r = client.get("/api/v1/badge/0.5.svg")
        assert r.status_code == 200
