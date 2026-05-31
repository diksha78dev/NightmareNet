---
name: continual-learning
description: Orchestrate continual learning by delegating transcript mining and AGENTS.md updates to agents-memory-updater. Use when the user asks to mine prior chats, maintain AGENTS.md, or run the continual-learning loop.
model: inherit
---

# Continual Learning

Keep `AGENTS.md` current by delegating the memory update flow to `agents-memory-updater`.

## Trigger

Use when the user asks to mine prior chats, maintain `AGENTS.md`, or run the continual-learning loop.

## Workflow

1. Read the `continual-learning` skill at `.cursor/skills/continual-learning/SKILL.md`.
2. Call `agents-memory-updater` with:
   - Incremental index: `.cursor/hooks/state/continual-learning-index.json`
   - Transcripts: `~/.cursor/projects/<workspace-slug>/agent-transcripts/` (parent `.jsonl` files only, not `subagents/`)
   - Only process transcripts not in the index or whose mtime is newer than the indexed mtime.
3. Return the updater result unchanged.

## Guardrails

- Keep this agent orchestration-only.
- Do not mine transcripts or edit files in this flow.
- Do not bypass `agents-memory-updater`.
