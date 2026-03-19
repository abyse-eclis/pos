"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Product,
  StockMovement,
  StockOverviewData,
  StockOverviewItem,
  StockSessionSummaryItem,
  StockSession,
} from "../PosTypes";

type StockWorkspaceMode = "warehouse" | "storefront" | "comparison" | "closeout";

interface StockWorkspaceProps {
  mode: StockWorkspaceMode;
}

interface SessionResponse {
  current: StockSession | null;
  sessions: StockSession[];
}

const MODE_COPY: Record<
  StockWorkspaceMode,
  { title: string; description: string; accent: string }
> = {
  warehouse: {
    title: "คลังร้าน",
    description: "เปิดรอบขาย รับของเข้าคลังร้าน และติดตามยอดคงเหลือพร้อมใช้",
    accent: "from-sky-400 to-cyan-500",
  },
  storefront: {
    title: "หน้าร้าน",
    description: "เบิกจากคลังร้านไปหน้าร้านได้หลายรอบในวันเดียว และดูยอดคงเหลือปัจจุบัน",
    accent: "from-emerald-400 to-lime-500",
  },
  comparison: {
    title: "เปรียบเทียบ",
    description: "ดูภาพรวมคลังร้าน หน้าร้าน ยอดขาย และส่วนต่างล่าสุดต่อสินค้า",
    accent: "from-violet-400 to-fuchsia-500",
  },
  closeout: {
    title: "ปิดรอบ",
    description: "นับหน้าร้านจริง คืนของกลับคลังร้าน และสรุปก่อนปิดรอบขาย",
    accent: "from-rose-400 to-orange-500",
  },
};

