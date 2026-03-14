import Link from "next/link";

interface PosHeaderProps {
  onSummary: () => void;
  onStockSummary: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  onSummary,
  onStockSummary,
}) => {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0b0f19]/90 border-b-2 border-white/[0.04] px-2.5 sm:px-6 lg:px-10 py-2 sm:py-4 lg:py-6 flex items-center justify-between shadow-2xl safe-area-bottom">
      <Link href="/" className="flex items-center gap-2 sm:gap-4 group shrink-0">
        <div className="w-8 h-8 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-[20px] bg-linear-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 group-hover:scale-110 active:scale-95 transition-all">
          <span className="text-white text-lg sm:text-2xl lg:text-3xl">🛒</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black italic tracking-tighter uppercase hidden sm:block">
          <span className="bg-linear-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
            Quick
          </span>
          <span className="text-white">POS</span>
        </h1>
      </Link>

      <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 overflow-x-auto no-scrollbar">
        <Link
          href="/withdraw"
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-black italic bg-cyan-500/10 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-full border border-cyan-500/20 sm:border-2 hover:bg-cyan-500/20 active:scale-90 transition-all text-cyan-400 uppercase tracking-wider sm:tracking-widest flex-shrink-0"
        >
          📦 <span className="hidden sm:inline">เบิกสินค้า</span>
        </Link>
        <Link
          href="/stock"
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-black italic bg-emerald-500/10 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-full border border-emerald-500/20 sm:border-2 hover:bg-emerald-500/20 active:scale-90 transition-all text-emerald-400 uppercase tracking-wider sm:tracking-widest flex-shrink-0"
        >
          📈 <span className="hidden sm:inline">นับสต๊อก</span>
        </Link>
        <Link
          href="/cash-count"
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-black italic bg-violet-500/10 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-full border border-violet-500/20 sm:border-2 hover:bg-violet-500/20 active:scale-90 transition-all text-violet-400 uppercase tracking-wider sm:tracking-widest flex-shrink-0"
        >
          💰 <span className="hidden sm:inline">นับเงิน</span>
        </Link>
        <button
          onClick={onStockSummary}
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-black italic bg-rose-500/10 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-full border border-rose-500/20 sm:border-2 hover:bg-rose-500/20 active:scale-90 transition-all text-rose-300 uppercase tracking-wider sm:tracking-widest flex-shrink-0"
        >
          📦 <span className="hidden sm:inline">สรุปสต๊อก</span>
        </button>
        <button
          onClick={onSummary}
          className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs lg:text-sm font-black italic bg-amber-500/10 px-2.5 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-3.5 rounded-lg sm:rounded-full border border-amber-500/20 sm:border-2 hover:bg-amber-500/20 active:scale-90 transition-all text-amber-400 uppercase tracking-wider sm:tracking-widest flex-shrink-0"
        >
          📊 <span className="hidden sm:inline">สรุปยอด</span>
        </button>
      </div>
    </header>
  );
};
