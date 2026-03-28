"use client";

import { useEffect, useState } from "react";
import { useSignalOS } from "../lib/socket";
import CallGrid from "../components/CallGrid";
import AlertBanner from "../components/AlertBanner";
import IncidentReport from "../components/IncidentReport";

/** Clock only updates after mount — avoids SSR/client time mismatch (React #418/#423/#425). */
function useClock(): string {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = (): void => setTime(new Date().toLocaleTimeString());
    tick();
    const timer = setInterval(tick, 1000);
    return (): void => clearInterval(timer);
  }, []);

  return time;
}

export default function Home(): React.JSX.Element {
  const { calls, activeAlert, dismissAlert, connected } = useSignalOS();
  const clock = useClock();

  const sessionCount = Object.keys(calls).length;
  const alertCount = activeAlert ? 1 : 0;

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base font-bold font-mono tracking-widest uppercase">
            SignalOS — Dispatch Monitor
          </h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span
              className={`inline-flex items-center gap-1 text-xs font-mono ${
                connected ? "text-green-500" : "text-red-500"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {connected ? "CONNECTED" : "RECONNECTING..."}
            </span>
            <span className="text-gray-600 text-xs font-mono">|</span>
            <span className="text-gray-500 text-xs font-mono">
              {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
            </span>
            <span className="text-gray-600 text-xs font-mono">|</span>
            <span
              className={`text-xs font-mono ${
                alertCount > 0 ? "text-red-400 font-bold" : "text-gray-500"
              }`}
            >
              {alertCount} {alertCount === 1 ? "alert" : "alerts"}
            </span>
          </div>
        </div>

        {/* Live clock */}
        <span className="text-gray-400 font-mono text-sm tabular-nums">
          {clock || "—"}
        </span>
      </div>

      {/* Alert banner — slides in from top */}
      <AlertBanner alert={activeAlert} onDismiss={dismissAlert} />

      {/* Main content */}
      <div className="flex flex-1 gap-4 p-4 min-h-0">
        {/* Call grid */}
        <div className="flex-1">
          <CallGrid
            calls={calls}
            connected={connected}
            backendUrl={process.env.NEXT_PUBLIC_BACKEND_URL ?? "ws://localhost:3001"}
          />
        </div>

        {/* Incident report panel */}
        <div className="w-72 shrink-0">
          <IncidentReport alert={activeAlert} onResolve={dismissAlert} />
        </div>
      </div>
    </main>
  );
}
