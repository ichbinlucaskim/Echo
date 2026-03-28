"use client";

import { useState } from "react";
import CallCard from "./CallCard";
import { useSignalOSContext } from "../context/SignalOSContext";

const EMERGENCY_CATEGORIES = new Set([
  "MONITORING",
  "MEDICAL",
  "TRAFFIC",
  "FIRE_HAZARD",
  "CRIME",
  "SILENT_DISTRESS",
]);

export default function Sidebar() {
  const { calls } = useSignalOSContext();
  const [tab, setTab] = useState<"emergency" | "non-emergency">("emergency");

  const allCalls = Object.values(calls);

  const filtered = allCalls.filter((call) => {
    const cat = call.category ?? "MONITORING";
    const isEmergency =
      call.status === "ALERT" || EMERGENCY_CATEGORIES.has(cat);
    return tab === "emergency" ? isEmergency : !isEmergency;
  });

  // Sort: ALERTs first, then by start date
  const sortedCalls = filtered.sort((a, b) => {
    if (a.status === "ALERT" && b.status !== "ALERT") return -1;
    if (b.status === "ALERT" && a.status !== "ALERT") return 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return (
    <div className="absolute left-6 top-6 bottom-32 w-80 z-40 flex flex-col pointer-events-none">
      <div className="flex-1 bg-[#151517]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl p-5 overflow-y-auto overflow-hidden pointer-events-auto custom-scrollbar">
        {/* Toggle Tabs */}
        <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => setTab("emergency")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "emergency"
                ? "bg-[#2c2c2e] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Emergency
          </button>
          <button
            type="button"
            onClick={() => setTab("non-emergency")}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === "non-emergency"
                ? "bg-[#2c2c2e] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Non-Emergency
          </button>
        </div>

        {/* Call List */}
        <div className="flex flex-col gap-3">
          {sortedCalls.length === 0 ? (
            <div className="text-gray-500 text-center text-sm py-10 font-mono">
              {tab === "emergency"
                ? "NO EMERGENCY CALLS"
                : "NO NON-EMERGENCY CALLS"}
            </div>
          ) : (
            sortedCalls.map((call) => (
              <CallCard key={call.callId} call={call} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
