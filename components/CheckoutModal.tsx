"use client";

import React from "react";
import { CartItem } from "./PosTypes";

interface CheckoutModalProps {
  showCheckout: boolean;
  setShowCheckout: (show: boolean) => void;
  cart: CartItem[];
  totalPrice: number;
  paymentMethod: "cash" | "transfer";
  setPaymentMethod: (method: "cash" | "transfer") => void;
  receivedAmount: string;
  setReceivedAmount: (val: string) => void;
  changeAmount: number | null;
  checkoutDone: boolean;
  handleConfirmCheckout: () => void;
  handleCloseCheckout: () => void;
  loading: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  showCheckout,
  setShowCheckout,
  cart,
  totalPrice,
  paymentMethod,
  setPaymentMethod,
  receivedAmount,
  setReceivedAmount,
  changeAmount,
  checkoutDone,
  handleConfirmCheckout,
  handleCloseCheckout,
  loading,
}) => {
  if (!showCheckout) return null;

  const canConfirm =
    paymentMethod === "transfer" ||
    (receivedAmount && Number(receivedAmount) >= totalPrice);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 lg:p-8">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={handleCloseCheckout}
      />
      {/* 
        Mobile: full-screen bottom sheet layout using grid rows
        - header (auto)
        - scrollable content (1fr)
        - sticky confirm button (auto) — always visible!
      */}
      <div
        className="relative w-full sm:max-w-lg lg:max-w-2xl bg-[#0b0f19] border-t-2 sm:border-2 border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden rounded-t-3xl sm:rounded-[40px] lg:rounded-[50px]"
        style={{
          animation: "slide-up .4s cubic-bezier(0.16, 1, 0.3, 1) both",
          maxHeight: "100dvh",
          display: "grid",
          gridTemplateRows: checkoutDone ? "1fr" : "auto 1fr auto",
        }}
      >
        {!checkoutDone ? (
          <>
            {/* ───── HEADER ───── */}
            <div className="px-4 sm:px-8 lg:px-10 py-2.5 sm:py-6 lg:py-8 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <h3 className="text-base sm:text-2xl lg:text-3xl font-black text-white italic tracking-tighter uppercase">
                ชำระเงิน
              </h3>
              <button
                onClick={handleCloseCheckout}
                className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-white/[0.04] text-slate-400 hover:text-white transition-all text-base sm:text-xl font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* ───── SCROLLABLE CONTENT ───── */}
            <div
              className="overflow-y-auto px-3 sm:px-8 lg:px-12 py-2.5 sm:py-8 lg:py-10 space-y-2.5 sm:space-y-8 lg:space-y-10"
              style={{ scrollbarWidth: "none", minHeight: 0 }}
            >
              {/* Total + Payment Method */}
              <div className="flex items-center justify-between gap-3 sm:block">
                <div className="sm:rounded-[40px] sm:bg-linear-to-br sm:from-white/[0.04] sm:to-transparent sm:border-2 sm:border-white/[0.1] sm:p-8 lg:p-10 sm:text-center sm:shadow-2xl sm:mb-8">
                  <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-[0.22em] sm:tracking-[0.3em] sm:mb-3">
                    ยอดรวม
                  </p>
                  <p className="text-2xl sm:text-5xl lg:text-7xl font-black text-white tabular-nums tracking-tighter">
                    {totalPrice.toLocaleString()}
                    <span className="text-sm sm:text-xl lg:text-2xl ml-1 sm:ml-3 text-cyan-400">
                      ฿
                    </span>
                  </p>
                </div>
                {/* Payment toggle */}
                <div className="flex gap-1 sm:gap-4 p-1 sm:p-2 bg-white/[0.03] rounded-xl sm:rounded-[32px] border sm:border-2 border-white/[0.06]">
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={`py-2.5 px-3.5 sm:py-5 sm:px-6 sm:flex-1 rounded-lg sm:rounded-[24px] text-sm sm:text-lg lg:text-xl font-black transition-all flex items-center justify-center gap-1 sm:gap-3 ${
                      paymentMethod === "cash"
                        ? "bg-white text-black shadow-xl"
                        : "text-slate-500"
                    }`}
                  >
                    💵 <span className="hidden sm:inline">เงินสด</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("transfer")}
                    className={`py-2.5 px-3.5 sm:py-5 sm:px-6 sm:flex-1 rounded-lg sm:rounded-[24px] text-sm sm:text-lg lg:text-xl font-black transition-all flex items-center justify-center gap-1 sm:gap-3 ${
                      paymentMethod === "transfer"
                        ? "bg-white text-black shadow-xl"
                        : "text-slate-500"
                    }`}
                  >
                    💳 <span className="hidden sm:inline">เงินโอน</span>
                  </button>
                </div>
              </div>

              {paymentMethod === "cash" ? (
                <div className="space-y-2.5 sm:space-y-8">
                  {/* Amount display - compact 2-col */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-6">
                    <div className="space-y-0.5 sm:space-y-4">
                      <label className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-[0.22em] text-center block">
                        รับเงินมา
                      </label>
                      <div className="text-xl sm:text-4xl lg:text-5xl font-black text-emerald-400 tabular-nums bg-[#0d1117] border-2 border-emerald-500/20 rounded-xl sm:rounded-[32px] py-2 sm:py-6 lg:py-8 px-2 sm:px-4 min-h-[44px] sm:min-h-[100px] flex items-center justify-center shadow-inner break-all">
                        {receivedAmount || "0"}
                      </div>
                    </div>
                    <div className="space-y-0.5 sm:space-y-4">
                      <label className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-[0.22em] text-center block">
                        เงินทอน
                      </label>
                      <div
                        className={`text-xl sm:text-4xl lg:text-5xl font-black tabular-nums border-2 rounded-xl sm:rounded-[32px] py-2 sm:py-6 lg:py-8 px-2 sm:px-4 min-h-[44px] sm:min-h-[100px] flex items-center justify-center shadow-inner transition-all ${changeAmount !== null ? "bg-white/[0.04] border-white/20 text-white" : "bg-[#0d1117] border-white/5 text-slate-900"}`}
                      >
                        {changeAmount !== null
                          ? `${changeAmount.toLocaleString()}`
                          : "0"}
                      </div>
                    </div>
                  </div>

                  {/* Quick buttons: Exact + Banknotes */}
                  <div className="space-y-1.5 sm:space-y-3">
                    <button
                      onClick={() => setReceivedAmount(totalPrice.toString())}
                      className="w-full py-2 sm:py-5 rounded-xl sm:rounded-[32px] bg-cyan-500 text-black font-black text-sm sm:text-xl lg:text-2xl shadow-xl shadow-cyan-500/40 active:scale-[0.98] transition-all"
                    >
                      💵 จ่ายพอดี ({totalPrice.toLocaleString()} ฿)
                    </button>
                    <div className="grid grid-cols-5 gap-1 sm:gap-2">
                      {[1000, 500, 100, 50, 20].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setReceivedAmount(String(amt))}
                          className="py-1.5 sm:py-4 rounded-lg sm:rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-sm sm:text-base hover:bg-emerald-500/20 active:scale-90 transition-all"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numpad - compact on mobile */}
                  <div className="grid grid-cols-3 gap-1 sm:gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, "0", "00", "C"].map(
                      (btn) => (
                        <button
                          key={btn}
                          onClick={() => {
                            if (btn === "C") setReceivedAmount("");
                            else setReceivedAmount(receivedAmount + btn);
                          }}
                          className={`h-10 sm:h-20 lg:h-24 rounded-xl sm:rounded-[28px] ${
                            btn === "C"
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : "bg-white/[0.04] text-white border-white/[0.06]"
                          } border-2 font-black text-lg sm:text-3xl lg:text-4xl hover:bg-white/[0.08] active:scale-90 transition-all shadow-lg shadow-black/20`}
                        >
                          {btn}
                        </button>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 sm:py-12 text-center space-y-4 sm:space-y-8">
                  <div className="w-36 h-36 sm:w-56 sm:h-56 lg:w-64 lg:h-64 mx-auto bg-white rounded-2xl sm:rounded-[40px] flex items-center justify-center p-5 sm:p-8 shadow-2xl">
                    <div className="text-black text-center space-y-2">
                      <div className="text-2xl sm:text-4xl">📱</div>
                      <p className="font-black text-base sm:text-lg lg:text-xl italic leading-tight uppercase">
                        โอนเงินเข้าเครื่อง
                        <br />
                        SCAN QR
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-bold leading-relaxed">
                    กรุณาตรวจสอบยอดโอนให้เรียบร้อย
                    <br />
                    ก่อนกดปุ่มยืนยันด้านล่าง
                  </p>
                </div>
              )}
            </div>

            {/* ───── STICKY CONFIRM BUTTON — always visible ───── */}
            <div className="p-3 sm:p-6 lg:p-10 border-t-2 border-white/[0.04] bg-[#0d1117] shrink-0 safe-area-bottom">
              <button
                onClick={handleConfirmCheckout}
                disabled={loading || !canConfirm}
                className={`w-full py-3.5 sm:py-6 lg:py-8 rounded-2xl sm:rounded-[40px] font-black text-white text-lg sm:text-2xl lg:text-3xl shadow-2xl active:scale-[0.98] transition-all uppercase italic tracking-tighter ${
                  canConfirm
                    ? "bg-linear-to-r from-emerald-400 to-blue-600 shadow-blue-500/40"
                    : "bg-slate-800 opacity-30 shadow-none"
                }`}
              >
                {loading ? "กำลังบันทึก..." : "🎉 ยืนยันชำระเงิน"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 sm:p-14 lg:p-20 text-center space-y-5 sm:space-y-8 lg:space-y-10">
            <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-emerald-500/10 border-4 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
              <span className="text-4xl sm:text-6xl lg:text-7xl text-emerald-400 scale-150">
                ✓
              </span>
            </div>
            <div className="space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white italic">
                ชำระเงินสำเร็จ!
              </h2>
              <p className="text-slate-400 font-bold text-base sm:text-lg lg:text-xl uppercase tracking-[0.22em]">
                ยินดีด้วย! บันทึกยอดขายเรียบร้อย
              </p>
            </div>
            <button
              onClick={handleCloseCheckout}
              className="w-full py-4 sm:py-6 lg:py-8 rounded-2xl sm:rounded-[40px] bg-white text-black font-black text-lg sm:text-2xl lg:text-3xl hover:bg-slate-200 active:scale-[0.98] transition-all shadow-2xl"
            >
              กลับไปหน้าขาย
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
