"""Liveness probe for the NightmareNet worker container.

Replaces a previous tautological check (`os.environ.get(...)`) that always
returned 0 because the same env var was hardcoded via ``ENV`` in the
Dockerfile.

Strategy
--------
1. **Broker reachability** (always): open a TCP socket to the host/port parsed
   from ``NIGHTMARENET_REDIS_URL`` with a short timeout. Both Celery mode and
   the in-process fallback loop are useless if the broker is unreachable.
2. **Worker liveness** (Celery mode only): if ``celery`` is installed and a
   ``celery_app`` was successfully built, call ``celery_app.control.ping(...)``.
   This returns the list of worker replies — empty means the worker is not
   consuming from the broker even though the process may still be alive
   (e.g. a hung event loop, stuck on a stale connection).
3. **Fallback mode**: when Celery is not installed, the entrypoint runs
   ``python -m nightmarenet_server.tasks.fallback_worker`` as PID 1. If that
   process dies the container exits — Docker already handles restart — so
   the broker probe is sufficient for liveness in this mode.

Exit codes:
    0   healthy
    1   unhealthy (with a short reason on stderr)
"""

import os
import socket
import sys
from typing import Tuple
from urllib.parse import urlparse

BROKER_URL = os.environ.get("NIGHTMARENET_REDIS_URL", "redis://redis:6379/0")
TIMEOUT_S = float(os.environ.get("NIGHTMARENET_HEALTHCHECK_TIMEOUT", "3.0"))


def _redact(url: str) -> str:
    """Strip any password from a broker URL before logging."""
    try:
        u = urlparse(url)
        if u.password:
            netloc = u.hostname or ""
            if u.port:
                netloc = f"{netloc}:{u.port}"
            if u.username:
                netloc = f"{u.username}:***@{netloc}"
            return f"{u.scheme}://{netloc}{u.path}"
    except Exception:
        return "<unparseable>"
    return url


def check_broker_reachable(url: str = BROKER_URL, timeout: float = TIMEOUT_S) -> Tuple[bool, str]:
    """Open a TCP connection to ``url``'s host:port within ``timeout`` seconds."""
    try:
        parsed = urlparse(url)
        host = parsed.hostname or "redis"
        port = parsed.port or 6379
    except Exception as exc:
        return False, f"could not parse broker url: {exc}"

    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, f"broker reachable at {host}:{port}"
    except (OSError, socket.timeout) as exc:
        return False, f"broker unreachable at {host}:{port} ({exc})"


def check_celery_worker(timeout: float = TIMEOUT_S) -> Tuple[bool, str]:
    """Ping the Celery worker for this host.

    Returns ``(True, "fallback mode")`` when Celery is not installed — the
    broker check is the authoritative signal in that case.
    """
    try:
        from nightmarenet_server.tasks.celery_app import celery_app
    except Exception as exc:  # pragma: no cover - defensive
        return True, f"celery_app import failed ({type(exc).__name__}); broker-only mode"

    if celery_app is None:
        return True, "celery not installed; fallback mode"

    try:
        replies = celery_app.control.ping(timeout=timeout)
    except Exception as exc:
        return False, f"celery ping raised: {type(exc).__name__}: {exc}"

    if not replies:
        return False, "celery worker did not reply to ping"

    return True, f"celery worker responded ({len(replies)} reply/replies)"


def main() -> int:
    redacted = _redact(BROKER_URL)

    broker_ok, broker_msg = check_broker_reachable()
    if not broker_ok:
        sys.stderr.write(f"[unhealthy] {broker_msg} (url={redacted})\n")
        return 1

    celery_ok, celery_msg = check_celery_worker()
    if not celery_ok:
        sys.stderr.write(f"[unhealthy] {celery_msg}\n")
        return 1

    sys.stdout.write(f"[healthy] {broker_msg}; {celery_msg}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
