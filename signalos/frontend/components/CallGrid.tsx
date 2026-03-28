"use client";

import { useEffect, useState } from "react";
import { CallState, CallStatus, CallCategory } from "../types";

interface CallGridProps {
  calls: Record<string, CallState>;
  /** From dashboard WebSocket — drives empty-state copy */
  connected: boolean;
  backendUrl: string;
}

const STATUS_STYLES: Record<CallStatus, string> = {
  ACTIVE: "bg-green-700 text-green-100",
  "ON-HOLD": "bg-gray-700 text-gray-300",
  ALERT: "bg-red-600 text-white animate-pulse",
  ROUTED: "bg-gray-700 text-gray-400",
};

const BORDER_STYLES: Record<CallStatus, string> = {
  ACTIVE: "border-green-700",
  "ON-HOLD": "border-gray-700",
  ALERT: "border-red-500",
  ROUTED: "border-gray-700",
};

const CATEGORY_LABEL: Record<CallCategory, string> = {
  MONITORING: "Monitoring",
  NON_EMERGENCY: "Non-Emergency",
  MEDICAL: "Medical",
  TRAFFIC: "Traffic",
  FIRE_HAZARD: "Fire / Hazard",
  CRIME: "Crime",
  SILENT_DISTRESS: "Silent Distress",
};

const CATEGORY_STYLES: Record<CallCategory, string> = {
  MONITORING: "bg-gray-700 text-gray-400",
  NON_EMERGENCY: "bg-green-800 text-green-200",
  MEDICAL: "bg-orange-800 text-orange-200",
  TRAFFIC: "bg-blue-800 text-blue-200",
  FIRE_HAZARD: "bg-red-800 text-red-200",
  CRIME: "bg-red-800 text-red-200",
  SILENT_DISTRESS: "bg-purple-700 text-purple-100 animate-pulse",
};

function formatElapsed(startedAt: Date | string): string {
  const diff = Math.max(
    0,
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  );
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function truncateTranscript(transcript: string): string {
  if (transcript.length <= 100) return transcript;
  return `…${transcript.slice(-100)}`;
}

export default function CallGrid({
  calls,
  connected,
  backendUrl,
}: CallGridProps): React.JSX.Element {
  const [, setTick] = useState(0);

  // Re-render every second to update elapsed time
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return (): void => clearInterval(timer);
  }, []);

  const callList = Object.values(calls);

  if (callList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4 text-center font-mono text-sm">
        {!connected ? (
          <>
            <p className="text-amber-500 font-semibold mb-1">
              Not connected to backend
            </p>
            <p className="text-gray-500 text-xs max-w-md">
              Retrying every few seconds. Check{" "}
              <code className="text-gray-400">NEXT_PUBLIC_BACKEND_WS_URL</code>{" "}
              on Vercel and redeploy. Console:{" "}
              <code className="text-gray-400">[SignalOS]</code> logs.
            </p>
          </>
        ) : (
          <>
            <p className="text-green-500/90 font-semibold mb-1">
              Live — monitoring for calls
            </p>
            <p className="text-gray-500 text-xs max-w-md">
              No active streams yet. When someone dials your Twilio number, a
              card appears here. Watch the browser console for{" "}
              <code className="text-gray-400">[SignalOS] STATE_UPDATE</code>{" "}
              when Twilio sends audio.
            </p>
          </>
        )}
      </div>
    );
  }

  function handleRoute(callId: string): void {
    const httpUrl = backendUrl
      .replace(/^wss:\/\//, "https://")
      .replace(/^ws:\/\//, "http://");
    fetch(`${httpUrl}/route-non-emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId }),
    }).catch((err: Error) =>
      console.error(`[Route] Failed to route callId: ${callId} —`, err.message)
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-green-500/90 text-xs font-mono font-semibold uppercase tracking-wide">
        {callList.length} call{callList.length === 1 ? "" : "s"} active — audio
        streaming to SignalOS
      </p>
      <div className="grid grid-cols-3 gap-4">
        {callList.map((call) => {
          const isSilentDistress = call.category === "SILENT_DISTRESS";
          const isRouted = call.status === "ROUTED";
          const canRoute =
            call.status === "ACTIVE" || call.status === "ON-HOLD";

          const borderClass = isSilentDistress
            ? "border-purple-500 ring-1 ring-purple-500/50"
            : call.status === "ALERT"
            ? `${BORDER_STYLES[call.status]} ring-1 ring-red-500/50`
            : BORDER_STYLES[call.status];

          return (
            <div
              key={call.callId}
              className={`border-2 rounded-lg p-4 bg-gray-800 ${borderClass} ${
                isRouted ? "opacity-50" : ""
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Monitoring pulse dot */}
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-white font-mono text-sm font-semibold">
                    ···{call.callId.slice(-6)}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${STATUS_STYLES[call.status]}`}
                >
                  {call.status}
                </span>
              </div>

              {/* Elapsed time */}
              <div className="text-gray-600 text-xs font-mono mb-2">
                {formatElapsed(call.startedAt)}
              </div>

              {/* Category badge */}
              <div className="mb-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${CATEGORY_STYLES[call.category]}`}
                >
                  {CATEGORY_LABEL[call.category]}
                </span>
                {isSilentDistress && (
                  <p className="text-purple-300 text-xs font-mono mt-1">
                    Requires immediate attention
                  </p>
                )}
                {call.categorySummary && (
                  <p className="text-gray-500 text-xs font-mono mt-1 truncate">
                    {call.categorySummary}
                  </p>
                )}
              </div>

              {/* Rolling transcript */}
              <div className="text-gray-400 text-xs font-mono leading-relaxed min-h-[2.5rem] border-t border-gray-700 pt-2">
                {call.transcript
                  ? truncateTranscript(call.transcript)
                  : "Monitoring audio..."}
              </div>

              {/* Route to Non-Emergency button */}
              {canRoute && (
                <div className="mt-3 border-t border-gray-700 pt-3">
                  <button
                    onClick={() => handleRoute(call.callId)}
                    className="w-full py-1.5 rounded text-xs font-mono font-bold bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                  >
                    Route to Non-Emergency
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
