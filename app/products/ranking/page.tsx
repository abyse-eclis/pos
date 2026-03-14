"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

interface RankingItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  bills: number;
  image: string;
  category: string;
  averagePrice: number;
}

const DAY_OPTIONS = [
  { value: 7, label: "7 วัน" },
  { value: 30, label: "30 วัน" },
  { value: 0, label: "ทั้งหมด" },
];

const SORT_OPTIONS = [
  { value: "qty", label: "เรียงตามจำนวนขาย" },
  { value: "revenue", label: "เรียงตามรายได้" },
] as const;

export default function ProductRankingPage() {
  const [items, setItems] = useState<RankingItem[]>([]);
  const [days, setDays] = useState(7);
  const [sortBy, setSortBy] = useState<"qty" | "revenue">("qty");
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRanking = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/product-ranking?days=${days}&sortBy=${sortBy}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "โหลดอันดับสินค้าไม่สำเร็จ");
        }
        setItems(data.items || []);
        setDates(data.dates || []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "โหลดอันดับสินค้าไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    loadRanking();
  }, [days, sortBy]);

  return (
    <AppShell title="จัดอันดับสินค้า" subtitle="ดูสินค้าขายดีจากยอดขายจริงใน Google Sheet">
      <div className="space-y-5">
        <section className="rounded-[32px] border border-white/[0.06] bg-linear-to-br from-white/[0.04] via-white/[0.03] to-white/[0.01] p-5 shadow-2xl shadow-black/30 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
                Product Ranking
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">จัดเรียงสินค้าขายดี</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                ใช้ดูว่าสินค้าตัวไหนขายดีในช่วงเวลาที่เลือก และเรียงได้ทั้งตามจำนวนขายและตามรายได้
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-base font-black text-slate-200 transition hover:border-white/[0.14] hover:text-white"
              >
                กลับไปจัดการรูปสินค้า
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {DAY_OPTIONS.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setDays(option.value)}
                  className={`rounded-2xl px-4 py-3 text-base font-black transition ${
                    days === option.value
                      ? "bg-cyan-500 text-black"
                      : "border border-white/[0.08] bg-black/20 text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value)}
                  className={`rounded-2xl px-4 py-3 text-base font-black transition ${
                    sortBy === option.value
                      ? "bg-violet-500 text-white"
                      : "border border-white/[0.08] bg-black/20 text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-base text-slate-400">
            ช่วงข้อมูลที่ใช้: {dates.length > 0 ? `${dates[dates.length - 1]} ถึง ${dates[0]}` : "-"}
          </p>
        </section>

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-base text-slate-400">
              กำลังโหลดอันดับสินค้า...
            </div>
          ) : error ? (
            <div className="rounded-[32px] border border-rose-500/20 bg-rose-500/10 p-6 text-base font-bold text-rose-100">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-base text-slate-400">
              ยังไม่มียอดขายในช่วงเวลาที่เลือก
            </div>
          ) : (
            items.map((item, index) => (
              <div
                key={item.sku_code || item.name}
                className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex items-start gap-3 sm:flex-1">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-blue-500 text-lg font-black text-black">
                      {index + 1}
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0d1117] p-2">
                      <img
                        src={item.image || "/image/empty.jpg"}
                        alt={item.name}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/image/empty.jpg";
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-lg font-black text-white">{item.name}</p>
                      <p className="mt-1 break-all text-sm text-slate-400">{item.sku_code || "-"}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.category || "ไม่ระบุหมวดหมู่"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:min-w-[360px] sm:grid-cols-4">
                    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">จำนวนขาย</p>
                      <p className="mt-2 text-2xl font-black text-cyan-300">{item.qty.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">รายได้</p>
                      <p className="mt-2 text-2xl font-black text-emerald-300">{item.revenue.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">จำนวนบิล</p>
                      <p className="mt-2 text-2xl font-black text-violet-300">{item.bills.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-3 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">ราคาเฉลี่ย</p>
                      <p className="mt-2 text-2xl font-black text-amber-300">{item.averagePrice.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
