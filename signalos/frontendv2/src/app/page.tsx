"use client";

import dynamic from "next/dynamic";
import ActiveCallSession from "../components/ActiveCallSession";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import { SelectedCallProvider } from "../context/SelectedCallContext";

// Opt-out of SSR for the Google Map so we don't hit "window is not defined"
const MapBackground = dynamic(() => import("../components/GoogleMapBackground"), {
  ssr: false,
});

export default function Home() {
  return (
    <SelectedCallProvider>
      <main className="relative w-screen h-screen overflow-hidden bg-black font-sans antialiased text-white selection:bg-red-500/30">
        <MapBackground />
        <Sidebar />
        <BottomNav />
        <ActiveCallSession />
      </main>
    </SelectedCallProvider>
  );
}
