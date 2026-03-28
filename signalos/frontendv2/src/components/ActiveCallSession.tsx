"use client";

import {
  ArrowRight,
  MicOff,
  Phone,
  PhoneOff,
  X,
} from "lucide-react";
import { useMemo } from "react";
import { useSelectedCall } from "../context/SelectedCallContext";
import { useSignalOS } from "../lib/socket";
import type { AnomalyType } from "../types";
import AudioWaveform from "./AudioWaveform";

const MOCK_NAMES: Record<string, string> = {
  sim_call_1: "Monica Schmidt",
  sim_call_2: "James Anderson",
  sim_call_3: "Sofia Patel",
  sim_call_4: "Carlos Rodriguez",
  sim_call_5: "Emma Johnson",
};
const DEFAULT_NAME = "Liam Thompson";

function categoryFromAnomaly(t: AnomalyType | undefined): string {
  if (!t) return "Incident";
  const map: Record<AnomalyType, string> = {
    WHISPER: "Crime",
    STROKE: "Medical",
    DISTRESS_SOUND: "Distress",
  };
  return map[t] ?? "Incident";
}

function stressPercent(
  callId: string,
  isAlert: boolean,
  confidence: number | undefined
): number {
  if (isAlert && confidence != null) {
    return Math.min(99, Math.round(confidence * 100));
  }
  if (isAlert) return 80;
  let h = 0;
  for (let i = 0; i < callId.length; i++) h = (h + callId.charCodeAt(i) * (i + 1)) % 47;
  return 28 + (h % 35);
}

function stressLabel(pct: number): string {
  if (pct >= 70) return "Mentally Unstable";
  if (pct >= 45) return "Elevated";
  return "Stable";
}

export default function ActiveCallSession() {
  const { selectedCallId, clearSelection } = useSelectedCall();
  const { calls, activeAlert, dismissAlert } = useSignalOS();

  const call = selectedCallId ? calls[selectedCallId] : undefined;

  const name = call
    ? MOCK_NAMES[call.callId] ?? DEFAULT_NAME
    : DEFAULT_NAME;
  const isAlert = call?.status === "ALERT";
  const alertForCall =
    activeAlert?.callId === selectedCallId ? activeAlert : null;
  const showAlertBar = Boolean(call && (isAlert || alertForCall));
  const category = categoryFromAnomaly(alertForCall?.anomalyType);
  const stress = call
    ? stressPercent(
        call.callId,
        isAlert,
        alertForCall?.confidence
      )
    : 0;
  const stressText = stressLabel(stress);

  const transcriptLines = useMemo(() => {
    if (!call) return [];
    const lines: { from: "caller" | "dispatch"; text: string }[] = [
      { from: "caller", text: "Hello?" },
      { from: "dispatch", text: "Are you in danger?" },
    ];
    const body =
      alertForCall?.transcript?.trim() ||
      call.transcript?.trim() ||
      "No, I am reporting a car accident on I-5.";
    lines.push({ from: "caller", text: body });
    lines.push({ from: "dispatch", text: "..." });
    return lines;
  }, [call, alertForCall]);

  if (!selectedCallId || !call) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#1a1a1a] text-neutral-900"
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-call-session-title"
    >
      <h2 id="active-call-session-title" className="sr-only">
        Active call — {name}
      </h2>
      <div className="flex items-center justify-end px-4 pt-3 pb-2 shrink-0">
        <button
          type="button"
          onClick={clearSelection}
          className="rounded-xl p-2.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close call view"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {showAlertBar && (
        <div className="mx-4 mb-4 rounded-xl border border-red-900/60 bg-red-950/25 px-4 py-3 flex items-start gap-3">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
          <p className="text-[15px] leading-snug text-red-300/95">
            <span className="font-bold text-red-200">Alert</span>{" "}
            <span>
              {name} needs attention. (Category: {category})
            </span>
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 px-4 pb-6">
        <div className="flex-1 flex items-center justify-center min-h-[140px]">
          <AudioWaveform />
        </div>

        <div className="flex justify-center gap-4 py-6">
          <button
            type="button"
            className="h-14 w-14 rounded-2xl bg-neutral-600 flex items-center justify-center text-white shadow-lg hover:bg-neutral-500 transition-colors"
            aria-label="Mute"
          >
            <MicOff className="w-6 h-6" />
          </button>
          <button
            type="button"
            className="h-14 w-14 rounded-2xl bg-amber-700/90 flex items-center justify-center text-white shadow-lg hover:bg-amber-600 transition-colors"
            aria-label="Hold"
          >
            <span className="flex flex-col items-center gap-0.5">
              <span className="flex gap-0.5">
                <span className="w-0.5 h-2 bg-white rounded-sm" />
                <span className="w-0.5 h-2 bg-white rounded-sm" />
              </span>
              <Phone className="w-4 h-4 -scale-x-100" />
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isAlert) dismissAlert();
              clearSelection();
            }}
            className="h-14 w-14 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-lg hover:bg-red-500 transition-colors"
            aria-label="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl mx-auto w-full">
          <div className="rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-bold text-lg text-black mb-4">Nearest Police</h3>
            <div className="rounded-xl border border-emerald-400/70 bg-emerald-50/50 px-4 py-3 mb-4">
              <p className="font-bold text-black">SFPO</p>
              <p className="text-sm text-neutral-500 mt-1">
                Officer ID: #12345678
              </p>
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3.5 flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              Dispatch
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="rounded-2xl bg-white p-5 shadow-xl border-t-4 border-red-500">
              <h3 className="font-bold text-lg text-black mb-1">Stress Level</h3>
              <p className="text-4xl font-bold text-red-600">{stress}%</p>
              <p className="text-black font-medium mt-1">{stressText}</p>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-xl flex-1 flex flex-col min-h-[200px] max-h-[280px] md:max-h-[320px]">
              <h3 className="font-bold text-lg text-black mb-3">Transcript</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                {transcriptLines.map((line, idx) => (
                  <div
                    key={`${line.from}-${idx}`}
                    className={
                      line.from === "caller"
                        ? "flex flex-col items-start"
                        : "flex flex-col items-end"
                    }
                  >
                    <span className="text-xs text-neutral-400 mb-1 px-1">
                      {line.from === "caller" ? name.split(" ")[0] : "Dispatch"}
                    </span>
                    <div
                      className={
                        line.from === "caller"
                          ? "max-w-[92%] rounded-2xl rounded-tl-md bg-sky-500 text-white px-4 py-2.5 text-[15px] leading-snug"
                          : "max-w-[92%] rounded-2xl rounded-tr-md bg-neutral-400 text-white px-4 py-2.5 text-[15px] leading-snug"
                      }
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
