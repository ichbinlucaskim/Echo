"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CallState, AlertPayload, BroadcastMessage } from "../types";

const RECONNECT_DELAY_MS = 3000;

export interface SignalOSState {
  calls: Record<string, CallState>;
  activeAlert: AlertPayload | null;
  dismissAlert: () => void;
  connected: boolean;
}

export function useSignalOS(): SignalOSState {
  const [calls, setCalls] = useState<Record<string, CallState>>({});
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback((): void => {
    if (!mountedRef.current) return;

    const base =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "ws://localhost:3001";
    const url = `${base}/dashboard`;

    console.log("[Socket] Connecting →", url);
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = (): void => {
      console.log("[Socket] Connected to SignalOS backend");
      setConnected(true);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (event: MessageEvent<string>): void => {
      try {
        const message = JSON.parse(event.data) as BroadcastMessage;

        if (message.type === "STATE_UPDATE") {
          const state = message.payload as CallState;
          setCalls((prev) => ({ ...prev, [state.callId]: state }));
        } else if (message.type === "ALERT") {
          const alert = message.payload as AlertPayload;
          setCalls((prev) => ({
            ...prev,
            [alert.callId]: {
              ...(prev[alert.callId] ?? {
                callId: alert.callId,
                transcript: "",
                startedAt: new Date(),
              }),
              status: "ALERT",
              transcript: alert.transcript,
            },
          }));
          setActiveAlert(alert);
        }
      } catch (err) {
        console.error("[Socket] Failed to parse message:", err);
      }
    };

    ws.onclose = (): void => {
      console.log(
        `[Socket] Disconnected — reconnecting in ${RECONNECT_DELAY_MS}ms`
      );
      setConnected(false);
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (): void => {
      console.error("[Socket] Connection error");
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return (): void => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
    };
  }, [connect]);

  const dismissAlert = useCallback((): void => {
    setActiveAlert(null);
  }, []);

  return { calls, activeAlert, dismissAlert, connected };
}
