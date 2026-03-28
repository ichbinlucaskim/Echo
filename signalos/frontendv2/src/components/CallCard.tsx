import { Phone, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { CallState, AlertPayload } from "../types";
// Removed date-fns as it is unused

interface CallCardProps {
  call: CallState;
  alert: AlertPayload | null;
  onResolve: () => void;
}

// Deterministic mock names based on callId for the demo
const MOCK_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

export default function CallCard({ call, alert, onResolve }: CallCardProps) {
  const [duration, setDuration] = useState("0:00");
  const [expanded, setExpanded] = useState(false);

  const isAlert = call.status === "ALERT";
  const name = MOCK_NAMES[call.callId] || DEFAULT_NAME;
  const isThisAlert = alert?.callId === call.callId;

  // Auto-expand on alert
  useEffect(() => {
    if (isAlert) setExpanded(true);
  }, [isAlert]);

  // Timer loop
  useEffect(() => {
    // start is an ISO string from backend date, we need to parse it
    const start = new Date(call.startedAt);
    if (isNaN(start.getTime())) return;

    const interval = setInterval(() => {
      const ms = Math.max(0, Date.now() - start.getTime());
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      setDuration(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [call.startedAt]);

  let ringColor = "border-[#1c447a] bg-[#0d1f3b]/30 text-[#4c90f0]"; // Blue ACTIVE
  if (isAlert) ringColor = "border-red-600 bg-red-900/30 text-red-500"; // Red ALERT

  return (
    <div
      className={`flex flex-col border ${ringColor} rounded-xl overflow-hidden transition-all duration-300 backdrop-blur-md cursor-pointer hover:bg-white/5`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header (Always Visible) */}
      <div className="flex items-center justify-between p-4 px-5">
        <div className="flex items-center gap-4">
          <Phone className="w-4 h-4" />
          <span className="text-gray-100 font-medium text-[15px] tracking-wide">
            {name}
          </span>
        </div>
        <span className="font-mono text-[14px] font-medium tracking-wider">
          {duration}
        </span>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded && isAlert && isThisAlert ? "max-h-[500px] border-t border-red-800/50" : "max-h-0"
        }`}
      >
        <div className="p-5 bg-red-950/40" onClick={(e) => e.stopPropagation()}>
          {alert && (
            <>
              <div className="mb-4">
                <h4 className="text-red-400 font-bold font-mono tracking-widest text-xs uppercase mb-1">
                  Anomaly Detected
                </h4>
                <div className="flex items-end gap-2 text-red-100 text-lg font-medium">
                  {alert.anomalyType}{" "}
                  <span className="text-red-400/80 text-sm mb-0.5">
                    ({Math.round(alert.confidence * 100)}% Match)
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-red-400 font-bold font-mono tracking-widest text-xs uppercase mb-1">
                  Live Transcript
                </h4>
                <p className="text-gray-300 text-sm italic leading-relaxed bg-black/20 p-3 rounded-lg border border-red-900/30">
                  &quot;{alert.transcript}&quot;
                </p>
              </div>

              <div className="mb-5">
                <h4 className="text-red-400 font-bold font-mono tracking-widest text-xs uppercase mb-1">
                  Suggested Action
                </h4>
                <p className="text-white text-sm font-medium">
                  {alert.suggestedResponse}
                </p>
              </div>
            </>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve();
              setExpanded(false);
            }}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Resolve Incident
          </button>
        </div>
      </div>
    </div>
  );
}
