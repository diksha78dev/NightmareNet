"""Adaption Labs dataset optimization integration.

Wraps the Adaption SDK to provide dataset quality optimization
as an optional preprocessing step in the NightmareNet pipeline.
"""

import asyncio
import csv
import logging
import os
import signal
import tempfile
import time
from contextlib import contextmanager
from typing import Any, Callable, Dict, Generator, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

try:
    from adaption import Adaption
except ImportError:
    Adaption = None  # type: ignore[assignment, misc]

try:
    from datasets import Dataset as HFDataset
except ImportError:
    HFDataset = None  # type: ignore[assignment, misc]

__all__ = ["Adaption", "AdaptionOptimizer"]


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

_MAX_RETRIES = 3
_RETRY_BACKOFF: Tuple[float, ...] = (1.0, 2.0, 4.0)

_VALID_COLUMN_ROLES: Set[str] = frozenset({
    "prompt", "completion", "instruction", "input", "output",
    "question", "answer", "context", "system", "text",
})


def _timeout_seconds() -> float:
    raw = os.environ.get("NIGHTMARENET_ADAPTION_TIMEOUT", "600")
    try:
        return max(10.0, float(raw))
    except (ValueError, TypeError):
        return 600.0


# ---------------------------------------------------------------------------
# Client caching (instance-level, see AdaptionOptimizer._client)
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Retry helper
# ---------------------------------------------------------------------------

