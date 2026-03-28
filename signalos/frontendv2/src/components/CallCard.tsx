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

export default function CallCard({ call }: CallCardProps) {
  const [duration, setDuration] = useState("0:00");
  const { selectedCallId, selectCall } = useSelectedCall();

  const isAlert = call.status === "ALERT";
  const isSelected = selectedCallId === call.callId;
  const name = MOCK_NAMES[call.callId] || DEFAULT_NAME;

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
  if (isAlert) ringColor = "border-red-600 bg-red-900/30 text-red-500";
  else if (isSelected)
    ringColor =
      "border-emerald-500/90 bg-emerald-950/35 text-emerald-300 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";

  return (
    <button
      type="button"
      className={`w-full text-left flex flex-col border ${ringColor} rounded-xl overflow-hidden transition-all duration-300 backdrop-blur-md cursor-pointer hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/80`}
      onClick={() => selectCall(call.callId)}
    >
      <div className="flex items-center justify-between p-4 px-5">
        <div className="flex items-center gap-4">
          <Phone className="w-4 h-4 shrink-0" />
          <span className="text-gray-100 font-medium text-[15px] tracking-wide">
            {name}
          </span>
        </div>
        <span className="font-mono text-[14px] font-medium tracking-wider tabular-nums">
          {duration}
        </span>
      </div>
    </button>
  );
}
