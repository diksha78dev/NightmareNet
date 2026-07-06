"""Crash recovery and checkpoint resume logic."""

from __future__ import annotations

import json
import logging
import os

import torch

from nightmarenet.distributed.checkpoint import compute_config_hash

logger = logging.getLogger(__name__)


class ResumeManager:
    """Manages restoring state from the latest complete checkpoint."""

    def __init__(self, resume_dir: str) -> None:
        self.resume_dir = resume_dir

    def verify_and_load(
        self,
        model: torch.nn.Module,
        optimizer: torch.optim.Optimizer,
        current_config: dict
    ) -> dict:
        """Loads state into model and optimizer and returns metadata."""
        if not os.path.exists(self.resume_dir):
            raise FileNotFoundError(f"Resume directory {self.resume_dir} not found.")

        sentinel_path = os.path.join(self.resume_dir, ".complete")
        if not os.path.exists(sentinel_path):
            raise RuntimeError(
                f"Checkpoint at {self.resume_dir} is incomplete (.complete missing)."
            )

        meta_path = os.path.join(self.resume_dir, "metadata.json")
        if not os.path.exists(meta_path):
            raise RuntimeError(f"Metadata missing in {self.resume_dir}.")

        with open(meta_path) as f:
            metadata = json.load(f)

        expected_hash = compute_config_hash(current_config)
        if metadata.get("config_hash") != expected_hash:
            logger.warning(
                "Config hash mismatch on resume. Training configuration may have changed."
            )

        # Load Model
        model_file = os.path.join(self.resume_dir, "model.pt")
        if os.path.exists(model_file):
            model_to_load = model.module if hasattr(model, "module") else model
            model_to_load.load_state_dict(torch.load(model_file, map_location="cpu"))
            logger.info("Loaded model weights from checkpoint.")

        # Load Optimizer
        opt_file = os.path.join(self.resume_dir, "optimizer.pt")
        if os.path.exists(opt_file):
            optimizer.load_state_dict(torch.load(opt_file, map_location="cpu"))
            logger.info("Loaded optimizer state from checkpoint.")

        # Load RNG
        rng_file = os.path.join(self.resume_dir, "rng_state.pt")
        if os.path.exists(rng_file):
            rng_states = torch.load(rng_file)
            torch.set_rng_state(rng_states["cpu"])
            if torch.cuda.is_available() and "cuda" in rng_states:
                torch.cuda.set_rng_state_all(rng_states["cuda"])
            logger.info("Loaded RNG states from checkpoint.")

        return metadata