def _retry_call(
    fn: Callable[..., Any],
    args: Tuple[Any, ...] = (),
    kwargs: Optional[Dict[str, Any]] = None,
    description: str = "API call",
) -> Any:
    """Execute fn with exponential backoff retry on transient failures."""
    kwargs = kwargs or {}
    last_exc: Optional[Exception] = None

    for attempt in range(_MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            last_exc = exc
            if attempt < _MAX_RETRIES - 1:
                delay = _RETRY_BACKOFF[attempt]
                logger.warning(
                    "Adaption %s failed (attempt %d/%d), retrying in %.1fs: %s",
                    description, attempt + 1, _MAX_RETRIES, delay, exc,
                )
                time.sleep(delay)
            else:
                logger.error(
                    "Adaption %s failed after %d attempts: %s",
                    description, _MAX_RETRIES, exc,
                )

    raise last_exc  # type: ignore[misc]


# ---------------------------------------------------------------------------
# Temp file management
# ---------------------------------------------------------------------------

@contextmanager
def _managed_temp_files() -> Generator[List[str], None, None]:
    """Context manager that tracks temp file paths and cleans up on exit."""
    paths: List[str] = []

    original_sigint = signal.getsignal(signal.SIGINT)

    def _cleanup() -> None:
        for p in paths:
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except OSError:
                    pass

    def _sigint_handler(signum: int, frame: Any) -> None:
        _cleanup()
        if callable(original_sigint):
            original_sigint(signum, frame)
        else:
            raise KeyboardInterrupt

    try:
        signal.signal(signal.SIGINT, _sigint_handler)
    except (OSError, ValueError):
        pass

    try:
        yield paths
    finally:
        _cleanup()
        try:
            signal.signal(signal.SIGINT, original_sigint)
        except (OSError, ValueError):
            pass


# ---------------------------------------------------------------------------
# Quality metrics parsing
# ---------------------------------------------------------------------------

def _parse_quality_metrics(status: Any) -> Dict[str, Any]:
    """Extract all available quality metrics from a status response."""
    metrics: Dict[str, Any] = {}

    field_names = [
        "status", "row_count", "column_count", "quality_score",
        "completeness_score", "consistency_score", "accuracy_score",
        "duplicates_removed", "rows_improved", "rows_filtered",
        "total_tokens", "estimated_credits_consumed", "processing_time_seconds",
        "error_message", "warnings", "created_at", "completed_at",
        "original_row_count", "optimized_row_count",
    ]

    for field in field_names:
        value = getattr(status, field, None)
        if value is not None:
            metrics[field] = value

    if hasattr(status, "__dict__"):
        for key, value in status.__dict__.items():
            if not key.startswith("_") and key not in metrics and value is not None:
                metrics[key] = value

    return metrics


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_column_mapping(
    column_mapping: Dict[str, str],
    dataset_columns: Optional[List[str]] = None,
) -> None:
    """Validate column_mapping keys and values.

    Raises ValueError for invalid mappings.
    """
    if not column_mapping:
        raise ValueError("column_mapping must not be empty")

    if not isinstance(column_mapping, dict):
        raise ValueError(
            f"column_mapping must be a dict, got {type(column_mapping).__name__}"
        )

    for role, col_name in column_mapping.items():
        if not isinstance(role, str) or not role.strip():
            raise ValueError(f"column_mapping key must be a non-empty string, got {role!r}")
        if not isinstance(col_name, str) or not col_name.strip():
            raise ValueError(
                f"column_mapping value for role {role!r} must be a non-empty string"
            )

    if dataset_columns is not None:
        dataset_col_set = set(dataset_columns)
        for role, col_name in column_mapping.items():
            if col_name not in dataset_col_set:
                raise ValueError(
                    f"column_mapping references column {col_name!r} (role={role!r}) "
                    f"which does not exist in the dataset. "
                    f"Available columns: {sorted(dataset_col_set)}"
                )


# ---------------------------------------------------------------------------
# Main optimizer class
# ---------------------------------------------------------------------------

class AdaptionOptimizer:
    """Optimize datasets using the Adaption Labs API.

    Args:
        api_key: Adaption API key. Falls back to ``ADAPTION_API_KEY`` env var.
    """

    def __init__(self, api_key: Optional[str] = None) -> None:
        self._api_key = api_key or os.environ.get("ADAPTION_API_KEY")
        self._client: Optional[Any] = None

    def _get_client(self) -> Optional[Any]:
        if Adaption is None:
            logger.debug("adaption SDK not installed; skipping.")
            return None
        if not self._api_key:
            logger.debug("ADAPTION_API_KEY not set; skipping.")
            return None
        if self._client is None:
            self._client = Adaption(api_key=self._api_key)
        return self._client

    def optimize_dataset(
        self,
        dataset: Any,
        column_mapping: Dict[str, str],
        max_rows: int = 5000,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> Optional[Tuple[Any, Dict[str, Any]]]:
        """Upload, optimize, and download an improved dataset.

        Args:
            dataset: A HuggingFace ``datasets.Dataset`` instance.
            column_mapping: Mapping of Adaption roles to dataset columns,
                e.g. ``{"prompt": "text", "completion": "target"}``.
            max_rows: Maximum rows to send for optimization.
            on_progress: Optional callback ``(percent, stage_name)`` for progress reporting.

        Returns:
            Tuple of ``(optimized_dataset, quality_metrics)`` on success,
            or ``None`` if the SDK is unavailable or the call fails.

        Raises:
            ValueError: If column_mapping is invalid.
        """
        client = self._get_client()
        if client is None:
            return None

        if HFDataset is None:
            logger.error("datasets library not installed; cannot optimize.")
            return None

        _validate_column_mapping(column_mapping, list(dataset.column_names))

        def _emit(pct: float, stage: str) -> None:
            if on_progress is not None:
                on_progress(pct, stage)

        _emit(0.0, "preparing")

        with _managed_temp_files() as temp_paths:
            try:
                subset = dataset.select(range(min(len(dataset), max_rows)))
                _emit(5.0, "exporting_csv")

                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".csv", delete=False, newline="", encoding="utf-8"
                ) as tmp:
                    tmp_path = tmp.name
                    temp_paths.append(tmp_path)
                    columns = list(subset.column_names)
                    writer = csv.DictWriter(tmp, fieldnames=columns)
                    writer.writeheader()
                    for row in subset:
                        writer.writerow(row)

                _emit(15.0, "uploading")
                upload_result = _retry_call(
                    client.datasets.upload_file,
                    args=(tmp_path,),
                    description="upload_file",
                )
                dataset_id = upload_result.dataset_id
                logger.info("Uploaded dataset %s for optimization", dataset_id)

                _emit(25.0, "starting_optimization")
                client.datasets.run(dataset_id, column_mapping=column_mapping)

                _emit(30.0, "optimizing")
                timeout = _timeout_seconds()
                status = client.datasets.wait_for_completion(
                    dataset_id, timeout=int(timeout)
                )
                logger.info(
                    "Adaption optimization complete: status=%s",
                    getattr(status, "status", "done"),
                )

                _emit(75.0, "downloading")
                download_url = _retry_call(
                    client.datasets.download,
                    args=(dataset_id,),
                    description="download",
                )

                import urllib.request

                with tempfile.NamedTemporaryFile(
                    suffix=".csv", delete=False, mode="wb"
                ) as out_tmp:
                    out_path = out_tmp.name
                    temp_paths.append(out_path)
                    urllib.request.urlretrieve(download_url, out_path)

                _emit(90.0, "loading_result")
                optimized = HFDataset.from_csv(out_path)

                _emit(95.0, "evaluating_quality")
                quality = self.evaluate_quality(dataset_id) or {}

                _emit(100.0, "complete")
                return optimized, quality

            except (ValueError, KeyboardInterrupt):
                raise
            except Exception:
                logger.warning("Adaption optimization failed", exc_info=True)
                return None

    async def optimize_dataset_async(
        self,
        dataset: Any,
        column_mapping: Dict[str, str],
        max_rows: int = 5000,
        on_progress: Optional[Callable[[float, str], None]] = None,
    ) -> Optional[Tuple[Any, Dict[str, Any]]]:
        """Async wrapper around optimize_dataset.

        Runs the synchronous SDK calls in a thread pool to avoid blocking
        the event loop.
        """
        return await asyncio.to_thread(
            self.optimize_dataset, dataset, column_mapping, max_rows, on_progress
        )

    def estimate_cost(
        self,
        dataset: Any,
        column_mapping: Dict[str, str],
    ) -> Optional[Dict[str, Any]]:
        """Estimate optimization cost without running the full job.

        Returns:
            Dict with ``credits`` and ``estimated_minutes``, or ``None``.

        Raises:
            ValueError: If column_mapping is invalid.
        """
        client = self._get_client()
        if client is None:
            return None

        _validate_column_mapping(column_mapping, list(dataset.column_names))

        with _managed_temp_files() as temp_paths:
            try:
                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".csv", delete=False, newline="", encoding="utf-8"
                ) as tmp:
                    tmp_path = tmp.name
                    temp_paths.append(tmp_path)
                    columns = list(dataset.column_names)
                    writer = csv.DictWriter(tmp, fieldnames=columns)
                    writer.writeheader()
                    for row in dataset:
                        writer.writerow(row)

                upload_result = _retry_call(
                    client.datasets.upload_file,
                    args=(tmp_path,),
                    description="upload_file (estimate)",
                )
                dataset_id = upload_result.dataset_id

                run = client.datasets.run(
                    dataset_id, column_mapping=column_mapping, estimate=True
                )
                return {
                    "credits": float(getattr(run, "estimated_credits_consumed", 0)),
                    "estimated_minutes": float(getattr(run, "estimated_minutes", 0)),
                }
            except (ValueError, KeyboardInterrupt):
                raise
            except Exception:
                logger.warning("Adaption cost estimation failed", exc_info=True)
                return None

    def evaluate_quality(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve quality metrics for a completed optimization run.

        Args:
            dataset_id: The Adaption dataset identifier.

        Returns:
            Dict with all available quality metrics, or ``None``.
        """
        client = self._get_client()
        if client is None:
            return None

        try:
            status = client.datasets.get_status(dataset_id)
            return _parse_quality_metrics(status)
        except Exception:
            logger.warning("Adaption quality evaluation failed", exc_info=True)
            return None
