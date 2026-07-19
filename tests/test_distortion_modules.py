"""Tests for refactored distortion module imports in app.py.

Verifies that the DRY refactor (importing distort() from dream.py/nightmare.py
instead of inline logic) produces correct results.
"""
import nightmarenet.distortions.nightmare as nightmare_module
from nightmarenet.distortions.dream import distort as dream_distort
from nightmarenet.distortions.nightmare import distort as nightmare_distort


class TestDistortionModuleExports:
    """Verify dream.distort() and nightmare.distort() are callable and correct."""

    def test_dream_distort_returns_string(self):
        result = dream_distort("Hello world", strength=0.3, seed=42)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_dream_distort_with_zero_strength_preserves_text(self):
        text = "The model achieved high accuracy."
        result = dream_distort(text, strength=0.0, seed=42)
        assert result == text

    def test_nightmare_distort_returns_string(self):
        result = nightmare_distort("Hello world", strength=0.5, seed=42)
        assert isinstance(result, str)
        assert len(result) > 0

    def test_nightmare_distort_high_strength_modifies_text(self):
        text = "Neural networks process information efficiently."
        result = nightmare_distort(text, strength=0.9, seed=42)
        assert result != text

    def test_dream_distort_with_config(self):
        text = "Test input for config."
        config = {"text": {"char_swap": 0.5}}
        result = dream_distort(text, strength=0.5, seed=42, config=config)
        assert isinstance(result, str)

    def test_nightmare_distort_with_config(self):
        text = "Test input for config."
        config = {"adversarial": {"contradiction": 0.5, "ambiguity": 0.5}}
        result = nightmare_distort(text, strength=0.7, seed=42, config=config)
        assert isinstance(result, str)

    def test_dream_deterministic_with_seed(self):
        text = "Reproducible distortion test."
        r1 = dream_distort(text, strength=0.4, seed=123)
        r2 = dream_distort(text, strength=0.4, seed=123)
        assert r1 == r2

    def test_nightmare_deterministic_with_seed(self):
        text = "Reproducible distortion test."
        r1 = nightmare_distort(text, strength=0.6, seed=456)
        r2 = nightmare_distort(text, strength=0.6, seed=456)
        assert r1 == r2

    def test_empty_text_passes_through(self):
        assert dream_distort("", strength=0.5) == ""
        assert nightmare_distort("", strength=0.5) == ""


class TestNightmarePipeline:
    """Test nightmare pipeline orchestration."""

    def test_pipeline_order(self, monkeypatch):
        calls = []

        def fake_text(text, strength, config):
            calls.append("text")
            return text + "_text"

        def fake_semantic(text, strength, config):
            calls.append("semantic")
            assert text.endswith("_text")
            return text + "_semantic"

        def fake_adversarial(text, strength, config):
            calls.append("adversarial")
            assert text.endswith("_semantic")
            return text

        monkeypatch.setattr(
            nightmare_module,
            "apply_text_distortions",
            fake_text,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_semantic_distortions",
            fake_semantic,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_adversarial_distortions",
            fake_adversarial,
        )

        nightmare_module.distort("hello", strength=0.6)

        assert calls == ["text", "semantic", "adversarial"]

    def test_config_forwarding(self, monkeypatch):
        received = {}

        def fake_text(text, strength, config):
            received["text"] = config
            return text

        def fake_semantic(text, strength, config):
            received["semantic"] = config
            return text

        def fake_adversarial(text, strength, config):
            received["adversarial"] = config
            return text

        monkeypatch.setattr(
            nightmare_module,
            "apply_text_distortions",
            fake_text,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_semantic_distortions",
            fake_semantic,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_adversarial_distortions",
            fake_adversarial,
        )

        config = {
            "text": {"char_swap": 1.0},
            "semantic": {"synonym_replace": 0.5},
            "adversarial": {"ambiguity": 0.7},
        }

        nightmare_module.distort(
            "hello",
            strength=0.5,
            config=config,
        )

        assert received["text"] == config["text"]
        assert received["semantic"] == config["semantic"]
        assert received["adversarial"] == config["adversarial"]

    def test_default_adversarial_config_created(self, monkeypatch):
        received = {}

        monkeypatch.setattr(
            nightmare_module,
            "apply_text_distortions",
            lambda text, strength, config: text,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_semantic_distortions",
            lambda text, strength, config: text,
        )

        def fake_adv(text, strength, config):
            received["config"] = config
            return text

        monkeypatch.setattr(
            nightmare_module,
            "apply_adversarial_distortions",
            fake_adv,
        )

        nightmare_module.distort("hello", strength=0.8)

        assert received["config"] is not None
        assert "contradiction" in received["config"]
        assert "ambiguity" in received["config"]
        assert "cross_domain" in received["config"]
        assert "misleading_context" in received["config"]
        assert "learned" in received["config"]

    def test_no_default_adversarial_config_below_threshold(self, monkeypatch):
        received = {}

        monkeypatch.setattr(
            nightmare_module,
            "apply_text_distortions",
            lambda text, strength, config: text,
        )
        monkeypatch.setattr(
            nightmare_module,
            "apply_semantic_distortions",
            lambda text, strength, config: text,
        )

        def fake_adv(text, strength, config):
            received["config"] = config
            return text

        monkeypatch.setattr(
            nightmare_module,
            "apply_adversarial_distortions",
            fake_adv,
        )

        nightmare_module.distort("hello", strength=0.4)

        assert received["config"] is None
