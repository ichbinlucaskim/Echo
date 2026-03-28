"use client";

import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { useEffect, useMemo, useState } from "react";
import { useSignalOSContext } from "../context/SignalOSContext";
import { getSupabase } from "../lib/supabase";
import {
  officerMarkerIconDataUrl,
  OFFICER_MARKER_LAYOUT,
} from "../lib/officerStatus";

interface Officer {
  id: string;
  name: string;
  code: string;
  status: string;
  lat: number;
  lng: number;
}

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.business",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi.attraction",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi.place_of_worship",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ],
};

const LIBRARIES: "places"[] = ["places"];

// Mock coordinates for active calls so they show up on the map
// In reality, this would come from the backend or the phone number's registered address
const MOCK_CALL_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // UCLA roughly
  sim_call_1: { lat: 34.0722, lng: -118.4441 },
  sim_call_2: { lat: 34.0701, lng: -118.4411 },
  sim_call_3: { lat: 34.0689, lng: -118.4452 },
  sim_call_4: { lat: 34.0745, lng: -118.4429 },
  sim_call_5: { lat: 34.0673, lng: -118.4385 },
};

export default function GoogleMapBackground() {
  const { calls } = useSignalOSContext();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const center = useMemo(() => ({ lat: 34.0689, lng: -118.4452 }), []);

  // Fetch officers from Supabase for red pins
  useEffect(() => {
    async function fetchOfficers() {
      try {
        const supabase = getSupabase();
        const { data } = await supabase
          .from("officers")
          .select("id, name, code, status, lat, lng");
        if (data) setOfficers(data as Officer[]);
      } catch {
        // Supabase not configured yet
      }
    }
    fetchOfficers();

    // Real-time updates
    let channel: ReturnType<ReturnType<typeof getSupabase>["channel"]> | null = null;
    try {
      const supabase = getSupabase();
      channel = supabase
        .channel("officers-map")
        .on("postgres_changes", { event: "*", schema: "public", table: "officers" }, () => {
          fetchOfficers();
        })
        .subscribe();
    } catch {
      // skip
    }

    return () => {
      if (channel) {
        try { getSupabase().removeChannel(channel); } catch { /* ignore */ }
      }
    };
  }, []);

  if (loadError) {
    return (
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-white font-mono z-0">
        Google Maps failed to load. Please check API Key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-gray-500 font-mono z-0">
        INITIALIZING SATELLITE LINK...
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={15}
        options={MAP_OPTIONS}
      >
        {/* Blue pins — active calls */}
        {Object.values(calls).map((call, idx) => {
          const loc =
            MOCK_CALL_LOCATIONS[call.callId] ||
            MOCK_CALL_LOCATIONS[`sim_call_${(idx % 5) + 1}`];
          if (!loc) return null;

          return (
            <Marker
              key={`call-${call.callId}`}
              position={loc}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new window.google.maps.Size(32, 32),
              }}
            />
          );
        })}

        {/* Officer pins — color by status (see officerStatus.ts) */}
        {officers
          .filter((o) => o.lat !== 0 && o.lng !== 0)
          .map((officer) => (
            <Marker
              key={`officer-${officer.id}`}
              position={{ lat: officer.lat, lng: officer.lng }}
              icon={{
                url: officerMarkerIconDataUrl(officer.status),
                scaledSize: new window.google.maps.Size(
                  OFFICER_MARKER_LAYOUT.width,
                  OFFICER_MARKER_LAYOUT.height
                ),
                anchor: new window.google.maps.Point(
                  OFFICER_MARKER_LAYOUT.anchorX,
                  OFFICER_MARKER_LAYOUT.anchorY
                ),
              }}
              title={`${officer.code} — ${officer.name} (${officer.status})`}
            />
          ))}
      </GoogleMap>
    </div>
  );
}
