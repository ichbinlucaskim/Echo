"use client";

import CallGrid from "../components/CallGrid";
import AlertBanner from "../components/AlertBanner";
import IncidentReport from "../components/IncidentReport";

export default function Home(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 px-6 py-4">
        <h1 className="text-lg font-bold font-mono tracking-wide">
          SignalOS — Dispatch Monitor
        </h1>
        <p className="text-gray-500 text-xs font-mono mt-1">
          6 lines monitored | 0 alerts
        </p>
      </div>

      {/* Alert banner — hidden when alert is null */}
      <AlertBanner alert={null} />

      {/* Main grid + incident panel */}
      <div className="flex gap-6 p-6">
        <div className="flex-1">
          <CallGrid />
        </div>
        <div className="w-72">
          <IncidentReport />
        </div>
      </div>
    </main>
  );
}
