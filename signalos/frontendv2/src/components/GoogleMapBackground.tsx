"use client";

import { useJsApiLoader, GoogleMap, Marker } from "@react-google-maps/api";
import { useMemo } from "react";
import { useSignalOS } from "../lib/socket";

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
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
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
  const { calls } = useSignalOS();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const center = useMemo(() => ({ lat: 34.0689, lng: -118.4452 }), []);

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
        {Object.values(calls).map((call, idx) => {
          // Quick deterministic location assignment for simulator IDs
          const loc =
            MOCK_CALL_LOCATIONS[call.callId] ||
            MOCK_CALL_LOCATIONS[`sim_call_${(idx % 5) + 1}`];

          if (!loc) return null;

          // Highlight critical markers
          const iconUrl =
            call.status === "ALERT"
              ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
              : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";

          return (
            <Marker
              key={call.callId}
              position={loc}
              icon={{
                url: iconUrl,
                scaledSize: new window.google.maps.Size(32, 32),
              }}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}
