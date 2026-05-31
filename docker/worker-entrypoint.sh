#!/usr/bin/env bash
# NightmareNet worker entrypoint.
#
# Starts a Celery worker when Celery is installed; otherwise falls back to
# an in-process polling loop so the container remains useful in environments
# that have not yet wired the full hosted stack.

set -euo pipefail

CONCURRENCY="${CELERY_CONCURRENCY:-2}"
LOGLEVEL="${CELERY_LOGLEVEL:-info}"
APP="nightmarenet_server.tasks.celery_app:celery_app"

if python -c "import celery" >/dev/null 2>&1; then
    echo "[worker] Starting Celery worker (app=${APP}, concurrency=${CONCURRENCY})"
    exec celery -A "${APP}" worker --loglevel="${LOGLEVEL}" --concurrency="${CONCURRENCY}"
else
    echo "[worker] Celery not installed — running in-process fallback loop."
    exec python -m nightmarenet_server.tasks.fallback_worker
fi
