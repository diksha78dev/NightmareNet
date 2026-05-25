# Product Improvement Backlog

Tracked through the `consumer-product-improvement` skill's *Analyze → Critique → Reimagine → Stress Test → Improve → Refine* loop. Append entries; never delete (mark `[shipped]` or `[deferred]` instead).

## Shipped this iteration (2026-05-26)

- **[shipped]** First-run `OnboardingOverlay` — 4-step tour with localStorage-gated dismissal and "Try it now" CTA jumping to Distortion Preview.
- **[shipped]** Global keyboard shortcut vocabulary — `Cmd/Ctrl+K`, `?`, `Esc`, plus `g`-prefix navigation across all 12 sections. Suppressed in text inputs.
- **[shipped]** `KeyboardHelp` overlay — grouped shortcut catalog, ? to toggle.
- **[shipped]** Fuzzy palette ranking — prefix > substring > subsequence scoring, recency bonus, dedicated "Recent" group when query is empty.
- **[shipped]** `AskNightmareDock` — floating-button context-aware copilot with per-section hints and 1-click next-step suggestions. Heuristic v1; LLM streaming endpoint is the next swap-in.
- **[shipped]** `ToastProvider` wired globally — every palette/g-shortcut/action fires structured toast feedback (variant + duration).

## Top of backlog (next iteration)

| Rank | Opportunity | Persona | Effort | Notes |
|-----:|-------------|---------|:------:|-------|
| 1 | Intelligent empty states component | First-time user | S | Replace mock data with helpful CTAs when the user has 0 runs / 0 experiments. One component reused across panels. |
| 2 | Theme toggle (light/dark) with persistence | Mobile / accessibility | M | Heavy dark design — needs careful palette inversion to preserve cyberpunk feel. |
| 3 | Wire `AskNightmareDock` to a streaming `/api/v1/copilot` endpoint | All | M | Backend = Azure OpenAI / Anthropic with context = current section + recent runs JSON. |
| 4 | Per-user palette command history sync | Power user | S | Currently localStorage; sync to `api_keys.last_used_at`-style server store when logged in. |
| 5 | Inline action menus on `ExperimentList` rows | Power user | S | Right-click / overflow-button "Compare", "Re-run with…", "Export", "Delete". |
| 6 | "What's new" overlay on first dashboard visit after a deploy | Daily user | S | Compare `BUILD_SHA` localStorage cookie vs current build; show changelog cards. |
| 7 | Skeleton loaders matching final component shape | Mobile / slow network | S | Currently spinners; replace with shape-matched skeleton screens. |
| 8 | Marketing home → `/dashboard` CTA with shared session storage for the example text | First-time user | S | Make the "Try it" button on the landing page carry the user's pasted text into the live dashboard. |
| 9 | Quick re-run with mutated config | Power user | M | Hover any run → "Re-run with strength × 1.2" / "Re-run on GPT-2" — preset variations. |
| 10 | Robustness badge widget for external README embeds | Growth | S | `<img src=".../badge/{repo}/robustness.svg">` like shields.io; viral surface. |

## Deeper opportunities (research / experiment)

- **Memory system across sessions** — the dashboard "remembers" which panels each user views most, and reorders the sidebar to surface them first.
- **Semantic search across runs + audit log** — "show me runs where dream@0.7 dropped below 0.6" without writing a query.
- **Slack/Discord integration** — push run-complete + regression-detected events.
- **Compare to industry baseline** — anonymized aggregate from the hosted platform: "your robustness is in the 73rd percentile for DistilBERT/SST-2."
- **Cycle scheduling** — natural-language schedule input ("run a benchmark every Friday at 6pm") routed through Celery beat.
- **Mobile companion view** — read-only run-status view optimized for phones; push notifications.
- **Robustness diff badges in PR comments** — the existing composite Action could write a PR comment with a sparkline diff vs main.
- **Replay mode** — scrub through a run's timeline as if it were a video, with phase boundaries and loss-curve overlay.
- **Distortion DSL** — let power users compose custom distortion chains in YAML, with live preview.

## Review cadence

This file is re-scored after every shipped iteration. Top of backlog moves into "Shipped this iteration" only with: tests passing, lint clean, frontend build green, manual UX walkthrough recorded.
