import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

interface SummaryItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  price: number;
}

interface BillDetail {
  billId: string;
  time: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
}

interface InventorySummaryRow {
  sku_code: string;
  name: string;
  start_bal: number;
  withdraw: number;
  withdraw_pack: number;
  withdraw_crate: number;
  split_pack: number;
  split_crate: number;
  closing: number;
}

interface ProductInventoryMeta {
  sku_code: string;
  name: string;
  pieces_per_pack: number;
  packs_per_crate: number;
  is_inventory: boolean;
}

const INVENTORY_HEADERS = [
  "วันที่",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "ยอดยกมา",
  "เบิก_ชิ้น",
  "เบิก_แพ็ค",
  "เบิก_ลัง",
  "แกะ_แพ็ค",
  "แกะ_ลัง",
  "นับจริง",
];

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function getInventorySheet(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle["สต๊อกรายวัน"];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: "สต๊อกรายวัน",
      headerValues: INVENTORY_HEADERS,
    });
  }
  return sheet;
}

async function loadProductInventoryMeta(doc: GoogleSpreadsheet) {
  const sheet = doc.sheetsByTitle["สินค้า"];
  if (!sheet) return new Map<string, ProductInventoryMeta>();

  const rows = await sheet.getRows();
  const productMap = new Map<string, ProductInventoryMeta>();

  for (const row of rows) {
    const skuRaw = row.get("รหัส SKU") || row.get("sku_code") || "";
    const name = (row.get("ชื่อสินค้า") || row.get("name") || "").trim();
    if (!name) continue;

    let skuCode = String(skuRaw).trim();
    if (skuCode && (skuCode.includes("E+") || skuCode.includes("e+"))) {
      try {
        skuCode = BigInt(Math.round(Number(skuCode))).toString();
      } catch {
        skuCode = "";
      }
    }

    const nameHandle = name
      .replace(/\s+/g, "_")
      .replace(/[^\w\u0E00-\u0E7F]/g, "")
      .slice(0, 20);
    const id = skuCode || `ITEM_${nameHandle || "000"}`;

    const isInventoryRaw = (row.get("is_inventory") || "")
      .toString()
      .trim()
      .toUpperCase();

    productMap.set(id, {
      sku_code: id,
      name,
      pieces_per_pack:
        Number(row.get("จำนวนชิ้นต่อแพ็ค")) ||
        Number(row.get("จำนวนต่อหน่วยใหญ่")) ||
        0,
      packs_per_crate: Number(row.get("จำนวนแพ็คต่อลัง")) || 0,
      is_inventory:
        isInventoryRaw === "TRUE" ||
        isInventoryRaw === "1" ||
        isInventoryRaw === "YES",
    });
  }

  return productMap;
}

