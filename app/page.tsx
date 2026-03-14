"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CartSidebar } from "@/components/CartSidebar";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ProductCard } from "@/components/ProductCard";
import { SummaryModal } from "@/components/SummaryModal";
import { CartItem, DailySummaryData, Product } from "@/components/PosTypes";

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState<number | null>(null);
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer">("cash");
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryTab, setSummaryTab] = useState<"items" | "bills" | "stock">("items");
  const [summaryDate, setSummaryDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (error) {
        console.error("Failed to load products:", error);
      } finally {
        setProductsLoading(false);
      }
    };

    loadProducts();
  }, []);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.sku_code === product.sku_code);
      if (existing) {
        return prev.map((item) =>
          item.sku_code === product.sku_code
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (skuCode: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.sku_code === skuCode ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const openCheckout = () => {
    setReceivedAmount("");
    setChangeAmount(null);
    setCheckoutDone(false);
    setPaymentMethod("cash");
    setShowCheckout(true);
    setShowMobileCart(false);
  };

  const handleReceivedChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    setReceivedAmount(cleaned);
    const numeric = Number(cleaned);
    setChangeAmount(cleaned && numeric >= totalPrice ? numeric - totalPrice : null);
  };

  const handleConfirmCheckout = async () => {
    const received = Number(receivedAmount);
    if (paymentMethod === "cash" && (!receivedAmount || received < totalPrice)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          total: totalPrice,
          received: paymentMethod === "transfer" ? totalPrice : received,
          change: paymentMethod === "transfer" ? 0 : received - totalPrice,
          staff: "Admin",
          paymentMethod: paymentMethod === "cash" ? "เงินสด" : "โอน",
        }),
      });

      if (res.ok) setCheckoutDone(true);
      else alert("เกิดข้อผิดพลาดในการบันทึกการขาย");
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaryForDate = async (dateStr: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/daily-summary?date=${dateStr}`);
      if (res.ok) {
        setSummaryData(await res.json());
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const openSummary = async (tab: "items" | "bills" | "stock") => {
    const today = getTodayDateStr();
    setSummaryDate(today);
    setSummaryTab(tab);
    setShowSummary(true);
    fetchSummaryForDate(today);
    fetch("/api/available-dates")
      .then((res) => res.json())
      .then((data) => setAvailableDates(data.dates || []));
  };

  const navigateSummaryDate = (offset: number) => {
    if (availableDates.length === 0) return;
    const currentIdx = availableDates.indexOf(summaryDate);
    const newIdx = offset < 0 ? currentIdx + 1 : currentIdx - 1;
    if (newIdx >= 0 && newIdx < availableDates.length) {
      const newDate = availableDates[newIdx];
      setSummaryDate(newDate);
      fetchSummaryForDate(newDate);
    }
  };

  const selectSummaryDate = (date: string) => {
    setSummaryDate(date);
    setShowDatePicker(false);
    fetchSummaryForDate(date);
  };

  return (
    <AppShell
      title="ขายสินค้า"
      subtitle="เลือกสินค้า ชำระเงิน และตรวจสรุปรายวันได้จากหน้าเดียว"
      actions={
        <div className="hidden items-center gap-3 xl:flex">
          <button
            type="button"
            onClick={() => openSummary("items")}
            className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-base font-black text-cyan-300 transition hover:bg-cyan-500/15"
          >
            สรุปยอดวันนี้
          </button>
          <button
            type="button"
            onClick={() => openSummary("stock")}
            className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-base font-black text-rose-200 transition hover:bg-rose-500/15"
          >
            สรุปสต๊อกวันนี้
          </button>
        </div>
      }
    >
      <div className="flex min-h-[calc(100dvh-11rem)] flex-col gap-4 xl:flex-row">
        <section className="min-h-0 flex-1 rounded-[32px] border border-white/[0.06] bg-[#0c1220] shadow-2xl shadow-black/30">
          <div className="border-b border-white/[0.05] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                  POS Workspace
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">เลือกสินค้า</h2>
              </div>
              <div className="flex items-center gap-2 xl:hidden">
                <button
                  type="button"
                  onClick={() => openSummary("items")}
                  className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2.5 text-sm font-black text-cyan-300"
                >
                  สรุปยอด
                </button>
                <button
                  type="button"
                  onClick={() => openSummary("stock")}
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-black text-rose-200"
                >
                  สรุปสต๊อก
                </button>
              </div>
            </div>
          </div>
          <div className="h-full overflow-y-auto p-4 sm:p-5 lg:p-6" style={{ scrollbarWidth: "none" }}>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {[...Array(12)].map((_, index) => (
                  <div
                    key={index}
                    className="aspect-[3/4] rounded-[28px] bg-white/[0.03] animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
                {products
                  .filter((product) => product.price > 0 && product.is_active !== false)
                  .map((product) => (
                    <ProductCard
                      key={product.sku_code}
                      product={product}
                      onClick={addToCart}
                    />
                  ))}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden w-[360px] shrink-0 xl:block 2xl:w-[400px]">
          <div className="h-full min-h-[calc(100dvh-11rem)] overflow-hidden rounded-[32px] border border-white/[0.06] bg-[#0d1117] shadow-2xl shadow-black/30">
            <CartSidebar
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              clearCart={() => setCart([])}
              totalPrice={totalPrice}
              openCheckout={openCheckout}
            />
          </div>
        </aside>
      </div>

      {cart.length > 0 && (
        <div className="fixed inset-x-3 bottom-4 z-40 xl:hidden">
          <button
            type="button"
            onClick={() => setShowMobileCart(true)}
            className="flex w-full items-center justify-between rounded-[28px] bg-linear-to-r from-cyan-400 to-blue-600 px-4 py-4 font-black text-white shadow-[0_20px_60px_-15px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-base tabular-nums">
                {cart.length}
              </span>
              <span className="text-base uppercase tracking-wide">ตะกร้าสินค้า</span>
            </div>
            <div className="text-right">
              <p className="text-lg font-black">{totalPrice.toLocaleString()}</p>
              <p className="text-sm text-white/80">กดเพื่อดูรายการ</p>
            </div>
          </button>
        </div>
      )}

      {showMobileCart && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowMobileCart(false)}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-hidden rounded-t-[36px] border-t border-white/10 bg-[#0b0f19] shadow-2xl"
            style={{ animation: "slide-up .35s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/10" />
            <div className="h-[82dvh] min-h-0">
              <CartSidebar
                cart={cart}
                addToCart={addToCart}
                removeFromCart={removeFromCart}
                clearCart={() => setCart([])}
                totalPrice={totalPrice}
                openCheckout={openCheckout}
              />
            </div>
          </div>
        </div>
      )}

      <CheckoutModal
        showCheckout={showCheckout}
        setShowCheckout={setShowCheckout}
        cart={cart}
        totalPrice={totalPrice}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        receivedAmount={receivedAmount}
        setReceivedAmount={handleReceivedChange}
        changeAmount={changeAmount}
        checkoutDone={checkoutDone}
        handleConfirmCheckout={handleConfirmCheckout}
        handleCloseCheckout={() => {
          setShowCheckout(false);
          if (checkoutDone) setCart([]);
        }}
        loading={loading}
      />

      <SummaryModal
        showSummary={showSummary}
        setShowSummary={setShowSummary}
        summaryData={summaryData}
        summaryLoading={summaryLoading}
        summaryTab={summaryTab}
        setSummaryTab={setSummaryTab}
        summaryDate={summaryDate}
        availableDates={availableDates}
        navigateSummaryDate={navigateSummaryDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        selectSummaryDate={selectSummaryDate}
        getTodayDateStr={getTodayDateStr}
        products={products}
      />
    </AppShell>
  );
}
