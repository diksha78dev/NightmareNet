/**
 * Cross-route handoff keys for marketing → dashboard transitions.
 *
 * The marketing components (`GuidedDemo`, `Playground`) write the user's text
 * into `sessionStorage` under `HANDOFF_DEMO_TEXT_KEY` before navigating to
 * `/dashboard?from=demo`. The dashboard's `DistortionPreview` reads and clears
 * the key on mount so the same text doesn't bleed into later sessions.
 *
 * sessionStorage (not localStorage) keeps the handoff tab-scoped, which is the
 * correct semantic for a one-time route transition.
 */
export const HANDOFF_DEMO_TEXT_KEY = "nightmarenet.handoff.demo_text";
