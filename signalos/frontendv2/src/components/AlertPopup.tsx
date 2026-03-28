"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignalOSContext } from "../context/SignalOSContext";

const MOCK_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

const MOCK_PHONES: Record<string, string> = {
  sim_call_1: "(949) 123-4567",
  sim_call_2: "(310) 555-0198",
  sim_call_3: "(213) 867-5309",
  sim_call_4: "(818) 444-7721",
  sim_call_5: "(626) 332-8844",
};
const DEFAULT_PHONE = "(800) 555-0100";

export default function AlertPopup() {
  const { activeAlert, dismissAlert, sendCommand, selectedCallId, calls } =
    useSignalOSContext();
  const router = useRouter();
  const [duration, setDuration] = useState("0:00");

  const call = activeAlert ? calls[activeAlert.callId] : undefined;

  useEffect(() => {
    if (!call) return;
    const start = new Date(call.startedAt);
    if (isNaN(start.getTime())) return;

    const tick = () => {
      const ms = Math.max(0, Date.now() - start.getTime());
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [call]);

  if (!activeAlert || !call) return null;

  const name = MOCK_NAMES[activeAlert.callId] ?? DEFAULT_NAME;
  const phone = MOCK_PHONES[activeAlert.callId] ?? DEFAULT_PHONE;

  const handleAccept = () => {
    // Put the currently active call on hold (if any and different from the alert)
    if (selectedCallId && selectedCallId !== activeAlert.callId) {
      sendCommand({
        type: "SET_HOLD",
        callId: selectedCallId,
        onHold: true,
      });
    }

    // Select the alert call and navigate to it
    sendCommand({ type: "SELECT_CALL", callId: activeAlert.callId });
    dismissAlert();
    router.push(`/call/${activeAlert.callId}`);
  };

  const handleDismiss = () => {
    dismissAlert();
  };

  return (
    <div className="fixed z-[200] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl shadow-2xl w-[340px] p-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header: name + duration */}
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-white font-bold text-lg tracking-tight">
            {name}
          </h3>
          <span className="text-red-500 font-mono font-bold text-[15px] tabular-nums mt-0.5">
            {duration}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-4">{phone}</p>

        {/* Alert details card */}
        <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 mb-5">
          <p className="text-white text-[14px] leading-relaxed">
            Detected{" "}
            <span className="font-bold">
              &ldquo;{activeAlert.anomalyType.replace(/_/g, " ")}&rdquo;
            </span>{" "}
            — {Math.round(activeAlert.confidence * 100)}% confidence.
          </p>
          {activeAlert.suggestedResponse && (
            <p className="text-gray-400 text-[13px] mt-2 leading-relaxed">
              {activeAlert.suggestedResponse}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 py-2.5 rounded-xl bg-[#6b8f3c] hover:bg-[#7da344] text-white font-bold text-[15px] transition-colors"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-2.5 rounded-xl text-gray-500 hover:text-gray-300 font-medium text-[15px] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
