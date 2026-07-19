"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_RECONNECT_ATTEMPTS,
  nextBackoffMs,
  type WsConnectionStatus,
} from "@/lib/websocket";

export interface UseWebSocketOptions {
  url: string | null;
  enabled?: boolean;
  onMessage?: (data: unknown) => void;
  /** Fired after a successful reconnect so callers can refresh state. */
  onReconnect?: () => void;
}

export interface UseWebSocketResult {
  status: WsConnectionStatus;
  attempt: number;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket({
  url,
  enabled = true,
  onMessage,
  onReconnect,
}: UseWebSocketOptions): UseWebSocketResult {
  const [status, setStatus] = useState<WsConnectionStatus>("disconnected");
  const [attempt, setAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const intentionalClose = useRef(false);
  const everOpened = useRef(false);
  const urlRef = useRef(url);

  const onMessageRef = useRef(onMessage);
  const onReconnectRef = useRef(onReconnect);
  onMessageRef.current = onMessage;
  onReconnectRef.current = onReconnect;
  urlRef.current = url;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const closeSocket = () => {
    if (!wsRef.current) return;
    wsRef.current.onopen = null;
    wsRef.current.onmessage = null;
    wsRef.current.onerror = null;
    wsRef.current.onclose = null;
    wsRef.current.close();
    wsRef.current = null;
  };

  const connectRef = useRef<() => void>(() => {});

  connectRef.current = () => {
    const target = urlRef.current;
    if (!target) return;

    clearTimer();
    closeSocket();
    intentionalClose.current = false;
    setStatus("reconnecting");

    try {
      const ws = new WebSocket(target);
      wsRef.current = ws;

      ws.onopen = () => {
        const wasReconnect = everOpened.current && attemptRef.current > 0;
        everOpened.current = true;
        attemptRef.current = 0;
        setAttempt(0);
        setStatus("connected");
        if (wasReconnect) onReconnectRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          onMessageRef.current?.(JSON.parse(event.data));
        } catch {
          /* ignore bad payloads */
        }
      };

      ws.onerror = () => {
        // reconnect happens in onclose
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (intentionalClose.current) {
          setStatus("disconnected");
          return;
        }
        if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          setStatus("disconnected");
          return;
        }
        const delay = nextBackoffMs(attemptRef.current);
        setStatus("reconnecting");
        timerRef.current = setTimeout(() => {
          attemptRef.current += 1;
          setAttempt(attemptRef.current);
          connectRef.current();
        }, delay);
      };
    } catch {
      if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setStatus("disconnected");
        return;
      }
      const delay = nextBackoffMs(attemptRef.current);
      setStatus("reconnecting");
      timerRef.current = setTimeout(() => {
        attemptRef.current += 1;
        setAttempt(attemptRef.current);
        connectRef.current();
      }, delay);
    }
  };

  const disconnect = useCallback(() => {
    intentionalClose.current = true;
    clearTimer();
    closeSocket();
    attemptRef.current = 0;
    setAttempt(0);
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    attemptRef.current = 0;
    setAttempt(0);
    everOpened.current = true;
    connectRef.current();
  }, []);

  useEffect(() => {
    if (!enabled || !url) {
      disconnect();
      return;
    }

    everOpened.current = false;
    attemptRef.current = 0;
    setAttempt(0);
    connectRef.current();

    return () => {
      intentionalClose.current = true;
      clearTimer();
      closeSocket();
    };
  }, [url, enabled, disconnect]);

  return { status, attempt, reconnect, disconnect };
}
