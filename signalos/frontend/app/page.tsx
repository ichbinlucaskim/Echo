"use client";

import { useEffect, useState } from "react";
import { CallState, AlertPayload, BroadcastMessage } from "../types";
import { connectToBackend, disconnectFromBackend } from "../lib/socket";
import CallGrid from "../components/CallGrid";
import AlertBanner from "../components/AlertBanner";
import IncidentReport from "../components/IncidentReport";

export default function Home(): React.JSX.Element {
  const [callStates, setCallStates] = useState<Record<string, CallState>>({});
  const [activeAlert, setActiveAlert] = useState<AlertPayload | null>(null);

  useEffect(() => {
    connectToBackend((message: BroadcastMessage) => {
      if (message.type === "STATE_UPDATE") {
        const state = message.payload as CallState;
        setCallStates((prev) => ({ ...prev, [state.callId]: state }));
      } else if (message.type === "ALERT") {
        const alert = message.payload as AlertPayload;
        setCallStates((prev) => ({
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
    });

    return () => {
      disconnectFromBackend();
    };
  }, []);

  const sessionCount = Object.keys(callStates).length;

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-lg font-bold font-mono tracking-wide">
          SignalOS — Dispatch Monitor
        </h1>
        <p className="text-gray-500 text-xs font-mono mt-1">
          {sessionCount} active {sessionCount === 1 ? "session" : "sessions"} |{" "}
          {activeAlert ? "1 alert" : "0 alerts"}
        </p>
      </div>

      {/* Alert banner — hidden when null */}
      <AlertBanner alert={activeAlert} />

      {/* Main grid + incident panel */}
      <div className="flex gap-6 p-6">
        <div className="flex-1">
          <CallGrid calls={callStates} />
        </div>
        <div className="w-72">
          <IncidentReport alert={activeAlert} />
        </div>
      </div>
    </main>
  );
}
