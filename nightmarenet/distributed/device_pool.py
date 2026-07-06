"""GPU discovery and resource management for distributed training."""

from __future__ import annotations

import logging
from typing import Optional

import torch

logger = logging.getLogger(__name__)


class DevicePool:
    """Discovers available GPUs and determines optimal placement."""

    def __init__(self, override_devices: Optional[list[int]] = None) -> None:
        """
        Args:
            override_devices: Optional list of explicit device IDs to use.
        """
        self.override_devices = override_devices
        self.available_devices = self._discover_devices()

    def _discover_devices(self) -> list[int]:
        if self.override_devices is not None:
            return self.override_devices
        if not torch.cuda.is_available():
            return []
        return list(range(torch.cuda.device_count()))

    def get_num_devices(self) -> int:
        return len(self.available_devices)

    def estimate_memory_requirements(self, num_params: int) -> float:
        """Estimate required VRAM in GB.

        Assumes:
        - 4 bytes per param (FP32)
        - 3x multiplier (model + gradients + optimizer state)
        - 20% buffer
        """
        bytes_per_param = 4
        multiplier = 3
        buffer_factor = 1.2
        total_bytes = num_params * bytes_per_param * multiplier * buffer_factor
        return total_bytes / (1024**3)

    def should_use_ddp(self) -> bool:
        """Determine if DDP is feasible."""
        return self.get_num_devices() > 1
