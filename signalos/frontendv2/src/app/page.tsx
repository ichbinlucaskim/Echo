"use client";

import dynamic from "next/dynamic";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";

// Opt-out of SSR for the Google Map so we don't hit "window is not defined"
const MapBackground = dynamic(() => import("../components/GoogleMapBackground"), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans antialiased text-white selection:bg-red-500/30">
      {/* Background Layer */}
      <MapBackground />

      {/* Floating UI Layer */}
      <Sidebar />
      <BottomNav />
      {/* 
        Note: The alert modal/incident report is now handled naturally 
        inside the Sidebar CallCards via the Accordion UI when their 
        call status turns red (ALERT)! 
      */}
    </main>
  );
}
