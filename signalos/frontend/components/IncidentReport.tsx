import { AlertPayload } from "../types";

interface IncidentReportProps {
  alert: AlertPayload | null;
}

export default function IncidentReport({
  alert,
}: IncidentReportProps): React.JSX.Element {
  return (
    <div className="border border-gray-600 rounded-lg p-4 bg-gray-800 h-full">
      <h2 className="text-white font-bold text-sm mb-4 font-mono uppercase tracking-wide">
        Incident Report
      </h2>
      <div className="space-y-3">
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase mb-1">Call ID</p>
          <p className="text-gray-400 text-sm font-mono">
            {alert?.callId ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase mb-1">Time</p>
          <p className="text-gray-400 text-sm font-mono">
            {alert ? new Date(alert.timestamp).toLocaleTimeString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase mb-1">Anomaly Type</p>
          <p className="text-gray-400 text-sm font-mono">
            {alert?.anomalyType ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase mb-1">Transcript</p>
          <p className="text-gray-400 text-sm leading-relaxed">
            {alert?.transcript ? `"${alert.transcript}"` : "—"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-xs font-mono uppercase mb-1">
            Dispatcher Action
          </p>
          <p className="text-gray-400 text-sm">—</p>
        </div>
      </div>
    </div>
  );
}
