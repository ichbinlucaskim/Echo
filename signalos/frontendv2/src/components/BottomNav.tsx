export default function BottomNav() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-[#1c1c1e]/90 backdrop-blur-md border border-white/5 p-1.5 rounded-full shadow-2xl">
        <button className="px-8 py-2.5 bg-[#2c2c2e] text-white text-sm font-medium rounded-full shadow-sm transition-all">
          Calls
        </button>
        <button className="px-8 py-2.5 text-gray-400 hover:text-gray-200 text-sm font-medium rounded-full transition-all">
          Dispatch
        </button>
        <button className="px-8 py-2.5 text-gray-400 hover:text-gray-200 text-sm font-medium rounded-full transition-all">
          Analytics
        </button>
      </div>
    </div>
  );
}
