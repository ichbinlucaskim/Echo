import { Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { CallState } from "../types";
import { useSelectedCall } from "../context/SelectedCallContext";

interface CallCardProps {
  call: CallState;
}

const MOCK_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

const CATEGORY_COLORS: Record<string, string> = {
  MEDICAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  CRIME: "bg-red-500/20 text-red-400 border-red-500/30",
  FIRE_HAZARD: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  TRAFFIC: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  NON_EMERGENCY: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  SILENT_DISTRESS: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  MONITORING: "bg-white/10 text-gray-500 border-white/10",
};

function formatCategory(cat: string): string {
  return cat.replace(/_/g, " ");
}

export default function CallCard({ call }: CallCardProps) {
  const [duration, setDuration] = useState("0:00");
  const { selectedCallId, selectCall } = useSelectedCall();

  const isAlert = call.status === "ALERT";
  const isOnHold = call.status === "ON-HOLD" || call.onHold;
  const isSelected = selectedCallId === call.callId;
  const name = MOCK_NAMES[call.callId] || DEFAULT_NAME;
  const category = call.category ?? "MONITORING";

  useEffect(() => {
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

  let ringColor = "border-[#1c447a] bg-[#0d1f3b]/30 text-[#4c90f0]";
  let selectionAccent = "";

  if (isAlert) {
    ringColor = "border-red-600 bg-red-900/30 text-red-500";
  } else if (isOnHold) {
    ringColor =
      "border-amber-500/90 bg-amber-950/35 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]";
    if (isSelected) {
      selectionAccent =
        "ring-2 ring-emerald-500/85 ring-offset-2 ring-offset-[#151517]";
    }
  } else if (isSelected) {
    ringColor =
      "border-emerald-500/90 bg-emerald-950/35 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";
  }

  return (
    <button
      type="button"
      className={`w-full text-left flex flex-col border ${ringColor} ${selectionAccent} rounded-xl overflow-hidden transition-all duration-300 backdrop-blur-md cursor-pointer hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80`}
      onClick={() => selectCall(call.callId)}
    >
      <div className="flex items-center justify-between p-4 px-5">
        <div className="flex items-center gap-4 min-w-0">
          <Phone className="w-4 h-4 shrink-0" />
          <span className="text-gray-100 font-medium text-[15px] tracking-wide truncate">
            {name}
          </span>
          {isOnHold && !isAlert && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/25 text-amber-200 border border-amber-500/40">
              Hold
            </span>
          )}
        </div>
        <span className="font-mono text-[14px] font-medium tracking-wider tabular-nums">
          {duration}
        </span>
      </div>

      {/* Category badge + transcript preview */}
      <div className="px-5 pb-3 flex flex-col gap-2">
        <span
          className={`inline-block self-start text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${CATEGORY_COLORS[category] ?? CATEGORY_COLORS.MONITORING}`}
        >
          {formatCategory(category)}
        </span>

      </div>
    </button>
  );
}
