"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";

interface Officer {
  id: string;
  name: string;
  code: string;
  officer_id: string;
  status: "available" | "busy" | "critical" | "unavailable";
  location: string;
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-green-500/20 text-green-400 border border-green-500/30",
  busy: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  critical: "bg-red-500/20 text-red-400 border border-red-500/30",
  unavailable: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function DispatchList() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;

    async function fetchOfficers() {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from("officers")
          .select("*")
          .order("name");

        if (error) {
          console.error("[Dispatch] Failed to fetch officers:", error.message);
        } else {
          setOfficers(data as Officer[]);
        }
      } catch (err) {
        console.error("[Dispatch] Supabase not configured:", err);
      }
      setLoading(false);
    }

    fetchOfficers();

    // Subscribe to real-time changes
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel("officers-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "officers" },
          () => {
            fetchOfficers();
          }
        )
        .subscribe();
    } catch {
      // Supabase not configured yet — skip realtime
    }

    return () => {
      if (channel) {
        try {
          getSupabase().removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="absolute inset-x-0 top-0 bottom-24 z-30 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-[90%] max-w-[900px] max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-8 pt-7 pb-4">
          <h2 className="text-white font-bold text-2xl tracking-tight">
            Dispatch List
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-6">
          {loading ? (
            <p className="text-gray-500 text-sm py-10 text-center font-mono">
              LOADING OFFICERS...
            </p>
          ) : officers.length === 0 ? (
            <p className="text-gray-500 text-sm py-10 text-center font-mono">
              NO OFFICERS FOUND
            </p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-[13px] font-medium tracking-wide">
                  <th className="pb-4 pr-4">Officer name (Code)</th>
                  <th className="pb-4 pr-4">Officer ID</th>
                  <th className="pb-4 pr-4">Status</th>
                  <th className="pb-4">Location</th>
                </tr>
              </thead>
              <tbody>
                {officers.map((officer) => (
                  <tr
                    key={officer.id}
                    className="border-t border-white/5 text-[15px]"
                  >
                    <td className="py-4 pr-4 text-white font-medium">
                      {officer.name} ({officer.code})
                    </td>
                    <td className="py-4 pr-4 text-gray-300 tabular-nums">
                      {officer.officer_id}
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-block text-[12px] font-semibold px-2.5 py-1 rounded-md ${
                          STATUS_STYLES[officer.status] ??
                          STATUS_STYLES.unavailable
                        }`}
                      >
                        {capitalize(officer.status)}
                      </span>
                    </td>
                    <td className="py-4 text-gray-300">{officer.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
