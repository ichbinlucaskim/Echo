"use client";

import { Mic, MicOff, Phone, PhoneOff, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSignalOSContext } from "../context/SignalOSContext";
import AudioWaveform from "./AudioWaveform";
import NearestPolice from "./NearestPolice";

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

const CATEGORY_COLORS: Record<string, string> = {
  MONITORING: "#8E8E93",
  NON_EMERGENCY: "#34C759",
  TRAFFIC: "#FF9500",
  MEDICAL: "#007AFF",
  FIRE_HAZARD: "#FF9500",
  CRIME: "#FF3B30",
  SILENT_DISTRESS: "#AF52DE",
};

function isHighSeverity(category: string, isAlert: boolean): boolean {
  if (isAlert) return true;
  return ["MEDICAL", "CRIME", "FIRE_HAZARD", "SILENT_DISTRESS"].includes(category);
}

const cardRadius = "rounded-[14px]";

export default function ActiveCallSession() {
  const { calls, activeAlert, dismissAlert, connected, sendCommand, selectedCallId } =
    useSignalOSContext();
  const router = useRouter();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const goBack = () => {
    sendCommand({ type: "SELECT_CALL", callId: null });
    router.push("/");
  };

  const call = selectedCallId ? calls[selectedCallId] : undefined;

  const name = call ? MOCK_NAMES[call.callId] ?? DEFAULT_NAME : DEFAULT_NAME;
  const isAlert = call?.status === "ALERT";

  // Red bar on every call screen when this line or any other line is in emergency alert
  const alertingCallId =
    activeAlert?.callId ?? (call?.status === "ALERT" ? call.callId : null);
  const showAlertBar = Boolean(call && alertingCallId !== null);

  const barCall = alertingCallId ? calls[alertingCallId] : undefined;
  const barName = alertingCallId
    ? MOCK_NAMES[alertingCallId] ?? DEFAULT_NAME
    : name;
  const barCategory = barCall?.category ?? "MONITORING";
  const barCategoryLabel = CATEGORY_LABELS[barCategory] ?? barCategory;

  // Use real category from backend (main UI)
  const category = call?.category ?? "MONITORING";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const categorySummary = call?.categorySummary ?? "";

  const highSeverity = isHighSeverity(category, isAlert);
  const categoryColor = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.MONITORING;

  // Build transcript lines from caller speech only
  const transcriptLines = useMemo(() => {
    if (!call) return [];
    const transcript = call.transcript?.trim();
    if (!transcript) return [];
    return transcript.split("\n").filter(Boolean).map((text) => ({ from: "caller" as const, text }));
  }, [call]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptLines]);

  // Server ended the call (Twilio hangup / stream stop) — navigate back
  useEffect(() => {
    if (selectedCallId && !calls[selectedCallId]) goBack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCallId, calls]);

  if (!selectedCallId || !call) return null;

  const callerFirst = name.split(" ")[0] ?? name;
  const muted = call.muted ?? false;
  const onHold = call.onHold ?? false;
  const waveformPaused = muted || onHold;
  const controlsDisabled = !connected;

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

      {/* Top: alert + close on one row (aligned with X — not stacked under it) */}
      <header className="shrink-0 px-5 pt-5 pb-4 md:px-8 md:pt-6">
        <div
          className={`flex w-full gap-3 ${showAlertBar ? "items-start" : "justify-end"}`}
        >
          {showAlertBar && (
            <div
              className={`min-w-0 flex-1 ${cardRadius} border px-4 py-3.5 md:px-5 md:py-4 flex items-start gap-3 md:gap-4`}
              style={{
                borderColor: "rgba(139, 0, 0, 0.55)",
                backgroundColor: "rgba(60, 10, 10, 0.35)",
              }}
            >
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full animate-pulse"
                style={{ backgroundColor: C.alertRed }}
              />
              <div className="flex min-w-0 flex-1 items-start gap-4 md:gap-8 lg:gap-10">
                <span
                  className="shrink-0 pt-0.5 text-[13px] font-bold tracking-[0.12em] md:text-sm"
                  style={{ color: C.alertRed }}
                >
                  ALERT
                </span>
                <p className="min-w-0 flex-1 border-l border-white/20 pl-4 text-[15px] font-normal leading-relaxed text-white md:pl-6 md:text-base">
                  <span className="font-medium text-white">
                    {barName}
                  </span>
                  <span className="text-white/90">
                    {" "}
                    needs attention. (Category: {barCategoryLabel})
                  </span>
                  {alertingCallId !== selectedCallId && (
                    <span className="mt-1.5 block text-[14px] leading-snug text-white/65 md:mt-2">
                      You are speaking to {name}.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={goBack}
            className="shrink-0 rounded-[12px] p-2 text-white/50 hover:bg-white/[0.06] hover:text-white transition-colors"
            aria-label="Close call view"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Main: grid fills space down to the control row; side columns stretch with the center */}
      <div className="flex-1 flex flex-col min-h-0 px-5 md:px-8 pb-4">
        <div
          className="flex-1 min-h-0 grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)_minmax(0,320px)] lg:grid-rows-1 lg:items-stretch lg:gap-8"
        >
          {/* Left: Nearest Police — same column height as right; bottom aligns with transcript card */}
          <section
            className={`order-2 lg:order-1 flex h-full min-h-[280px] w-full min-w-0 flex-col lg:min-h-0 ${cardRadius} border border-gray-200 bg-white p-5 shadow-sm md:p-6`}
          >
            <NearestPolice />
          </section>

          {/* Center: waveform on bare background (no panel), centered */}
          <div className="order-1 flex min-h-[240px] h-full min-w-0 flex-col justify-center lg:order-2 lg:min-h-0">
            <div className="flex w-full flex-1 flex-col items-center justify-center px-2 md:px-4">
              <AudioWaveform paused={waveformPaused} />
              {(muted || onHold) && (
                <p className="mt-5 max-w-xs text-center text-xs tracking-wide text-white/45">
                  {[onHold && "On hold", muted && "Monitoring muted"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Right: same track width as Nearest Police (320px) so center waveform is visually centered */}
          <div className="order-3 flex h-full min-h-[360px] w-full min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
            <section
              className={`w-full min-w-0 ${cardRadius} bg-white p-5 md:p-6 shrink-0 border-2 shadow-sm`}
              style={{
                borderColor: highSeverity ? C.alertRed : categoryColor,
              }}
            >
              <h3 className="font-bold text-[17px] text-black mb-3 tracking-tight">
                Category
              </h3>
              <p
                className="text-[28px] md:text-[32px] font-bold leading-none tracking-tight"
                style={{ color: highSeverity ? C.alertRed : categoryColor }}
              >
                {categoryLabel}
              </p>
              {categorySummary && (
                <p className="text-[14px] text-gray-500 font-medium mt-2 leading-snug">
                  {categorySummary}
                </p>
              )}
            </section>

            <section
              className={`w-full min-w-0 ${cardRadius} bg-white p-5 md:p-6 flex flex-1 flex-col min-h-0 border border-gray-200 shadow-sm`}
            >
              <h3 className="font-bold text-[17px] text-black mb-4 tracking-tight shrink-0">
                Live Transcript
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 min-h-0">
                {transcriptLines.length === 0 ? (
                  <p className="text-gray-400 text-[14px]">Listening to call audio...</p>
                ) : (
                  transcriptLines.map((line, idx) => (
                    <div key={idx} className="flex flex-col items-start">
                      <span className="text-[12px] text-black font-medium mb-1 px-0.5 opacity-80">
                        {callerFirst}
                      </span>
                      <div
                        className={`max-w-[min(100%,280px)] px-4 py-2.5 text-[15px] leading-snug text-white ${cardRadius}`}
                        style={{
                          backgroundColor: C.chatBlue,
                          borderTopLeftRadius: 6,
                          borderTopRightRadius: 14,
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={transcriptEndRef} />
              </div>
            </section>
          </div>
        </div>

        {/* Bottom center: call controls (hold / mute / end) */}
        <div className="shrink-0 flex flex-col items-center gap-3 pt-6 md:pt-8">
          {/* Route to Non-Emergency button */}
          {call.status !== "ROUTED" && (
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() =>
                sendCommand({ type: "ROUTE_NON_EMERGENCY", callId: call.callId })
              }
              className={`px-6 py-2 ${cardRadius} text-[14px] font-semibold border transition-opacity ${
                controlsDisabled
                  ? "opacity-40 cursor-not-allowed border-gray-600 text-gray-500"
                  : "border-gray-500 text-gray-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              Route to Non-Emergency
            </button>
          )}
          {call.status === "ROUTED" && (
            <p className="text-gray-500 text-xs font-medium">
              Routed to Non-Emergency
            </p>
          )}
          {!connected && (
            <p className="text-amber-400/90 text-xs font-medium">
              Not connected to server — controls disabled
            </p>
          )}
          <div className="flex justify-center items-center gap-5 md:gap-6">
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() =>
                sendCommand({
                  type: "SET_MUTE",
                  callId: call.callId,
                  muted: !muted,
                })
              }
              className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity ${
                controlsDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:opacity-90"
              } ${muted ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[#121212]" : ""}`}
              style={{ backgroundColor: C.muteGray }}
              aria-label={muted ? "Unmute monitoring" : "Mute monitoring"}
              aria-pressed={muted}
            >
              {muted ? (
                <MicOff className="w-6 h-6" strokeWidth={2} />
              ) : (
                <Mic className="w-6 h-6" strokeWidth={2} />
              )}
            </button>
            <button
              type="button"
              disabled={controlsDisabled}
              onClick={() =>
                sendCommand({
                  type: "SET_HOLD",
                  callId: call.callId,
                  onHold: !onHold,
                })
              }
              className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity ${
                controlsDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:opacity-90"
              } ${onHold ? "ring-2 ring-white/70 ring-offset-2 ring-offset-[#121212]" : ""}`}
              style={{ backgroundColor: C.holdOrange }}
              aria-label={onHold ? "Resume call" : "Hold call"}
              aria-pressed={onHold}
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
              disabled={controlsDisabled}
              onClick={() => {
                sendCommand({ type: "END_CALL", callId: call.callId });
                if (isAlert) dismissAlert();
                goBack();
              }}
              className={`h-[56px] w-[56px] md:h-[60px] md:w-[60px] ${cardRadius} flex items-center justify-center text-white transition-opacity ${
                controlsDisabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:opacity-90"
              }`}
              style={{ backgroundColor: C.endRed }}
              aria-label="End call"
            >
              <PhoneOff className="w-6 h-6" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
