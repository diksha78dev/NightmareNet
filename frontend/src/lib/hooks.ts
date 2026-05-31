"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHealth } from "./api";

/**
 * Probes the backend `/api/v1/health` endpoint once on mount.
 * Returns `{ isLive, isLoading }` so panels can decide whether to
 * show real data (API available) or fall back to labeled demo data.
 *
 * Re-checks on window focus after 30s of staleness.
 */
export function useDemoMode(): { isLive: boolean; isLoading: boolean } {
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    try {
      const res = await getHealth();
      setIsLive(res.status === "healthy");
    } catch {
      setIsLive(false);
    } finally {
      setIsLoading(false);
      lastCheck.current = Date.now();
    }
  }, []);

  useEffect(() => {
    check();
    const onFocus = () => {
      if (Date.now() - lastCheck.current > 30_000) check();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [check]);

  return { isLive, isLoading };
}