function formatDate(date = new Date()) {
  const th = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function numericValue(value: string) {
  const cleaned = value.replace(/[^0-9]/g, "");
  return cleaned;
}

function formatMovementLabel(type: StockMovement["movement_type"]) {
  switch (type) {
    case "receive_to_warehouse":
      return "รับเข้าคลัง";
    case "move_to_storefront":
      return "เบิกไปหน้าร้าน";
    case "return_to_warehouse":
      return "คืนกลับคลัง";
    case "storefront_count":
      return "นับหน้าร้าน";
    default:
      return type;
  }
}

export function StockWorkspace({ mode }: StockWorkspaceProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sessionData, setSessionData] = useState<SessionResponse>({
    current: null,
    sessions: [],
  });
  const [selectedComparisonSessionId, setSelectedComparisonSessionId] = useState("");
  const [overview, setOverview] = useState<StockOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionLabel, setSessionLabel] = useState(
    `รอบขาย ${formatDate()}`,
  );
  const [qtyInputs, setQtyInputs] = useState<Record<string, string>>({});
  const [countInputs, setCountInputs] = useState<Record<string, string>>({});

  const copy = MODE_COPY[mode];

  const inventoryProducts = useMemo(
    () => products.filter((product) => product.is_inventory === true),
    [products],
  );

  const overviewMap = useMemo(() => {
    const map = new Map<string, StockOverviewItem>();
    overview?.items.forEach((item) => {
      map.set(item.sku_code || item.name, item);
    });
    return map;
  }, [overview]);

  const warehouseMovements = useMemo(
    () =>
      overview?.movements.filter(
        (movement) =>
          movement.movement_type === "receive_to_warehouse" ||
          movement.movement_type === "return_to_warehouse",
      ) || [],
    [overview],
  );

  const storefrontMovements = useMemo(
    () =>
      overview?.movements.filter(
        (movement) => movement.movement_type === "move_to_storefront",
      ) || [],
    [overview],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const overviewUrl =
        mode === "comparison" && selectedComparisonSessionId
          ? `/api/stock-overview?session_id=${encodeURIComponent(selectedComparisonSessionId)}`
          : "/api/stock-overview";
      const [productsRes, sessionsRes, overviewRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/stock-session"),
        fetch(overviewUrl),
      ]);

      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(data.products || []);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        const current = data.current || null;
        const sessions = data.sessions || [];
        setSessionData({
          current,
          sessions,
        });
        setSelectedComparisonSessionId((prev) => {
          if (prev && sessions.some((session: StockSession) => session.session_id === prev)) {
            return prev;
          }
          return current?.session_id || sessions[0]?.session_id || "";
        });
      }

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      } else {
        setOverview(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadDataPreserveScroll = async () => {
    const currentScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    await loadData();
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: currentScrollY });
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, selectedComparisonSessionId]);

  const updateQtyInput = (skuCode: string, value: string) => {
    setQtyInputs((prev) => ({ ...prev, [skuCode]: numericValue(value) }));
  };

  const updateCountInput = (skuCode: string, value: string) => {
    setCountInputs((prev) => ({ ...prev, [skuCode]: numericValue(value) }));
  };

  const saveBatchMovements = async (
    movements: Array<{
      sku_code: string;
      name: string;
      movement_type: StockMovement["movement_type"];
      qty_piece: number;
    }>,
    clearInputs: () => void,
  ) => {
    if (!sessionData.current) {
      alert("กรุณาเปิดรอบขายก่อน");
      return;
    }

    if (movements.length === 0) {
      alert("ยังไม่มีรายการให้บันทึก");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movements: movements.map((movement) => ({
            ...movement,
            session_id: sessionData.current?.session_id,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "บันทึกความเคลื่อนไหวไม่สำเร็จ");
        return;
      }

      clearInputs();
      await loadDataPreserveScroll();
    } finally {
      setSubmitting(false);
    }
  };

  const saveMovementDrafts = async (
    movementType: "receive_to_warehouse" | "move_to_storefront" | "return_to_warehouse",
  ) => {
    const drafts = inventoryProducts
      .map((product) => ({
        product,
        qty: Number(qtyInputs[product.sku_code] || 0),
      }))
      .filter((item) => item.qty > 0);

    if (drafts.length === 0) {
      alert("ยังไม่มีจำนวนที่กรอก");
      return;
    }

    for (const draft of drafts) {
      const overviewItem = overviewMap.get(draft.product.sku_code || draft.product.name);
      if (movementType === "move_to_storefront") {
        const available = overviewItem?.warehouseBalance || 0;
        if (draft.qty > available) {
          alert(`เบิกเกินคลังร้านไม่ได้ เหลือ ${available} ชิ้น: ${draft.product.name}`);
          return;
        }
      }

      if (movementType === "return_to_warehouse") {
        const available = overviewItem?.storefrontBalance || 0;
        if (draft.qty > available) {
          alert(`คืนเกินหน้าร้านไม่ได้ เหลือ ${available} ชิ้น: ${draft.product.name}`);
          return;
        }
      }
    }

    await saveBatchMovements(
      drafts.map(({ product, qty }) => ({
        sku_code: product.sku_code,
        name: product.name,
        movement_type: movementType,
        qty_piece: qty,
      })),
      () => setQtyInputs({}),
    );
  };

  const saveCloseoutDrafts = async () => {
    const countDrafts = inventoryProducts
      .map((product) => ({
        product,
        qty: Number(countInputs[product.sku_code] || 0),
      }))
      .filter((item) => item.qty > 0)
      .map(({ product, qty }) => ({
        sku_code: product.sku_code,
        name: product.name,
        movement_type: "storefront_count" as const,
        qty_piece: qty,
      }));

    const returnDrafts = inventoryProducts
      .map((product) => ({
        product,
        qty: Number(qtyInputs[product.sku_code] || 0),
      }))
      .filter((item) => item.qty > 0);

    for (const draft of returnDrafts) {
      const available = overviewMap.get(draft.product.sku_code || draft.product.name)?.storefrontBalance || 0;
      if (draft.qty > available) {
        alert(`คืนเกินหน้าร้านไม่ได้ เหลือ ${available} ชิ้น: ${draft.product.name}`);
        return;
      }
    }

    const movements = [
      ...countDrafts,
      ...returnDrafts.map(({ product, qty }) => ({
        sku_code: product.sku_code,
        name: product.name,
        movement_type: "return_to_warehouse" as const,
        qty_piece: qty,
      })),
    ];

    await saveBatchMovements(movements, () => {
      setCountInputs({});
      setQtyInputs({});
    });
  };

  const createSession = async () => {
    if (!sessionLabel.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: sessionLabel.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "เปิดรอบขายไม่สำเร็จ");
      }
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const closeSession = async () => {
    if (!sessionData.current) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock-session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.current.session_id,
          action: "close",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "ปิดรอบไม่สำเร็จ");
      }
      await loadData();
    } finally {
      setSubmitting(false);
    }
  };

  const renderSessionBanner = () => {
    if (sessionData.current) {
      return (
        <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">
                รอบขายปัจจุบัน
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {sessionData.current.label}
              </h2>
              <p className="mt-2 text-base text-emerald-50/85">
                เริ่มรอบเมื่อ {sessionData.current.started_at}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base text-slate-200">
              <p>สินค้าคลังร้านคงเหลือ {overview?.totals.warehouseBalance.toLocaleString() || 0} ชิ้น</p>
              <p className="mt-1">สินค้าหน้าร้านคงเหลือ {overview?.totals.storefrontBalance.toLocaleString() || 0} ชิ้น</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-[28px] border border-dashed border-white/[0.12] bg-white/[0.02] p-5 sm:p-6">
        <p className="text-base font-bold text-slate-200 leading-7">
          ยังไม่มีรอบขายที่เปิดอยู่ เริ่มจากสร้างรอบก่อน แล้วจึงรับเข้าคลังร้านหรือเบิกไปหน้าร้านได้
        </p>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={sessionLabel}
            onChange={(e) => setSessionLabel(e.target.value)}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-white outline-none transition focus:border-cyan-500/50"
            placeholder="ตั้งชื่อรอบขาย"
          />
          <button
            type="button"
            onClick={createSession}
            disabled={submitting}
            className="rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-cyan-500/20 transition active:scale-[0.98] disabled:opacity-50"
          >
            เปิดรอบขาย
          </button>
        </div>
      </div>
    );
  };

  const renderMetricCards = () => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {
          label: "คลังร้านคงเหลือ",
          value: overview?.totals.warehouseBalance || 0,
          accent: "text-sky-300",
        },
        {
          label: "หน้าร้านคงเหลือ",
          value: overview?.totals.storefrontBalance || 0,
          accent: "text-emerald-300",
        },
        {
          label: "ขายวันนี้",
          value: overview?.totals.soldToday || 0,
          accent: "text-amber-300",
        },
        {
          label: "ส่วนต่างล่าสุด",
          value: overview?.totals.storefrontDiff || 0,
          accent:
            (overview?.totals.storefrontDiff || 0) >= 0
              ? "text-violet-300"
              : "text-rose-300",
        },
      ].map((metric) => (
        <div
          key={metric.label}
          className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20"
        >
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            {metric.label}
          </p>
          <p className={`mt-3 text-3xl sm:text-4xl font-black tabular-nums ${metric.accent}`}>
            {metric.value.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );

  const renderProductActionList = (
    movementType: "receive_to_warehouse" | "move_to_storefront" | "return_to_warehouse",
    balanceSelector: (overviewItem: StockOverviewItem | undefined) => number,
    label: string,
    buttonLabel: string,
    secondaryBalance?: {
      label: string;
      selector: (overviewItem: StockOverviewItem | undefined) => number;
    },
  ) => (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-2">
        {inventoryProducts.map((product) => {
          const item = overviewMap.get(product.sku_code || product.name);
          const qty = qtyInputs[product.sku_code] || "";
          return (
            <div
              key={product.sku_code}
              className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20"
            >
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0d1117] p-2">
                    <img
                      src={product.image || "/image/empty.jpg"}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/image/empty.jpg";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-base font-black leading-tight text-white sm:text-lg">{product.name}</p>
                    <p className="mt-1 break-all text-sm font-mono text-slate-400">{product.sku_code}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-3">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                      <p className="mt-1 text-xl font-black tabular-nums text-white sm:text-2xl">
                        {balanceSelector(item).toLocaleString()}
                      </p>
                    </div>
                    {secondaryBalance ? (
                      <div className="min-w-0 text-right">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                          {secondaryBalance.label}
                        </p>
                        <p className="mt-1 text-base font-black tabular-nums text-cyan-300 sm:text-lg">
                          {secondaryBalance.selector(item).toLocaleString()}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <input
                  type="text"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => updateQtyInput(product.sku_code, e.target.value)}
                  className="w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-cyan-500/50"
                  placeholder="0"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => saveMovementDrafts(movementType)}
          disabled={submitting || !sessionData.current}
          className="rounded-2xl bg-linear-to-r from-cyan-500 to-blue-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-cyan-500/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? "กำลังบันทึก..." : buttonLabel}
        </button>
      </div>
    </div>
  );

  const renderMovements = (movements: StockMovement[], emptyText: string) => (
    <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
      <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">
        รายการล่าสุด
      </p>
      <div className="mt-4 space-y-3">
        {movements.length === 0 ? (
          <p className="text-base text-slate-400">{emptyText}</p>
        ) : (
          movements.slice(0, 12).map((movement) => (
            <div
              key={movement.movement_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.05] bg-black/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">
                  {movement.name}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {formatMovementLabel(movement.movement_type)} • {movement.date}
                </p>
              </div>
              <span className="text-lg font-black tabular-nums text-cyan-300">
                {movement.qty_piece.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="overflow-hidden rounded-[32px] border border-white/[0.06] bg-white/[0.03] shadow-2xl shadow-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-[#0d1117] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              {[
                "สินค้า",
                "ยกมาคลัง",
                "รับเข้า",
                "เบิกไปหน้าร้าน",
                "คืนเข้าคลัง",
                "คลังคงเหลือ",
                "หน้าร้านคงเหลือ",
                "ขายวันนี้",
                "ควรเหลือหน้าร้าน",
                "นับจริง",
                "ส่วนต่าง",
              ].map((header) => (
                <th key={header} className="px-4 py-4 font-black">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overview?.items.map((item) => (
              <tr key={item.sku_code} className="border-t border-white/[0.05] text-base">
                <td className="px-4 py-4">
                  <p className="font-black text-white">{item.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.sku_code}</p>
                </td>
                <td className="px-4 py-4 font-mono">{item.warehouseOpening.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-sky-300">{item.receivedToWarehouse.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-emerald-300">{item.movedToStorefront.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-violet-300">{item.returnedToWarehouse.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-white">{item.warehouseBalance.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-white">{item.storefrontBalance.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-amber-300">{item.soldToday.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono text-cyan-300">{item.storefrontExpected.toLocaleString()}</td>
                <td className="px-4 py-4 font-mono">{item.storefrontActual.toLocaleString()}</td>
                <td className={`px-4 py-4 font-mono font-black ${item.storefrontDiff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {item.storefrontDiff > 0 ? "+" : ""}
                  {item.storefrontDiff.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCloseout = () => (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 sm:p-5">
        <p className="text-base font-bold text-slate-200 leading-7">
          ปิดรอบขายโดยนับหน้าร้านจริงก่อน จากนั้นคืนของกลับเข้าคลังร้านให้ครบ แล้วจึงกดปิดรอบ
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {inventoryProducts.map((product) => {
          const item = overviewMap.get(product.sku_code || product.name);
          const countValue = countInputs[product.sku_code] || "";
          const returnValue = qtyInputs[product.sku_code] || "";
          return (
            <div
              key={product.sku_code}
              className="rounded-[28px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-xl shadow-black/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0d1117] p-2">
                    <img
                      src={product.image || "/image/empty.jpg"}
                      alt={product.name}
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/image/empty.jpg";
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-base font-black leading-tight text-white">{product.name}</p>
                    <p className="mt-1 break-all text-sm text-slate-400">{product.sku_code}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 px-3 py-2 text-left sm:text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">ควรเหลือ</p>
                  <p className="mt-1 text-xl font-black text-cyan-300 sm:text-2xl">
                    {(item?.storefrontExpected || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">นับจริงหน้าร้าน</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={countValue}
                    onChange={(e) => updateCountInput(product.sku_code, e.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-emerald-500/50"
                    placeholder="0"
                  />
                </div>

                <div className="rounded-2xl border border-white/[0.05] bg-black/20 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">คืนเข้าคลังร้าน</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={returnValue}
                    onChange={(e) => updateQtyInput(product.sku_code, e.target.value)}
                    className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-center text-xl font-black text-white outline-none transition focus:border-violet-500/50"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-base">
                <span className="text-slate-400">หน้าร้านคงเหลือล่าสุด</span>
                <span className="font-black text-white">
                  {(item?.storefrontBalance || 0).toLocaleString()} ชิ้น
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={saveCloseoutDrafts}
          disabled={submitting || !sessionData.current}
          className="rounded-2xl bg-white/[0.08] px-5 py-3.5 text-base font-black text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          บันทึกทั้งหมด
        </button>
        <button
          type="button"
          onClick={closeSession}
          disabled={submitting || !sessionData.current}
          className="rounded-2xl bg-linear-to-r from-rose-500 to-orange-500 px-5 py-3.5 text-base font-black text-white shadow-lg shadow-rose-500/20 transition active:scale-[0.98] disabled:opacity-40"
        >
          ปิดรอบขาย
        </button>
      </div>
    </div>
  );

  const renderSessionSummaryComparison = () => (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              รอบที่กำลังเปรียบเทียบ
            </p>
            <p className="mt-2 text-lg font-black text-white">
              {overview?.session?.label || "ยังไม่มีรอบขาย"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {overview?.session
                ? `${overview.session.started_at}${overview.session.closed_at ? ` - ${overview.session.closed_at}` : " - กำลังเปิดรอบ"}`
                : "เลือกดูสรุปตามรอบการขายได้จากรายการด้านขวา"}
            </p>
          </div>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              เลือกรอบขาย
            </span>
            <select
              value={selectedComparisonSessionId}
              onChange={(e) => setSelectedComparisonSessionId(e.target.value)}
              className="min-w-[260px] rounded-2xl border border-white/[0.08] bg-[#0d1117] px-4 py-3 text-sm font-bold text-white outline-none transition focus:border-violet-500/50"
            >
              {sessionData.sessions.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  {session.label || session.session_id} ({session.started_at}
                  {session.closed_at ? ` - ${session.closed_at}` : ""})
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "เบิกทั้งรอบ",
            value: overview?.sessionSummaryTotals.totalWithdrawn || 0,
            accent: "text-cyan-300",
          },
          {
            label: "ขายทั้งรอบ",
            value: overview?.sessionSummaryTotals.totalSold || 0,
            accent: "text-amber-300",
          },
          {
            label: "ควรเหลือ",
            value: overview?.sessionSummaryTotals.totalExpected || 0,
            accent: "text-white",
          },
          {
            label: "นับจริง",
            value: overview?.sessionSummaryTotals.totalCounted || 0,
            accent: "text-emerald-300",
          },
          {
            label: "ส่วนต่าง",
            value: overview?.sessionSummaryTotals.totalDiff || 0,
            accent:
              (overview?.sessionSummaryTotals.totalDiff || 0) >= 0
                ? "text-violet-300"
                : "text-rose-300",
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 shadow-lg shadow-black/20"
          >
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
              {metric.label}
            </p>
            <p className={`mt-3 text-3xl sm:text-4xl font-black tabular-nums ${metric.accent}`}>
              {metric.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white/[0.06] bg-white/[0.03] shadow-2xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#0d1117] text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                {["สินค้า", "เบิก", "ขาย", "ควรเหลือ", "นับจริง", "ส่วนต่าง"].map((header) => (
                  <th key={header} className="px-4 py-4 font-black">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview?.sessionSummary.map((item) => (
                <tr
                  key={item.sku_code || item.name}
                  className="border-t border-white/[0.05] text-base"
                >
                  <td className="px-4 py-4">
                    <p className="font-black text-white">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-400">{item.sku_code}</p>
                  </td>
                  <td className="px-4 py-4 font-mono text-cyan-300">
                    {item.withdrawn.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 font-mono text-amber-300">
                    {item.sold.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 font-mono text-white">
                    {item.expected.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 font-mono text-emerald-300">
                    {item.counted.toLocaleString()}
                  </td>
                  <td className={`px-4 py-4 font-mono font-black ${item.diff >= 0 ? "text-violet-300" : "text-rose-300"}`}>
                    {item.diff > 0 ? "+" : ""}
                    {item.diff.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[32px] border border-white/[0.06] bg-linear-to-br from-white/[0.04] via-white/[0.03] to-white/[0.01] p-5 shadow-2xl shadow-black/30 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className={`inline-flex items-center rounded-full bg-linear-to-r px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-black ${copy.accent}`}>
              Stock Session
            </span>
            <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">{copy.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">{copy.description}</p>
          </div>
          <div className="rounded-[24px] border border-white/[0.06] bg-black/20 px-4 py-3 text-base text-slate-300">
            วันนี้ {formatDate()}
          </div>
        </div>
      </section>

      {renderSessionBanner()}
      {renderMetricCards()}

      {loading ? (
        <div className="rounded-[32px] border border-white/[0.06] bg-white/[0.03] p-10 text-center text-slate-500">
          กำลังโหลดข้อมูล...
        </div>
      ) : mode === "warehouse" ? (
        <div className="space-y-4">
          {renderProductActionList(
            "receive_to_warehouse",
            (item) => item?.warehouseBalance || 0,
            "คลังร้านคงเหลือ",
            "รับเข้าคลัง",
          )}
          {renderMovements(warehouseMovements, "ยังไม่มีรายการรับเข้า/คืนเข้าคลังร้านในรอบนี้")}
        </div>
      ) : mode === "storefront" ? (
        <div className="space-y-4">
          {renderProductActionList(
            "move_to_storefront",
            (item) => item?.storefrontBalance || 0,
            "หน้าร้านคงเหลือ",
            "เบิกไปหน้าร้าน",
            {
              label: "ในคลัง",
              selector: (item) => item?.warehouseBalance || 0,
            },
          )}
          {renderMovements(storefrontMovements, "ยังไม่มีรายการเบิกจากคลังร้านไปหน้าร้านในรอบนี้")}
        </div>
      ) : mode === "comparison" ? (
        renderSessionSummaryComparison()
      ) : (
        renderCloseout()
      )}
    </div>
  );
}
