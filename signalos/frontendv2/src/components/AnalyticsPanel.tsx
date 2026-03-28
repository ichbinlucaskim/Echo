"use client";

import { useEffect, useState } from "react";
import { Phone, ArrowLeft } from "lucide-react";
import { getSupabase } from "../lib/supabase";

interface CallLog {
  id: string;
  caller_name: string;
  phone_number: string;
  transcript: string;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AnalyticsPanel() {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("call_logs")
          .select("*")
          .order("created_at", { ascending: false });
        if (!cancelled && data && !error) setCalls(data as CallLog[]);
      } catch {
        // Supabase not configured yet — show empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalCalls = calls.length;
  const cardRadius = "rounded-[14px]";

  // ── Transcript view ─────────────────────────────────────────────────────
  if (selectedCall && showTranscript) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className={`bg-[#1c1c1e] ${cardRadius} w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl`}>
          <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/10">
            <button
              type="button"
              onClick={() => setShowTranscript(false)}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h3 className="text-white font-semibold text-lg">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <p className="text-white/80 text-[15px] leading-relaxed whitespace-pre-wrap">
              {selectedCall.transcript || "No transcript available."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Call detail view ────────────────────────────────────────────────────
  if (selectedCall) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
        <div className={`bg-[#1c1c1e] ${cardRadius} w-full max-w-md shadow-2xl`}>
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/10">
            <button
              type="button"
              onClick={() => setSelectedCall(null)}
              className="text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-white font-semibold text-lg">{selectedCall.caller_name}</h3>
              <p className="text-white/50 text-sm">{formatTime(selectedCall.created_at)}</p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Phone</span>
              <span className="text-white text-sm">{selectedCall.phone_number}</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTranscript(true)}
                className={`flex-1 py-3 ${cardRadius} text-white font-semibold text-sm`}
                style={{ backgroundColor: "#34C759" }}
              >
                View Transcript
              </button>
              <button
                type="button"
                className={`flex-1 py-3 ${cardRadius} text-white font-semibold text-sm opacity-50 cursor-not-allowed`}
                style={{ backgroundColor: "#34C759" }}
                disabled
              >
                View Recording
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main analytics view ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-x-0 top-0 bottom-20 z-40 flex justify-center overflow-y-auto px-4 pt-6 pb-4">
      <div className="w-full max-w-md space-y-6">
        {/* Daily Report */}
        <section className={`bg-[#1c1c1e]/90 backdrop-blur-md ${cardRadius} p-5 border border-white/5 shadow-2xl`}>
          <h2 className="text-white font-bold text-xl mb-5 tracking-tight">Daily Report</h2>

          <div className={`${cardRadius} bg-[#2c2c2e] p-4 text-center`}>
            <p className="text-[32px] font-bold text-white leading-none">
              {loading ? "—" : totalCalls}
            </p>
            <p className="text-white/50 text-xs mt-2 font-medium">Total Calls</p>
          </div>
        </section>

        {/* Past Calls */}
        <section className={`bg-[#1c1c1e]/90 backdrop-blur-md ${cardRadius} p-5 border border-white/5 shadow-2xl`}>
          <h2 className="text-white font-bold text-xl mb-4 tracking-tight">Past Calls</h2>

          {loading && (
            <p className="text-white/40 text-sm text-center py-8">Loading...</p>
          )}

          {!loading && calls.length === 0 && (
            <p className="text-white/40 text-sm text-center py-8">No call logs yet.</p>
          )}

          <div className="space-y-1">
            {calls.map((call) => (
              <button
                key={call.id}
                type="button"
                onClick={() => setSelectedCall(call)}
                className={`w-full flex items-center gap-3 px-3 py-3 ${cardRadius} hover:bg-white/[0.06] transition-colors text-left`}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#2c2c2e" }}
                >
                  <Phone className="w-4 h-4 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-[15px] truncate">{call.caller_name}</p>
                  <p className="text-white/40 text-xs">{call.phone_number}</p>
                </div>
                <p className="text-white/50 text-sm shrink-0">{formatTime(call.created_at)}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
