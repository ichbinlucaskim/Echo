"use client";

import { CallState, CallStatus } from "../types";

interface CallGridProps {
  calls: Record<string, CallState>;
}

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

export default function CallGrid({ calls }: CallGridProps): React.JSX.Element {
  const callList = Object.values(calls);

  if (callList.length === 0) {
    return (
      <p className="text-gray-500 text-sm font-mono p-4">
        No active calls. Waiting for Twilio connection...
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {callList.map((call) => (
        <div
          key={call.callId}
          className={`border-2 rounded-lg p-4 bg-gray-800 ${BORDER_STYLES[call.status]}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-mono text-sm font-semibold truncate mr-2">
              {call.callId.slice(-6)}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded font-mono font-bold shrink-0 ${STATUS_STYLES[call.status]}`}
            >
              {call.status}
            </span>
          </div>
          <div className="text-gray-400 text-xs font-mono leading-relaxed min-h-[2rem] line-clamp-3">
            {call.transcript || "Monitoring audio..."}
          </div>
        </div>
      ))}
    </div>
  );
}
