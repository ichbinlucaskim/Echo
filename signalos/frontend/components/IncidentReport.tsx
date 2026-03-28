"use client";

import { useEffect, useState } from "react";
import { AlertPayload } from "../types";

interface IncidentReportProps {
  alert: AlertPayload | null;
  onResolve: () => void;
}

export default function IncidentReport({
  alert,
  onResolve,
}: IncidentReportProps): React.JSX.Element {
  const [dispatcherAction, setDispatcherAction] = useState("");

  // Reset textarea when a new alert comes in
  useEffect(() => {
    setDispatcherAction("");
  }, [alert?.callId]);

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800 h-full flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-gray-700">
        <h2 className="text-white font-bold text-xs font-mono uppercase tracking-widest">
          Incident Report
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Call ID" value={alert?.callId ?? null} mono />
        <Field
          label="Time"
          value={
            alert ? new Date(alert.timestamp).toLocaleTimeString() : null
          }
          mono
        />
        <Field label="Anomaly Type" value={alert?.anomalyType ?? null} mono />
        <Field
          label="Transcript"
          value={alert?.transcript ? `"${alert.transcript}"` : null}
        />
        <Field
          label="Suggested Response"
          value={
            alert?.suggestedResponse
              ? `"${alert.suggestedResponse}"`
              : null
          }
        />

        {/* Editable dispatcher action */}
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">
            Dispatcher Action
          </p>
          <textarea
            value={dispatcherAction}
            onChange={(e) => setDispatcherAction(e.target.value)}
            placeholder="Enter action taken..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-300 text-sm font-mono resize-none placeholder-gray-600 focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>

      {/* Mark Resolved button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={onResolve}
          disabled={!alert}
          className="w-full py-2 rounded text-sm font-mono font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-gray-700 hover:bg-gray-600 text-white disabled:hover:bg-gray-700"
        >
          Mark Resolved
        </button>
      </div>
    </div>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string | null;
  mono?: boolean;
}

function Field({ label, value, mono = false }: FieldProps): React.JSX.Element {
  return (
    <div>
      <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-1">
        {label}
      </p>
      <p
        className={`text-sm ${mono ? "font-mono" : ""} ${
          value ? "text-gray-300" : "text-gray-600"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
