export type WsConnectionStatus = "connected" | "reconnecting" | "disconnected";

export const MAX_RECONNECT_ATTEMPTS = 10;

/** Exponential backoff: 1s, 2s, 4s, 8s, 16s, then capped at 30s. */
export function nextBackoffMs(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt), 30_000);
}

export function buildRunWsUrl(runId: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/runs/${runId}`;
}
