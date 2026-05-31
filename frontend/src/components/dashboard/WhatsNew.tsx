"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { IconCommand, IconSparkle, IconWand } from "./icons";

const STORAGE_KEY = "nightmarenet.whatsnew.seen.v1";
const ONBOARDING_KEY = "nightmarenet.onboarding.dismissed.v1";
// Fallback build identifier when NEXT_PUBLIC_BUILD_SHA is unavailable.
// Bump this string when shipping a new "What's new" payload so returning
// users see the card again exactly once.
const FALLBACK_BUILD = "2026-05-26";

interface Bullet {
  icon: React.ReactNode;
  text: string;
}

const BULLETS: Bullet[] = [
  {
    icon: <IconSparkle size={12} />,
    text: "AI copilot is here — press the dock button to ask anything",
  },
  {
    icon: <IconCommand size={12} />,
    text: "Cmd+K now ranks by recency and fuzzy-matches",
  },
  {
    icon: <IconWand size={12} />,
    text: "Press ? to see every keyboard shortcut",
  },
];

function getCurrentBuild(): string {
  // process.env values are inlined at build time by Next.js, so this is
  // safe to call in the browser without leaking server state.
  if (typeof process !== "undefined") {
    const sha = process.env.NEXT_PUBLIC_BUILD_SHA;
    if (sha && sha.length > 0) return sha;
  }
  return FALLBACK_BUILD;
}

export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [build, setBuild] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Suppress this card while the first-run onboarding tour is still
    // up — new users should not be hit with two overlays at once.
    if (window.localStorage.getItem(ONBOARDING_KEY) !== "true") {
      return;
    }
    const current = getCurrentBuild();
    setBuild(current);
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (seen !== current) {
      // Defer a beat so the dashboard finishes its entrance animation
      // before the card slides in — feels less aggressive.
      const t = setTimeout(() => setOpen(true), 650);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, build || getCurrentBuild());
    } catch {
      /* sandboxed storage — ignore */
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, y: -16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          role="status"
          aria-live="polite"
          aria-label="What's new"
          className="fixed right-5 top-5 z-[50] w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-abyss/95 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-dream/[0.15] text-dream">
                <IconSparkle size={12} />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-widest text-slate-200">
                What&apos;s new
              </span>
              {build ? (
                <span className="font-mono text-[10px] text-slate-400">
                  · {build.slice(0, 10)}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss what's new"
              className="cursor-pointer rounded-md px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-white/5 hover:text-slate-300"
            >
              Esc
            </button>
          </div>

          <ul className="divide-y divide-white/[0.04] px-4 py-1">
            {BULLETS.map((b, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18, delay: 0.05 * i + 0.05 }}
                className="flex items-start gap-2.5 py-2.5"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-slate-300">
                  {b.icon}
                </span>
                <span className="text-[12.5px] leading-relaxed text-slate-300">
                  {b.text}
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5">
            <a
              href="https://github.com/nightmarenet/nightmarenet/blob/main/CHANGELOG.md"
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer text-[11px] text-neural hover:text-neural-soft"
            >
              View changelog →
            </a>
            <Button variant="primary" size="sm" onClick={dismiss}>
              Got it
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
