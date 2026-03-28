"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  CallState,
  AlertPayload,
  AudioChunkPayload,
  BroadcastMessage,
  DashboardCommand,
} from "../types";

const RECONNECT_DELAY_MS = 3000;

function normalizeCallState(raw: CallState): CallState {
  const started =
    raw.startedAt instanceof Date
      ? raw.startedAt
      : new Date(String(raw.startedAt));
  return {
    ...raw,
    startedAt: started,
    category: raw.category ?? "MONITORING",
    categorySummary: raw.categorySummary ?? "",
    categoryConfidence: raw.categoryConfidence ?? 0,
    muted: raw.muted ?? false,
    onHold: raw.onHold ?? false,
  };
}

function defaultCallBase(callId: string): CallState {
  return {
    callId,
    transcript: "",
    startedAt: new Date(),
    status: "ACTIVE",
    category: "MONITORING",
    categorySummary: "",
    categoryConfidence: 0,
    muted: false,
    onHold: false,
  };
}

export interface SignalOSState {
  calls: Record<string, CallState>;
  activeAlert: AlertPayload | null;
  dismissAlert: () => void;
  connected: boolean;
  sendCommand: (cmd: DashboardCommand) => void;
  selectedCallId: string | null;
}

export function useSignalOS(): SignalOSState {
  const [calls, setCalls] = useState<Record<string, CallState>>({});
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<Record<string, number>>({});
  const callsRef = useRef(calls);

  useEffect(() => {
    callsRef.current = calls;
  }, [calls]);

  const sendCommand = useCallback((cmd: DashboardCommand): void => {
    if (cmd.type === "END_CALL") {
      setCalls((prev) => {
        const next = { ...prev };
        delete next[cmd.callId];
        return next;
      });
      setActiveAlert((a) => (a?.callId === cmd.callId ? null : a));
      delete nextPlayTimeRef.current[cmd.callId];
    }

    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      if (cmd.type === "END_CALL") {
        console.warn(
          "[SignalOS] Call removed from UI; socket closed — server may still have session until reconnect"
        );
      } else {
        console.warn("[SignalOS] Cannot send command — socket not connected");
      }
      return;
    }
    ws.send(JSON.stringify(cmd));
  }, []);

  const playAudioChunk = useCallback(
    (callId: string, mimeType: string, base64Data: string): void => {
      if (callsRef.current[callId]?.muted || callsRef.current[callId]?.onHold) {
        return;
      }
      try {
        const rateMatch = mimeType.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContext({ sampleRate });
        }
        const ctx = audioCtxRef.current;

        if (ctx.state === "suspended") {
          void ctx.resume();
        }

        const raw = atob(base64Data);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

        const int16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

        const buffer = ctx.createBuffer(1, float32.length, sampleRate);
        buffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const now = ctx.currentTime;
        const startTime = Math.max(now, nextPlayTimeRef.current[callId] ?? now);
        source.start(startTime);
        nextPlayTimeRef.current[callId] = startTime + buffer.duration;
      } catch (err) {
        console.error("[SignalOS] Audio playback error:", err);
      }
    },
    []
  );

  const connect = useCallback((): void => {
    if (!mountedRef.current) return;

    const url =
      process.env.NEXT_PUBLIC_BACKEND_WS_URL?.trim() ||
      `${(process.env.NEXT_PUBLIC_BACKEND_URL ?? "ws://localhost:3001").replace(
        /\/$/,
        ""
      )}/dashboard`;

    console.log("[SignalOS] WebSocket connecting →", url);
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = (): void => {
      console.log(
        "[SignalOS] WebSocket OPEN — dashboard linked to backend."
      );
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
          const state = normalizeCallState(message.payload);
          setCalls((prev) => ({ ...prev, [state.callId]: state }));
        } else if (message.type === "ALERT") {
          const alert = message.payload;
          setCalls((prev) => {
            const base = prev[alert.callId] ?? defaultCallBase(alert.callId);
            const merged = normalizeCallState({
              ...base,
              status: "ALERT",
              transcript: alert.transcript,
            });
            return { ...prev, [alert.callId]: merged };
          });
          const ts = alert.timestamp as Date | string;
          setActiveAlert({
            ...alert,
            timestamp: ts instanceof Date ? ts : new Date(String(ts)),
          });
        } else if (message.type === "AUDIO_CHUNK") {
          const chunk = message.payload as AudioChunkPayload;
          playAudioChunk(chunk.callId, chunk.mimeType, chunk.data);
        } else if (message.type === "CALL_ENDED") {
          const { callId } = message.payload;
          setCalls((prev) => {
            const next = { ...prev };
            delete next[callId];
            return next;
          });
          setActiveAlert((a) => (a?.callId === callId ? null : a));
          delete nextPlayTimeRef.current[callId];
        } else if (message.type === "SELECTION_UPDATE") {
          setSelectedCallId(message.payload.callId);
        }
      } catch (err) {
        console.error("[SignalOS] Failed to parse WebSocket message:", err);
      }
    };

    ws.onclose = (): void => {
      console.log(
        `[SignalOS] WebSocket closed — reconnecting in ${RECONNECT_DELAY_MS}ms`
      );
      setConnected(false);
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = (): void => {
      console.error(
        "[SignalOS] WebSocket error — check URL and backend"
      );
    };
  }, [playAudioChunk]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return (): void => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      socketRef.current?.close();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
      nextPlayTimeRef.current = {};
    };
  }, [connect]);

  const dismissAlert = useCallback((): void => {
    setActiveAlert(null);
  }, []);

  return {
    calls,
    activeAlert,
    dismissAlert,
    connected,
    sendCommand,
    selectedCallId,
  };
}
