# Contributing to NightmareNet

Thank you for helping improve NightmareNet. This project uses a **research-first, verification-driven** workflow: every change is justified, tested, and traceable. The sections below take you from a fresh clone to a merged PR.

---

## Table of Contents

1. [Local development setup](#1-local-development-setup)
2. [Architecture pointers (OSS core vs hosted platform)](#2-architecture-pointers)
3. [Adding a new distortion](#3-adding-a-new-distortion)
4. [Coding standards](#4-coding-standards)
5. [PR checklist](#5-pr-checklist)
6. [Where to ask for help](#6-where-to-ask-for-help)

---

## 1. Local development setup

### Prerequisites

- Python **3.12** is the recommended development version. The package supports 3.9-3.12; CUDA wheels are easiest on 3.12.
- Git, Node.js 20+ (only if you touch `frontend/`), and Docker (only if you touch the hosted-platform infra).
- Optional: NVIDIA GPU. The repo is dev-tested on a 4 GB RTX 3050 Ti.

### Clone and create a venv

```bash
git clone https://github.com/Adit-Jain-srm/NightmareNet.git
cd NightmareNet

python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate
```

### Install in editable mode with all dev tools

```bash
pip install -U pip
pip install -e ".[dev,api]"
```

The `dev` extra brings in `pytest`, `ruff`, `mypy`, and the test fixtures. The `api` extra brings in `fastapi`, `uvicorn`, and `slowapi` for the FastAPI service.

### Pre-commit hooks (recommended)

```bash
pip install pre-commit
pre-commit install
```

This runs `ruff` and a small set of fast checks on every commit. To run on the whole repo at once:

```bash
pre-commit run --all-files
```

### Verify the environment

```bash
pytest tests/ -v --tb=short          # 288+ tests, all should pass
ruff check .                         # zero errors expected
mypy nightmarenet/                   # type-check the OSS core
```

If you also touched the dashboard:

```bash
cd frontend
npm install
npm run build                        # production build
npm run dev                          # dev server on :3000
```

### Start the API for ad-hoc testing

```bash
uvicorn nightmarenet.api.app:app --reload --port 8000
```

Hit `http://127.0.0.1:8000/api/v1/health` to confirm.

---

## 2. Architecture pointers

NightmareNet has a strict OSS / hosted boundary. Treat it as a hard constraint when adding code.

| Package | Purpose | Allowed dependencies |
|---------|---------|---------------------|
| `nightmarenet/` | OSS core: distortions, training loop, evaluation, CLI, FastAPI inference endpoints | `torch`, `transformers`, `pydantic`, `fastapi`, `pyyaml`, `slowapi` (optional) |
| `nightmarenet_server/` *(future)* | Hosted platform: auth, multi-tenant DB, Celery workers, billing | OSS core + `sqlalchemy`, `redis`, `celery`, `stripe`, `psycopg2` |
| `frontend/` | Next.js 14 dashboard, design system, charts | npm ecosystem only; talks to OSS API or hosted API via `NEXT_PUBLIC_API_URL` / rewrites |

> [!IMPORTANT]
> The OSS core **must not** import anything from `nightmarenet_server`, and **must not** depend on PostgreSQL, Redis, Celery, OAuth providers, or any hosted-only library. If your change touches both, propose the boundary explicitly in the PR description and split the patches.

### Key entry points

- `nightmarenet.pipeline.Pipeline` — orchestrator for the 4-phase cycle
- `nightmarenet.cli.main` — the `nightmarenet` console entry point
- `nightmarenet.distortions.registry.get_registry` — the lazy-singleton plugin registry
- `nightmarenet.evaluation.evaluator.Evaluator` — multi-strength robustness scoring
- `nightmarenet.api.app` — FastAPI app exposing the OSS HTTP surface

### Documentation map

- [`docs/architecture/PRD.md`](docs/architecture/PRD.md) — product requirements, personas, success metrics, requirements traceability
- [`docs/architecture/TRD.md`](docs/architecture/TRD.md) — technical requirements
- [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — OpenAPI spec for the OSS HTTP surface
- [`docs/research/paper-draft.md`](docs/research/paper-draft.md) — academic paper draft (cite this in PRs that touch the algorithm)
- [`docs/research/benchmark-v1.md`](docs/research/benchmark-v1.md) — reproducible benchmark methodology
- [`.cursor/plans/`](.cursor/plans) — sprint-level execution plans

---

## 3. Adding a new distortion

Distortions are first-class plugins. The full walkthrough is in [`notebooks/03_custom_distortions.ipynb`](notebooks/03_custom_distortions.ipynb); the short version follows.

### The signature

Every distortion must match:

```python
from typing import Optional

DistortionFn = Callable[[str, float, Optional[int]], str]
```

That is: take a string, a strength in `[0.0, 1.0]`, and an optional seed; return the distorted string.

### Registration

For an in-tree distortion, drop a module under `nightmarenet/distortions/your_engine.py` exposing a `distort(text, strength, seed)` function and add it to the registry's `_register_builtins` in `nightmarenet/distortions/registry.py`. For a third-party plugin shipped as a separate package, expose a `register_distortion` decorator pattern (see notebook 03):

```python
from nightmarenet.distortions.registry import get_registry

def register_distortion(name, *, phase='custom', description=''):
    def decorator(fn):
        get_registry().register(name, fn, metadata={'phase': phase, 'description': description})
        return fn
    return decorator

@register_distortion('homoglyph', phase='nightmare', description='Latin -> Cyrillic swap')
def homoglyph(text, strength, seed=None):
    ...
```

### Tests

Mirror the package layout under `tests/`. At minimum:

1. **Determinism** — same `(text, strength, seed)` produces the same output across runs.
2. **Strength 0** is approximately a no-op.
3. **Strength 1** produces a measurable change.
4. **Empty input** returns empty without raising.
5. **Registry round-trip** — `get_registry().apply('your_engine', ...)` returns the same string as calling the function directly.

### Documentation

- Add a row to the README's "Distortion Types" or expand the relevant section.
- If your distortion is a known adversarial attack from a paper, cite the paper in the module docstring and in `docs/research/paper-draft.md` Related Work.

---

## 4. Coding standards

### Python

- **Line length:** 100 (enforced by ruff).
- **Ruff rules:** `E, F, W, I, N, UP, B`. We ignore `UP007` and `UP045` to keep `Union[X, Y]` available in 3.9-targeted code.
- **Imports:** isort via ruff. Order: stdlib, third-party, local; alphabetical within each group.
- **Type hints:**
  - Use `Union[X, Y]` and `Optional[X]` — **not** `X | Y` — in any code path that runs on Python 3.9.
  - Use `from __future__ import annotations` everywhere **except** modules under `nightmarenet/api/` that use FastAPI `Body(...)`. The future import breaks Pydantic v2 at runtime there. Prefer module-level singletons for `Body(...)` defaults to satisfy `B008`.
- **Docstrings:** Google style on public APIs only. Internal helpers can be terse.
- **Errors:** raise with context (`raise X("...") from e`); never bare `raise X`.
- **No NaN/Inf in metrics:** wrap suspicious arithmetic with the helpers in `nightmarenet/evaluation/metrics.py`.
- **Logging:** use module loggers (`logger = logging.getLogger(__name__)`); don't `print` in library code.

### Frontend

- TypeScript only. No `any` in committed code.
- Tailwind v4 — theme lives in the `@theme inline` block, not a `tailwind.config.js`.
- Animations via Framer Motion; respect `prefers-reduced-motion`.
- Keep client bundles lean; lazy-load heavy charts where possible.

### Tests

- Tests live in `tests/` and mirror the package structure (`tests/test_distortions.py`, `tests/test_pipeline.py`, etc.).
- Use `monkeypatch` for env-var manipulation; never mutate `os.environ` directly.
- Aim for fast tests (< 30s for the whole suite excluding training-heavy ones). Mark slow tests with `@pytest.mark.slow`.
- Never reduce the test count. If you delete tests, the PR description must explain why.

### Git

- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `perf:`.
- One concern per commit. Squash exploratory commits before pushing.
- Branch names: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`.

---

## 5. PR checklist

Before requesting review, confirm every box.

- [ ] `pytest tests/ -v --tb=short` — green locally.
- [ ] `ruff check .` — zero errors.
- [ ] `mypy nightmarenet/` — no new errors.
- [ ] If frontend changed: `cd frontend && npm run build` succeeds.
- [ ] No `from __future__ import annotations` added under `nightmarenet/api/`.
- [ ] No new `nightmarenet/` import of a hosted-only library (`sqlalchemy`, `redis`, `celery`, `psycopg2`, `stripe`).
- [ ] New code is type-annotated; new public APIs have Google-style docstrings.
- [ ] New distortions / metrics / phases are tested for determinism, edge inputs, and registry round-trip.
- [ ] If the algorithm changed: `docs/research/paper-draft.md` and `docs/research/benchmark-v1.md` updated.
- [ ] If a user-facing change: `README.md`, `CHANGELOG.md`, and any affected notebook in `notebooks/` updated.
- [ ] PR description includes:
  - one-paragraph summary
  - link to the issue / discussion
  - **before / after** behavior (or numbers, when applicable)
  - any breaking change explicitly called out at the top.

CI mirrors the local checks plus a security scan. Merging is blocked on a green CI and one approving review.

---

## 6. Where to ask for help

- **GitHub Discussions** — `https://github.com/Adit-Jain-srm/NightmareNet/discussions`
  - `q-and-a` for "how do I..." questions
  - `ideas` for feature proposals (RFC threads welcome)
  - `research` for paper-related discussion, benchmark proposals, citation requests
- **GitHub Issues** — bug reports and concrete tasks
- **Discord** — `https://discord.gg/nightmarenet` *(launching with Sprint 8)*; channels for `#dev`, `#research`, `#hosted-platform`, `#help`
- **Direct contact** — for security disclosures, email the maintainers per [`SECURITY.md`](SECURITY.md). Do **not** open public issues for vulnerabilities.

We respond fastest to issues that include a minimal reproducible example, the relevant config snippet, and the output of `pip list | findstr nightmarenet` (or `pip freeze | grep nightmarenet` on Unix).

---

Welcome to the project. We are excited to see what you build.
