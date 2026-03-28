"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { getSupabase } from "../lib/supabase";

interface Officer {
  id: string;
  name: string;
  code: string;
  officer_id: string;
  status: string;
  location: string;
}

const cardRadius = "rounded-[14px]";

export default function NearestPolice() {
  const [officer, setOfficer] = useState<Officer | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  const fetchNearest = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .eq("status", "available")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("[NearestPolice] Fetch error:", error.message);
      }
      setOfficer(data as Officer | null);
    } catch (err) {
      console.error("[NearestPolice] Supabase not configured:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNearest();
  }, [fetchNearest]);

  const handleDispatch = async () => {
    if (!officer || dispatching) return;
    setDispatching(true);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("officers")
        .update({ status: "busy" })
        .eq("id", officer.id);

      if (error) {
        console.error("[NearestPolice] Dispatch error:", error.message);
      } else {
        setDispatched(true);
      }
    } catch (err) {
      console.error("[NearestPolice] Supabase error:", err);
    }
    setDispatching(false);
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-bold text-[17px] text-black mb-5 tracking-tight">
        Nearest Police
      </h3>

      {loading ? (
        <p className="text-neutral-400 text-sm">Loading...</p>
      ) : !officer ? (
        <p className="text-neutral-400 text-sm">No officers available</p>
      ) : (
        <>
          <div
            className={`${cardRadius} border-2 px-4 py-3.5 mb-4`}
            style={{
              borderColor: dispatched ? "#6b8f3c" : "#c8c87a",
              backgroundColor: dispatched
                ? "rgba(107, 143, 60, 0.06)"
                : "rgba(200, 200, 122, 0.08)",
            }}
          >
            <p className="font-bold text-[16px] text-black tracking-tight">
              {officer.code}
            </p>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              Officer ID: #{officer.officer_id}
            </p>
          </div>

          <button
            type="button"
            disabled={dispatching || dispatched}
            onClick={handleDispatch}
            className={`mt-auto w-full ${cardRadius} py-3.5 px-5 font-bold text-[16px] text-white flex flex-row items-center justify-between transition-opacity ${
              dispatched
                ? "opacity-60 cursor-default"
                : "hover:opacity-95 active:opacity-90"
            }`}
            style={{ backgroundColor: dispatched ? "#555" : "#6b8f3c" }}
          >
            <span>{dispatched ? "Dispatched" : "Dispatch"}</span>
            <ArrowRight className="w-5 h-5 shrink-0" strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
}
