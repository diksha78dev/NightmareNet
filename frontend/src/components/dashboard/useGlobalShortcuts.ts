"use client";

import { useEffect, useState } from "react";
import type { DashboardSectionKey } from "./Sidebar";

/**
 * Global keyboard shortcut vocabulary.
 *
 * - `Cmd/Ctrl+K` — toggle command palette
 * - `?` — toggle keyboard-shortcut help overlay
 * - `g` then a target letter — go-to navigation
 *
 * Inspired by Vercel, Linear, and GitHub keyboard models. All bindings are
 * suppressed while the user is typing into an input, textarea, or
 * contenteditable element so we don't fight with editing.
 */
export interface GlobalShortcutHandlers {
  onPaletteToggle: () => void;
  onHelpToggle: () => void;
  onNavigate: (section: DashboardSectionKey) => void;
}

const GO_MAP: Record<string, DashboardSectionKey> = {
  c: "command-center",
  e: "experiments",
  r: "run-detail",
  p: "phases",
  m: "metrics",
  o: "robustness",
  v: "compare",
  d: "distortions",
  a: "audit",
  b: "benchmarks",
  i: "ci",
  s: "settings",
};

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

export function useGlobalShortcuts(handlers: GlobalShortcutHandlers): void {
  useEffect(() => {
    let leader = false;
    let leaderTimer: ReturnType<typeof setTimeout> | null = null;

    const onKey = (e: KeyboardEvent) => {
      const metaOrCtrl = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+K → palette
      if (metaOrCtrl && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        handlers.onPaletteToggle();
        return;
      }

      if (isTypingTarget(e.target)) return;

      // ? → help (Shift+/ on most layouts)
      if (e.key === "?") {
        e.preventDefault();
        handlers.onHelpToggle();
        return;
      }

      // g → enter leader; next press is a navigation target
      if (e.key === "g" && !metaOrCtrl && !e.altKey) {
        leader = true;
        if (leaderTimer) clearTimeout(leaderTimer);
        leaderTimer = setTimeout(() => {
          leader = false;
        }, 1200);
        return;
      }

      if (leader) {
        const target = GO_MAP[e.key.toLowerCase()];
        leader = false;
        if (leaderTimer) clearTimeout(leaderTimer);
        if (target) {
          e.preventDefault();
          handlers.onNavigate(target);
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (leaderTimer) clearTimeout(leaderTimer);
    };
  }, [handlers]);
}

export const SHORTCUT_GROUPS: {
  label: string;
  items: { keys: string[]; label: string }[];
}[] = [
  {
    label: "Global",
    items: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show keyboard shortcuts" },
      { keys: ["Esc"], label: "Dismiss any overlay" },
    ],
  },
  {
    label: "Navigation (press g, then …)",
    items: [
      { keys: ["g", "c"], label: "Command Center" },
      { keys: ["g", "e"], label: "Experiments" },
      { keys: ["g", "r"], label: "Run Detail" },
      { keys: ["g", "p"], label: "Phase Visualizer" },
      { keys: ["g", "m"], label: "Live Metrics" },
      { keys: ["g", "o"], label: "Robustness Radar" },
      { keys: ["g", "v"], label: "Model Comparison" },
      { keys: ["g", "d"], label: "Distortion Preview" },
      { keys: ["g", "a"], label: "Audit Trail" },
      { keys: ["g", "b"], label: "Benchmark Suite" },
      { keys: ["g", "i"], label: "CI Integration" },
      { keys: ["g", "s"], label: "Settings" },
    ],
  },
];

const RECENT_KEY = "nightmarenet.palette.recent.v1";
const RECENT_MAX = 5;

export function loadRecentPaletteIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function pushRecentPaletteId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadRecentPaletteIds().filter((x) => x !== id);
    const next = [id, ...existing].slice(0, RECENT_MAX);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Lightweight subsequence-fuzzy ranker.
 *
 * Returns a score in roughly [0, 1] where:
 *   - exact prefix match = ~1.0
 *   - substring match = ~0.7
 *   - subsequence match = decays by gap size
 *   - no match = -1
 *
 * Optimized for the small (< 50) palette item set; per-keystroke cost is
 * negligible vs the React render cost of the popup.
 */
export function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h.startsWith(n)) return 1 + n.length / 100;
  const idx = h.indexOf(n);
  if (idx === 0) return 1;
  if (idx > 0) return 0.7 - idx * 0.005;
  // Subsequence pass
  let hi = 0;
  let score = 0;
  let last = -2;
  for (let ni = 0; ni < n.length; ni += 1) {
    const ch = n[ni];
    const found = h.indexOf(ch, hi);
    if (found < 0) return -1;
    score += found === last + 1 ? 0.6 : 0.3 / Math.max(1, found - last);
    last = found;
    hi = found + 1;
  }
  return Math.min(0.65, score / n.length);
}

export function rankPaletteItems<T extends { id: string; label: string; hint?: string }>(
  items: T[],
  query: string,
  recentIds: string[]
): T[] {
  const recentRank = new Map(recentIds.map((id, i) => [id, recentIds.length - i]));

  if (!query.trim()) {
    return [...items].sort(
      (a, b) => (recentRank.get(b.id) ?? 0) - (recentRank.get(a.id) ?? 0)
    );
  }

  const scored = items
    .map((it) => {
      const labelScore = fuzzyScore(it.label, query);
      const hintScore = it.hint ? fuzzyScore(it.hint, query) * 0.6 : -1;
      const recencyBonus = (recentRank.get(it.id) ?? 0) * 0.02;
      const score = Math.max(labelScore, hintScore) + recencyBonus;
      return { it, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.it);
}
