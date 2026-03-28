"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import BottomNav, { type BottomTab } from "../components/BottomNav";
import AnalyticsPanel from "../components/AnalyticsPanel";
import DispatchList from "../components/DispatchList";
import Sidebar from "../components/Sidebar";

// Opt-out of SSR for the Google Map so we don't hit "window is not defined"
const MapBackground = dynamic(() => import("../components/GoogleMapBackground"), {
  ssr: false,
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<BottomTab>("calls");

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black font-sans antialiased text-white selection:bg-red-500/30">
      <MapBackground />

      {activeTab === "calls" && <Sidebar />}

      {activeTab === "dispatch" && <DispatchList />}

      {activeTab === "analytics" && <AnalyticsPanel />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </main>
  );
}
