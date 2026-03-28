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
  lat: number;
  lng: number;
  distance?: number;
}

// Center point for distance calc — UCLA / West LA area
const DISPATCH_CENTER = { lat: 34.0689, lng: -118.4452 };
const MAX_DISTANCE_MILES = 5;

const cardRadius = "rounded-[14px]";

/** Haversine formula — returns distance in miles between two lat/lng points */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearestPolice() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const fetchNearby = useCallback(async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("officers")
        .select("*")
        .eq("status", "available");

      if (error) {
        console.error("[NearestPolice] Fetch error:", error.message);
        setOfficers([]);
      } else if (data) {
        const nearby = (data as Officer[])
          .map((o) => ({
            ...o,
            distance: haversineDistance(
              DISPATCH_CENTER.lat,
              DISPATCH_CENTER.lng,
              o.lat,
              o.lng
            ),
          }))
          .filter((o) => o.distance <= MAX_DISTANCE_MILES)
          .sort((a, b) => a.distance! - b.distance!);

        setOfficers(nearby);
      }
    } catch (err) {
      console.error("[NearestPolice] Supabase not configured:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  const handleDispatch = async (officer: Officer) => {
    if (dispatchingId || dispatchedIds.has(officer.id)) return;
    setDispatchingId(officer.id);
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("officers")
        .update({ status: "busy" })
        .eq("id", officer.id);

      if (error) {
        console.error("[NearestPolice] Dispatch error:", error.message);
      } else {
        setDispatchedIds((prev) => new Set(prev).add(officer.id));
      }
    } catch (err) {
      console.error("[NearestPolice] Supabase error:", err);
    }
    setDispatchingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-bold text-[17px] text-black mb-5 tracking-tight">
        Nearest Police
      </h3>

      {loading ? (
        <p className="text-neutral-400 text-sm">Loading...</p>
      ) : officers.length === 0 ? (
        <p className="text-neutral-400 text-sm">No officers nearby</p>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
          {officers.map((officer) => {
            const isDispatched = dispatchedIds.has(officer.id);
            const isDispatching = dispatchingId === officer.id;

            return (
              <div key={officer.id} className="flex flex-col gap-2">
                <div
                  className={`${cardRadius} border-2 px-4 py-3.5`}
                  style={{
                    borderColor: isDispatched ? "#6b8f3c" : "#c8c87a",
                    backgroundColor: isDispatched
                      ? "rgba(107, 143, 60, 0.06)"
                      : "rgba(200, 200, 122, 0.08)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-[15px] text-black tracking-tight">
                        {officer.name}
                      </p>
                      <p className="text-[12px] text-neutral-500 mt-0.5">
                        {officer.code} · #{officer.officer_id}
                      </p>
                    </div>
                    <span className="text-[12px] text-neutral-400 font-medium whitespace-nowrap ml-2">
                      {officer.distance! < 0.1
                        ? "< 0.1 mi"
                        : `${officer.distance!.toFixed(1)} mi`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isDispatching || isDispatched}
                  onClick={() => handleDispatch(officer)}
                  className={`w-full ${cardRadius} py-2.5 px-4 font-bold text-[14px] text-white flex flex-row items-center justify-between transition-opacity ${
                    isDispatched
                      ? "opacity-60 cursor-default"
                      : "hover:opacity-95 active:opacity-90"
                  }`}
                  style={{ backgroundColor: isDispatched ? "#555" : "#6b8f3c" }}
                >
                  <span>{isDispatched ? "Dispatched" : "Dispatch"}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
