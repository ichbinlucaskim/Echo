"use client";

export type BottomTab = "calls" | "dispatch" | "analytics";

interface BottomNavProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
}

const TABS: { key: BottomTab; label: string }[] = [
  { key: "calls", label: "Calls" },
  { key: "dispatch", label: "Dispatch" },
  { key: "analytics", label: "Analytics" },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-[#1c1c1e]/90 backdrop-blur-md border border-white/5 p-1.5 rounded-full shadow-2xl">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-8 py-2.5 text-sm font-medium rounded-full transition-all ${
              activeTab === tab.key
                ? "bg-[#2c2c2e] text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
