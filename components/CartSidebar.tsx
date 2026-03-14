"use client";

import React from "react";
import { CartItem } from "./PosTypes";

interface CartSidebarProps {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (sku: string) => void;
  clearCart: () => void;
  totalPrice: number;
  openCheckout: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  addToCart,
  removeFromCart,
  clearCart,
  totalPrice,
  openCheckout,
}) => {
  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] overflow-hidden bg-[#0b0f19]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo_quickpos.png"
            alt="QuickPOS Logo"
            className="h-11 w-11 object-contain"
          />
          <div>
            <h2 className="text-2xl font-black text-white">ตะกร้าสินค้า</h2>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
              {cart.length} รายการ
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 transition hover:text-rose-300"
        >
          ล้างตะกร้า
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        {cart.length === 0 ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 text-center text-slate-600">
            <span className="text-6xl opacity-40">🛒</span>
            <p className="text-xl font-black uppercase tracking-[0.18em] opacity-50">
              ยังไม่มีสินค้าในตะกร้า
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.sku_code}
                className="flex items-center gap-4 rounded-[28px] border border-white/[0.05] bg-white/[0.02] p-4"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#101623] p-2">
                  <img
                    src={item.image || "/image/empty.jpg"}
                    alt={item.name}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/image/empty.jpg";
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-slate-100">{item.name}</p>
                  <p className="mt-1 text-base text-slate-400">{item.price.toLocaleString()} ฿</p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.sku_code)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-xl font-black text-slate-400 transition hover:text-white"
                    >
                      -
                    </button>
                    <span className="text-lg font-black text-white tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] text-xl font-black text-slate-400 transition hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white tabular-nums">
                    {(item.price * item.qty).toLocaleString()}
                  </p>
                  <p className="text-sm text-cyan-400">฿</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.05] bg-[#0d1117] px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
            ยอดรวมทั้งหมด
          </span>
          <span className="text-2xl font-black text-white">
            {totalPrice.toLocaleString()}
            <span className="ml-1 text-base text-cyan-400">฿</span>
          </span>
        </div>
        <button
          type="button"
          onClick={openCheckout}
          disabled={cart.length === 0}
          className="mt-4 w-full rounded-[28px] bg-linear-to-r from-cyan-500 to-blue-500 px-5 py-4 text-base font-black text-white shadow-xl shadow-cyan-500/20 transition active:scale-[0.98] disabled:opacity-20"
        >
          สรุปยอดชำระเงิน
        </button>
      </div>
    </div>
  );
};