export async function GET(req: Request) {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(
      process.env.GOOGLE_SHEET_ID!,
      serviceAccountAuth,
    );
    await doc.loadInfo();

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const sheetTitle =
      dateParam && /^\d{2}-\d{2}-\d{4}$/.test(dateParam)
        ? dateParam
        : getTodayDateStr();

    const salesSheet = doc.sheetsByTitle[sheetTitle];
    const inventorySheet = await getInventorySheet(doc);
    const productMap = await loadProductInventoryMeta(doc);

    const itemMap = new Map<string, SummaryItem>();
    const billMap = new Map<
      string,
      { time: string; total: number; itemCount: number; paymentMethod: string }
    >();
    const billIds = new Set<string>();

    if (salesSheet) {
      const rows = await salesSheet.getRows();

      for (const row of rows) {
        const billId = row.get("บิล") || "";
        const skuCode = row.get("รหัสสินค้า") || "";
        const productName = row.get("ชื่อสินค้า") || "";
        const qty = Number(row.get("จำนวน")) || 0;
        const pricePerUnit = Number(row.get("ราคาต่อชิ้น")) || 0;
        const lineTotal = Number(row.get("ราคารวม")) || 0;
        const billTotal = Number(row.get("ยอดรวมทั้งบิล")) || 0;
        const paymentMethod = row.get("การชำระเงิน") || "เงินสด";
        const time = row.get("เวลา") || "";

        billIds.add(billId);

        const key = skuCode || productName;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key)!;
          existing.qty += qty;
          existing.revenue += lineTotal;
        } else {
          itemMap.set(key, {
            sku_code: skuCode,
            name: productName,
            qty,
            revenue: lineTotal,
            price: pricePerUnit,
          });
        }

        if (!billMap.has(billId)) {
          billMap.set(billId, {
            time,
            total: billTotal,
            itemCount: qty,
            paymentMethod,
          });
        } else {
          billMap.get(billId)!.itemCount += qty;
        }
      }
    }

    const items: SummaryItem[] = Array.from(itemMap.values()).sort(
      (a, b) => b.revenue - a.revenue,
    );

    const bills: BillDetail[] = Array.from(billMap.entries())
      .map(([billId, data]) => ({
        billId,
        time: data.time,
        total: data.total,
        itemCount: data.itemCount,
        paymentMethod: data.paymentMethod,
      }))
      .sort((a, b) => b.time.localeCompare(a.time));

    const totalRevenue = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalItems = items.reduce((sum, item) => sum + item.qty, 0);
    const totalCash = bills
      .filter((bill) => bill.paymentMethod === "เงินสด")
      .reduce((sum, bill) => sum + bill.total, 0);
    const totalTransfer = bills
      .filter((bill) => bill.paymentMethod === "โอน")
      .reduce((sum, bill) => sum + bill.total, 0);

    const inventoryRows = await inventorySheet.getRows();
    const inventoryMap = new Map<string, InventorySummaryRow>();

    for (const row of inventoryRows) {
      if ((row.get("วันที่") || "") !== sheetTitle) continue;

      const skuCode = row.get("รหัสสินค้า") || "";
      const name = row.get("ชื่อสินค้า") || "";
      const key = skuCode || name;
      if (!key) continue;

      const existing = inventoryMap.get(key) || {
        sku_code: skuCode,
        name,
        start_bal: 0,
        withdraw: 0,
        withdraw_pack: 0,
        withdraw_crate: 0,
        split_pack: 0,
        split_crate: 0,
        closing: 0,
      };

      existing.start_bal += Number(row.get("ยอดยกมา")) || 0;
      existing.withdraw += Number(row.get("เบิก_ชิ้น")) || 0;
      existing.withdraw_pack += Number(row.get("เบิก_แพ็ค")) || 0;
      existing.withdraw_crate += Number(row.get("เบิก_ลัง")) || 0;
      existing.split_pack += Number(row.get("แกะ_แพ็ค")) || 0;
      existing.split_crate += Number(row.get("แกะ_ลัง")) || 0;
      existing.closing += Number(row.get("นับจริง")) || 0;

      inventoryMap.set(key, existing);
    }

    const soldMap = new Map(
      items.map((item) => [item.sku_code || item.name, item.qty]),
    );

    const stockItems = Array.from(inventoryMap.values())
      .map((item) => {
        const productMeta =
          productMap.get(item.sku_code) ||
          Array.from(productMap.values()).find((product) => product.name === item.name);

        const piecesInPack = productMeta?.pieces_per_pack || 0;
        const packsInCrate = productMeta?.packs_per_crate || 0;
        const sold = soldMap.get(item.sku_code || item.name) || 0;
        const readyToSellGain = item.withdraw + item.split_pack * piecesInPack;
        const shouldRemain = item.start_bal + readyToSellGain - sold;
        const actual = item.closing || 0;
        const diff = actual - shouldRemain;
        const remainCrates = item.withdraw_crate - item.split_crate;
        const remainPacks =
          item.withdraw_pack + item.split_crate * packsInCrate - item.split_pack;

        return {
          sku_code: item.sku_code,
          name: item.name,
          start_bal: item.start_bal,
          withdraw: item.withdraw,
          withdraw_pack: item.withdraw_pack,
          withdraw_crate: item.withdraw_crate,
          split_pack: item.split_pack,
          split_crate: item.split_crate,
          sold,
          shouldRemain,
          actual,
          diff,
          remainPacks,
          remainCrates,
          isInventory: productMeta?.is_inventory ?? true,
        };
      })
      .filter(
        (item) =>
          item.isInventory &&
          (item.start_bal !== 0 ||
            item.withdraw !== 0 ||
            item.withdraw_pack !== 0 ||
            item.withdraw_crate !== 0 ||
            item.sold !== 0 ||
            item.actual !== 0 ||
            item.diff !== 0),
      )
      .sort((a, b) => {
        const diffGap = Math.abs(b.diff) - Math.abs(a.diff);
        if (diffGap !== 0) return diffGap;
        return b.sold - a.sold;
      })
      .map(({ isInventory, ...item }) => item);

    const stockTotals = stockItems.reduce(
      (acc, item) => {
        acc.totalProducts += 1;
        acc.countedProducts += item.actual > 0 ? 1 : 0;
        acc.totalSold += item.sold;
        acc.totalShouldRemain += item.shouldRemain;
        acc.totalActual += item.actual;
        acc.totalDiff += item.diff;
        if (item.diff < 0) acc.shortageCount += 1;
        if (item.diff > 0) acc.overCount += 1;
        return acc;
      },
      {
        totalProducts: 0,
        countedProducts: 0,
        totalSold: 0,
        totalShouldRemain: 0,
        totalActual: 0,
        totalDiff: 0,
        shortageCount: 0,
        overCount: 0,
      },
    );

    return NextResponse.json({
      success: true,
      date: sheetTitle,
      totalBills: billIds.size,
      totalRevenue,
      totalCash,
      totalTransfer,
      totalItems,
      items,
      bills,
      stockItems,
      stockTotals,
    });
  } catch (error: any) {
    console.error("Daily summary error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
