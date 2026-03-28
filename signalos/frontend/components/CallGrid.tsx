"use client";

import { CallStatus } from "../types";

interface CallBox {
  id: string;
  label: string;
  status: CallStatus;
}

const STATIC_CALLS: CallBox[] = [
  { id: "call_1", label: "Call 1", status: "ON-HOLD" },
  { id: "call_2", label: "Call 2", status: "ON-HOLD" },
  { id: "call_3", label: "Call 3", status: "ON-HOLD" },
  { id: "call_4", label: "Call 4", status: "ON-HOLD" },
  { id: "call_5", label: "Call 5", status: "ON-HOLD" },
  { id: "call_6", label: "Call 6", status: "ACTIVE" },
];

const STATUS_STYLES: Record<CallStatus, string> = {
  ACTIVE: "bg-green-600 text-white",
  "ON-HOLD": "bg-yellow-600 text-white",
  ALERT: "bg-red-600 text-white",
};

const BORDER_STYLES: Record<CallStatus, string> = {
  ACTIVE: "border-green-600",
  "ON-HOLD": "border-gray-600",
  ALERT: "border-red-600",
};

export default function CallGrid(): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-4">
      {STATIC_CALLS.map((call) => (
        <div
          key={call.id}
          className={`border-2 rounded-lg p-4 bg-gray-800 ${BORDER_STYLES[call.status]}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-mono text-sm font-semibold">
              {call.label}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded font-mono font-bold ${STATUS_STYLES[call.status]}`}
            >
              {call.status}
            </span>
          </div>
          <div className="text-gray-500 text-xs font-mono">
            {call.status === "ACTIVE" ? "Monitoring audio..." : "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
