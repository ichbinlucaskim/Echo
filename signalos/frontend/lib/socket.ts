"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CallState, AlertPayload, AudioChunkPayload, BroadcastMessage } from "../types";

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
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<Record<string, number>>({});

  const playAudioChunk = useCallback((callId: string, mimeType: string, base64Data: string): void => {
    try {
      // Parse sample rate from mimeType (e.g. "audio/pcm;rate=24000")
      const rateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext({ sampleRate });
      }
      const ctx = audioCtxRef.current;

      // Resume if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      // Decode base64 → Int16 PCM → Float32
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

      // Schedule seamlessly after previous chunk for this call
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current[callId] ?? now);
      source.start(startTime);
      nextPlayTimeRef.current[callId] = startTime + buffer.duration;
    } catch (err) {
      console.error("[SignalOS] Audio playback error:", err);
    }
  }, []);

  const connect = useCallback((): void => {
    if (!mountedRef.current) return;

    // Prefer NEXT_PUBLIC_BACKEND_WS_URL (full wss://…/dashboard) — matches Vercel docs we used.
    // Legacy: NEXT_PUBLIC_BACKEND_URL base only, we append /dashboard.
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
        "[SignalOS] WebSocket OPEN — dashboard linked to backend. Waiting for STATE_UPDATE / ALERT messages."
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
          const state = message.payload as CallState;
          console.log("[SignalOS] STATE_UPDATE", {
            callId: state.callId,
            status: state.status,
            transcriptLen: state.transcript?.length ?? 0,
          });
          setCalls((prev) => ({ ...prev, [state.callId]: state }));
        } else if (message.type === "ALERT") {
          const alert = message.payload as AlertPayload;
          console.log("[SignalOS] ALERT", {
            callId: alert.callId,
            type: alert.anomalyType,
            confidence: alert.confidence,
          });
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
        } else if (message.type === "AUDIO_CHUNK") {
          const chunk = message.payload as AudioChunkPayload;
          playAudioChunk(chunk.callId, chunk.mimeType, chunk.data);
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
      console.error("[SignalOS] WebSocket error — check URL and Railway backend");
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
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        void audioCtxRef.current.close();
      }
      nextPlayTimeRef.current = {};
    };
  }, [connect]);

  const dismissAlert = useCallback((): void => {
    setActiveAlert(null);
  }, []);

  return { calls, activeAlert, dismissAlert, connected };
}
