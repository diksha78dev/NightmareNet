"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "nightmarenet-sound-enabled";

let audioCtx: AudioContext | null = null;
let initialized = false;

function getAudioContext(): AudioContext | null {
  if (audioCtx && audioCtx.state !== "closed") return audioCtx;
  if (typeof window === "undefined") return null;
  try {
    audioCtx = new AudioContext();
    return audioCtx;
  } catch {
    return null;
  }
}

function ensureResumed(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

function initOnInteraction(): void {
  if (initialized) return;
  const handler = () => {
    const ctx = getAudioContext();
    if (ctx) ensureResumed(ctx);
    initialized = true;
    document.removeEventListener("pointerdown", handler);
    document.removeEventListener("keydown", handler);
  };
  document.addEventListener("pointerdown", handler, { once: true });
  document.addEventListener("keydown", handler, { once: true });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getStoredEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
}

function playClick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, now);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.008);
}

function playSuccess(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(523, now);
  osc.frequency.setValueAtTime(659, now + 0.02);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.04);
}

function playError(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(200, now);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.03);
}

function playTransition(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const bufferSize = Math.ceil(ctx.sampleRate * 0.06);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.setValueAtTime(1400, now);
  bandpass.Q.setValueAtTime(0.8, now);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  source.connect(bandpass).connect(gain).connect(ctx.destination);
  source.start(now);
  source.stop(now + 0.06);
}

function playNotification(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  ensureResumed(ctx);
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.05);
}

type SoundFn = () => void;

interface UseSoundsReturn {
  playClick: SoundFn;
  playSuccess: SoundFn;
  playError: SoundFn;
  playTransition: SoundFn;
  playNotification: SoundFn;
  enabled: boolean;
  toggle: () => void;
}

export function useSounds(): UseSoundsReturn {
  const [enabled, setEnabled] = useState(true);
  const reducedMotion = useRef(false);

  useEffect(() => {
    setEnabled(getStoredEnabled());
    reducedMotion.current = prefersReducedMotion();
    initOnInteraction();

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      reducedMotion.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const canPlay = useCallback((): boolean => {
    return enabled && !reducedMotion.current;
  }, [enabled]);

  const wrap = useCallback(
    (fn: SoundFn): SoundFn =>
      () => {
        if (canPlay()) fn();
      },
    [canPlay]
  );

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return {
    playClick: wrap(playClick),
    playSuccess: wrap(playSuccess),
    playError: wrap(playError),
    playTransition: wrap(playTransition),
    playNotification: wrap(playNotification),
    enabled,
    toggle,
  };
}
