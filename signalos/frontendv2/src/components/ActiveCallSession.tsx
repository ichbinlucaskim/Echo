"use client";

import { ArrowRight, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSelectedCall } from "../context/SelectedCallContext";
import { useSignalOSContext } from "../context/SignalOSContext";
import AudioWaveform from "./AudioWaveform";

const C = {
  bg: "#121212",
  alertRed: "#FF3B30",
  dispatchGreen: "#34C759",
  chatBlue: "#007AFF",
  holdOrange: "#FF9500",
  dispatchBubble: "#8E8E93",
  muteGray: "#AEAEB2",
  endRed: "#FF3B30",
} as const;

const MOCK_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

const CATEGORY_LABELS: Record<string, string> = {
  MONITORING: "Monitoring",
  NON_EMERGENCY: "Non-Emergency",
  MEDICAL: "Medical",
  TRAFFIC: "Traffic",
  FIRE_HAZARD: "Fire Hazard",
  CRIME: "Crime",
  SILENT_DISTRESS: "Silent Distress",
};

function stressFromConfidence(
  isAlert: boolean,
  confidence: number | undefined
): number {
  if (isAlert && confidence != null) {
    return Math.min(99, Math.round(confidence * 100));
  }
  if (isAlert) return 80;
  return 0;
}

function stressLabel(pct: number): string {
  if (pct >= 70) return "Mentally Unstable";
  if (pct >= 45) return "Elevated";
  if (pct > 0) return "Mild";
  return "Stable";
}

const cardRadius = "rounded-[14px]";

