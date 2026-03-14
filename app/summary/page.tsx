"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DailySummaryData } from "@/components/PosTypes";

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function SummaryPage() {
  const [summaryDate, setSummaryDate] = useState(getTodayDateStr());
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSummary = async (date: string) => {
    setLoading(true);
    try {
      const [summaryRes, datesRes] = await Promise.all([
        fetch(`/api/daily-summary?date=${date}`),
        fetch("/api/available-dates"),
      ]);
      if (summaryRes.ok) {
        setSummaryData(await summaryRes.json());
      }
      if (datesRes.ok) {
        const data = await datesRes.json();
        setDates(data.dates || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary(summaryDate);
  }, [summaryDate]);

  return (
    <AppShell title="สรุปยอด" subtitle={`รายวัน • ${summaryDate}`}>
      <div className="space-y-5">
        <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                Daily Summary
              </p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                ภาพรวมยอดขายประจำวัน
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                ดูยอดขาย เงินสด เงินโอน รายการบิล และรายการสินค้าสำหรับวันเดียวกันได้ในหน้าเดียว
              </p>
            </div>
            <select
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
              className="rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-white outline-none"
            >
              {[summaryDate, ...dates.filter((date) => date !== summaryDate)].map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-slate-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                ["ยอดขายรวม", summaryData?.totalRevenue || 0, "text-cyan-300", "฿"],
                ["เงินสด", summaryData?.totalCash || 0, "text-emerald-300", "฿"],
                ["เงินโอน", summaryData?.totalTransfer || 0, "text-violet-300", "฿"],
                ["จำนวนบิล", summaryData?.totalBills || 0, "text-amber-300", "ใบ"],
              ].map(([label, value, accent, unit]) => (
                <div
                  key={String(label)}
                  className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4"
                >
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {label}
                  </p>
                  <p className={`mt-3 text-3xl sm:text-4xl font-black ${accent}`}>
                    {Number(value).toLocaleString()}
                    <span className="ml-2 text-base text-slate-400">{unit}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">สินค้าที่ขายในวันนั้น</h3>
                  <span className="text-sm uppercase tracking-[0.18em] text-slate-400">
                    {summaryData?.items.length || 0} sku
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {summaryData?.items.length ? (
                    summaryData.items.map((item) => (
                      <div
                        key={item.sku_code || item.name}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black text-white">{item.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {item.qty.toLocaleString()} ชิ้น • {item.price.toLocaleString()} ฿/ชิ้น
                          </p>
                        </div>
                        <span className="font-black text-cyan-300">
                          {item.revenue.toLocaleString()} ฿
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-base text-slate-400">ยังไม่มีรายการขายในวันดังกล่าว</p>
                  )}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white">รายการบิล</h3>
                  <span className="text-sm uppercase tracking-[0.18em] text-slate-400">
                    {summaryData?.bills.length || 0} bills
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {summaryData?.bills.length ? (
                    summaryData.bills.map((bill) => (
                      <div
                        key={bill.billId}
                        className="rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-black text-white">{bill.time}</p>
                          <span className="font-black text-white">
                            {bill.total.toLocaleString()} ฿
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-400">
                          {bill.paymentMethod} • {bill.itemCount.toLocaleString()} ชิ้น • ID:{bill.billId}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-base text-slate-400">ยังไม่มีบิลในวันดังกล่าว</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
