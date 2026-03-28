import CallCard from "./CallCard";
import { useSignalOS } from "../lib/socket";

export default function Sidebar() {
  const { calls } = useSignalOS();

  // Convert map to array and sort: ALERTS first, then by start date
  const sortedCalls = Object.values(calls).sort((a, b) => {
    if (a.status === "ALERT" && b.status !== "ALERT") return -1;
    if (b.status === "ALERT" && a.status !== "ALERT") return 1;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });

  return (
    <div className="absolute left-6 top-6 bottom-32 w-80 z-40 flex flex-col pointer-events-none">
      <div className="flex-1 bg-[#151517]/80 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl p-5 overflow-y-auto overflow-hidden pointer-events-auto custom-scrollbar">
        {/* Toggle Tabs */}
        <div className="flex bg-black/40 rounded-lg p-1 mb-6 border border-white/5">
          <button className="flex-1 py-1.5 bg-[#2c2c2e] text-white text-sm font-medium rounded-md shadow-sm">
            Current
          </button>
          <button className="flex-1 py-1.5 text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors">
            Archive
          </button>
        </div>

        {/* Call List */}
        <div className="flex flex-col gap-3">
          {sortedCalls.length === 0 ? (
            <div className="text-gray-500 text-center text-sm py-10 font-mono">
              WAITING FOR CONNECTIONS...
            </div>
          ) : (
            sortedCalls.map((call) => (
              <CallCard key={call.callId} call={call} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