export default function ActiveCallSession() {
  const { selectedCallId, clearSelection } = useSelectedCall();
  const { calls, activeAlert, dismissAlert } = useSignalOSContext();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const call = selectedCallId ? calls[selectedCallId] : undefined;

  const name = call ? MOCK_NAMES[call.callId] ?? DEFAULT_NAME : DEFAULT_NAME;
  const isAlert = call?.status === "ALERT";
  const alertForCall =
    activeAlert?.callId === selectedCallId ? activeAlert : null;
  const showAlertBar = Boolean(call && (isAlert || alertForCall));

  // Use real category from backend
  const category = call?.category ?? "MONITORING";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const categorySummary = call?.categorySummary ?? "";

  const stress = stressFromConfidence(isAlert, alertForCall?.confidence);
  const stressText = stressLabel(stress);

  // Build transcript lines from real backend data
  const transcriptLines = useMemo(() => {
    if (!call) return [];
    const lines: { from: "caller" | "system"; text: string }[] = [];

    // Real transcript from Gemini
    const transcript = call.transcript?.trim();
    if (transcript) {
      lines.push({ from: "caller", text: transcript });
    }

    // Category summary from Gemini
    if (categorySummary) {
      lines.push({ from: "system", text: `Category: ${categoryLabel} — ${categorySummary}` });
    }

    // Alert info
    if (alertForCall) {
      lines.push({
        from: "system",
        text: `Alert: ${alertForCall.anomalyType} detected (${Math.round(alertForCall.confidence * 100)}% confidence)`,
      });
      if (alertForCall.suggestedResponse) {
        lines.push({ from: "system", text: `Suggested: ${alertForCall.suggestedResponse}` });
      }
    }

    if (lines.length === 0) {
      lines.push({ from: "system", text: "Listening to call audio..." });
    }

    return lines;
  }, [call, alertForCall, categorySummary, categoryLabel]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLines]);

  if (!selectedCallId || !call) return null;

  const callerFirst = name.split(" ")[0] ?? name;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col antialiased"
      style={{ backgroundColor: C.bg, fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-call-session-title"
    >
      <h2 id="active-call-session-title" className="sr-only">
        Active call — {name}
      </h2>

      {/* Top: close + alert bar */}
      <header className="shrink-0 px-5 pt-5 pb-4 md:px-8 md:pt-6">
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-[12px] p-2 text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors"
            aria-label="Close call view"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {showAlertBar && (
          <div
            className={`${cardRadius} border px-4 py-3.5 md:px-5 md:py-4 flex items-start gap-3`}
            style={{
              borderColor: "rgba(139, 0, 0, 0.55)",
              backgroundColor: "rgba(60, 10, 10, 0.35)",
            }}
          >
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full animate-pulse"
              style={{ backgroundColor: C.alertRed }}
            />
            <p className="text-[15px] md:text-base leading-relaxed">
              <span className="font-bold" style={{ color: C.alertRed }}>
                Alert
              </span>
              <span className="text-white font-normal">
                {" "}
                {name} needs attention. (Category: {categoryLabel})
              </span>
            </p>
          </div>
        )}
      </header>

      {/* Main: dispatch | waveform | stress+transcript */}
      <div className="flex-1 flex flex-col min-h-0 px-5 md:px-8 pb-6">
        <div
          className="flex-1 grid min-h-0 gap-6 md:gap-8 grid-cols-1 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,300px)] lg:items-stretch lg:grid-rows-1 auto-rows-min"
        >
          {/* Left: Call Info */}
          <section
            className={`order-2 lg:order-1 ${cardRadius} bg-white p-5 md:p-6 flex flex-col shadow-none border-0`}
          >
            <h3 className="font-bold text-[17px] text-black mb-5 tracking-tight">
              Call Info
            </h3>

            {/* Category badge */}
            <div
              className={`${cardRadius} border-2 px-4 py-3.5 mb-4`}
              style={{
                borderColor: isAlert ? C.alertRed : C.dispatchGreen,
                backgroundColor: isAlert ? "rgba(255, 59, 48, 0.06)" : "rgba(52, 199, 89, 0.06)",
              }}
            >
              <p className="font-bold text-[15px] text-black tracking-tight uppercase">
                {categoryLabel}
              </p>
              {categorySummary && (
                <p className="text-[13px] text-neutral-500 mt-1.5">
                  {categorySummary}
                </p>
              )}
            </div>

            {/* Alert details */}
            {alertForCall && (
              <div className={`${cardRadius} border border-red-200 bg-red-50 px-4 py-3.5 mb-4`}>
                <p className="font-bold text-[13px] text-red-600 uppercase tracking-wide">
                  {alertForCall.anomalyType} — {Math.round(alertForCall.confidence * 100)}%
                </p>
                {alertForCall.suggestedResponse && (
                  <p className="text-[13px] text-red-800 mt-1.5">
                    {alertForCall.suggestedResponse}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              className={`mt-auto w-full ${cardRadius} py-3.5 px-5 font-bold text-[16px] text-white flex flex-row items-center justify-between transition-opacity hover:opacity-95 active:opacity-90`}
              style={{ backgroundColor: C.dispatchGreen }}
            >
              <span>Dispatch</span>
              <ArrowRight className="w-5 h-5 shrink-0" strokeWidth={2.5} />
            </button>
          </section>

          {/* Center: waveform */}
          <div className="order-1 lg:order-2 flex flex-col items-center justify-center min-h-[160px] lg:min-h-0 py-2 lg:py-8">
            <AudioWaveform />
          </div>

          {/* Right: Stress + Transcript */}
          <div className="order-3 flex flex-col gap-4 min-h-0 lg:min-h-0">
            <section
              className={`${cardRadius} bg-white p-5 md:p-6 shrink-0 border-t-[3px]`}
              style={{ borderTopColor: stress >= 45 ? C.alertRed : C.dispatchGreen }}
            >
              <h3 className="font-bold text-[17px] text-black mb-3 tracking-tight">
                Stress Level
              </h3>
              <p
                className="text-[42px] md:text-[48px] font-bold leading-none tracking-tight"
                style={{ color: stress >= 45 ? C.alertRed : C.dispatchGreen }}
              >
                {stress > 0 ? `${stress}%` : "—"}
              </p>
              <p className="text-[15px] text-black font-medium mt-2">
                {stressText}
              </p>
            </section>

            <section
              className={`${cardRadius} bg-white p-5 md:p-6 flex-1 flex flex-col min-h-[220px] lg:min-h-0 lg:max-h-[min(52vh,420px)]`}
            >
              <h3 className="font-bold text-[17px] text-black mb-4 tracking-tight shrink-0">
                Live Transcript
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 min-h-0">
                {transcriptLines.map((line, idx) => (
                  <div
                    key={`${line.from}-${idx}`}
                    className={
                      line.from === "caller"
                        ? "flex flex-col items-start"
                        : "flex flex-col items-end"
                    }
                  >
                    <span className="text-[12px] text-black font-medium mb-1 px-0.5 opacity-80">
                      {line.from === "caller" ? callerFirst : "AI Monitor"}
                    </span>
                    <div
                      className={`max-w-[min(100%,280px)] px-4 py-2.5 text-[15px] leading-snug text-white ${cardRadius}`}
                      style={{
                        backgroundColor:
                          line.from === "caller" ? C.chatBlue : C.dispatchBubble,
                        borderTopLeftRadius: line.from === "caller" ? 6 : 14,
                        borderTopRightRadius: line.from !== "caller" ? 6 : 14,
                      }}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
                <div ref={transcriptEndRef} />
              </div>
            </section>
          </div>
        </div>

        {/* Bottom center: call controls */}
        <div className="shrink-0 flex justify-center items-center gap-5 md:gap-6 pt-8 md:pt-10">
          <button
            type="button"
            className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity hover:opacity-90`}
            style={{ backgroundColor: C.muteGray }}
            aria-label="Mute"
          >
            <MicOff className="w-6 h-6" strokeWidth={2} />
          </button>
          <button
            type="button"
            className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity hover:opacity-90`}
            style={{ backgroundColor: C.holdOrange }}
            aria-label="Hold"
          >
            <span className="flex flex-col items-center justify-center gap-0.5">
              <span className="flex gap-1">
                <span className="w-[3px] h-2.5 bg-white rounded-[1px]" />
                <span className="w-[3px] h-2.5 bg-white rounded-[1px]" />
              </span>
              <Phone className="w-[18px] h-[18px] -scale-x-100" strokeWidth={2.5} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isAlert) dismissAlert();
              clearSelection();
            }}
            className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity hover:opacity-90`}
            style={{ backgroundColor: C.endRed }}
            aria-label="End call"
          >
            <PhoneOff className="w-6 h-6" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
