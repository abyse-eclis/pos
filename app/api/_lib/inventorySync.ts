import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  getRowValue,
  getSheetByAnyTitle,
  parseDateString,
} from "./googleSheets";

const INVENTORY_SHEET_TITLE = "สต๊อกรายวัน";
const INVENTORY_HEADERS = [
  "วันที่",
  "รหัสสินค้า",
  "ชื่อสินค้า",
  "ยอดยกมา",
  "เบิก",
  "นับจริง",
];

interface ProductMeta {
  sku_code: string;
  name: string;
}

interface MovementRow {
  timestamp: string;
  date: string;
  sku_code: string;
  name: string;
  movement_type: string;
  qty_piece: number;
}

interface SalesRow {
  date: string;
  sku_code: string;
  name: string;
  qty: number;
}

function getKey(skuCode: string, name: string) {
  return String(skuCode || "").trim() || String(name || "").trim();
}

function toNumber(value: unknown) {
  return Number(value) || 0;
}

function sortDateAsc(a: string, b: string) {
  return parseDateString(a).getTime() - parseDateString(b).getTime();
}

async function getOrCreateInventorySheet(doc: GoogleSpreadsheet) {
  let sheet = getSheetByAnyTitle(doc, INVENTORY_SHEET_TITLE);
  if (!sheet) {
    sheet = await doc.addSheet({
      title: INVENTORY_SHEET_TITLE,
      headerValues: INVENTORY_HEADERS,
    });
  } else {
    await sheet.loadHeaderRow();
    if (sheet.headerValues.join("|") !== INVENTORY_HEADERS.join("|")) {
      await sheet.setHeaderRow(INVENTORY_HEADERS);
    }
  }
  return sheet;
}

async function loadProducts(doc: GoogleSpreadsheet) {
  const sheet = getSheetByAnyTitle(doc, "สินค้า");
  if (!sheet) return new Map<string, ProductMeta>();

  const rows = await sheet.getRows();
  const map = new Map<string, ProductMeta>();

  for (const row of rows) {
    const skuCode = String(getRowValue(row, "รหัส SKU", "sku_code")).trim();
    const name = String(getRowValue(row, "ชื่อสินค้า", "name")).trim();
    const key = getKey(skuCode, name);
    if (!key) continue;

    map.set(key, {
      sku_code: skuCode,
      name,
    });
  }

  return map;
}

async function loadMovements(doc: GoogleSpreadsheet) {
  const sheet = getSheetByAnyTitle(doc, "ความเคลื่อนไหวสต๊อก");
  if (!sheet) return [] as MovementRow[];

  const rows = await sheet.getRows();
  return rows
    .map((row) => ({
      timestamp: String(row.get("timestamp") || ""),
      date: String(row.get("date") || "").trim(),
      sku_code: String(row.get("sku_code") || "").trim(),
      name: String(row.get("name") || "").trim(),
      movement_type: String(row.get("movement_type") || "").trim(),
      qty_piece: toNumber(row.get("qty_piece")),
    }))
    .filter((row) => row.date && (row.sku_code || row.name))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

async function loadSales(doc: GoogleSpreadsheet) {
  const sales: SalesRow[] = [];
  const dateSheets = doc.sheetsByIndex
    .map((sheet) => sheet.title)
    .filter((title) => /^\d{2}-\d{2}-\d{4}$/.test(title))
    .sort(sortDateAsc);

  for (const date of dateSheets) {
    const sheet = doc.sheetsByTitle[date];
    if (!sheet) continue;
    const rows = await sheet.getRows();

    for (const row of rows) {
      const skuCode = String(getRowValue(row, "รหัสสินค้า")).trim();
      const name = String(getRowValue(row, "ชื่อสินค้า")).trim();
      const qty = toNumber(getRowValue(row, "จำนวน"));
      if (!qty) continue;

      sales.push({
        date,
        sku_code: skuCode,
        name,
        qty,
      });
    }
  }

  return sales;
}

function buildSalesByDate(salesRows: SalesRow[]) {
  const map = new Map<string, Map<string, number>>();

  for (const row of salesRows) {
    if (!map.has(row.date)) {
      map.set(row.date, new Map<string, number>());
    }
    const dateMap = map.get(row.date)!;
    const key = getKey(row.sku_code, row.name);
    dateMap.set(key, (dateMap.get(key) || 0) + row.qty);
  }

  return map;
}

export async function syncInventorySheetFromMovements(
  doc: GoogleSpreadsheet,
  options?: { date?: string },
) {
  const targetDate = options?.date?.trim() || "";
  const inventorySheet = await getOrCreateInventorySheet(doc);
  const [products, movementRows, salesRows, inventoryRows] = await Promise.all([
    loadProducts(doc),
    loadMovements(doc),
    loadSales(doc),
    inventorySheet.getRows(),
  ]);

  const salesByDate = buildSalesByDate(salesRows);
  const movementsByDate = new Map<string, MovementRow[]>();

  for (const row of movementRows) {
    if (!movementsByDate.has(row.date)) {
      movementsByDate.set(row.date, []);
    }
    movementsByDate.get(row.date)!.push(row);
  }

  const allDates = Array.from(
    new Set<string>([
      ...movementsByDate.keys(),
      ...salesByDate.keys(),
      ...(targetDate ? [targetDate] : []),
    ]),
  ).sort(sortDateAsc);

  const existingRows = new Map<string, any>();
  for (const row of inventoryRows) {
    const key = `${String(getRowValue(row, "วันที่")).trim()}::${getKey(
      String(getRowValue(row, "รหัสสินค้า")).trim(),
      String(getRowValue(row, "ชื่อสินค้า")).trim(),
    )}`;
    existingRows.set(key, row);
  }

  const openingByKey = new Map<string, number>();
  const rowsToAdd: Record<string, string | number>[] = [];
  let updated = 0;

  for (const date of allDates) {
    const dayMovements = [...(movementsByDate.get(date) || [])].sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
    const daySales = salesByDate.get(date) || new Map<string, number>();
    const movementAgg = new Map<
      string,
      {
        sku_code: string;
        name: string;
        moveToStorefront: number;
        returnToWarehouse: number;
        latestCount?: number;
      }
    >();

    for (const movement of dayMovements) {
      const key = getKey(movement.sku_code, movement.name);
      const current = movementAgg.get(key) || {
        sku_code: movement.sku_code,
        name: movement.name,
        moveToStorefront: 0,
        returnToWarehouse: 0,
      };

      if (movement.movement_type === "move_to_storefront") {
        current.moveToStorefront += movement.qty_piece;
      } else if (movement.movement_type === "return_to_warehouse") {
        current.returnToWarehouse += movement.qty_piece;
      } else if (movement.movement_type === "storefront_count") {
        current.latestCount = movement.qty_piece;
      }

      movementAgg.set(key, current);
    }

    const keys = new Set<string>([...movementAgg.keys(), ...daySales.keys()]);

    for (const key of keys) {
      const product = products.get(key);
      const hasMovement = movementAgg.has(key);
      const hasSales = daySales.has(key);
      if (!hasMovement && !hasSales) continue;

      const movement = movementAgg.get(key);
      const opening = openingByKey.get(key) || 0;
      const moved = movement?.moveToStorefront || 0;
      const returned = movement?.returnToWarehouse || 0;
      const netWithdraw = moved - returned;
      const sold = daySales.get(key) || 0;
      const expectedClosing = opening + netWithdraw - sold;
      const closing = movement?.latestCount !== undefined ? movement.latestCount : expectedClosing;

      openingByKey.set(key, closing);

      if (targetDate && date !== targetDate) {
        continue;
      }

      const skuCode = movement?.sku_code || product?.sku_code || String(key).trim();
      const name = movement?.name || product?.name || String(key).trim();
      const rowKey = `${date}::${getKey(skuCode, name)}`;
      const payload = {
        วันที่: date,
        รหัสสินค้า: skuCode,
        ชื่อสินค้า: name,
        ยอดยกมา: opening,
        เบิก: netWithdraw,
        นับจริง: closing,
      };

      const existing = existingRows.get(rowKey);
      if (existing) {
        let changed = false;
        for (const [field, value] of Object.entries(payload)) {
          if (String(existing.get(field) ?? "") !== String(value)) {
            existing.set(field, value);
            changed = true;
          }
        }
        if (changed) {
          await existing.save();
          updated += 1;
        }
      } else {
        rowsToAdd.push(payload);
      }
    }
  }

  if (rowsToAdd.length > 0) {
    await inventorySheet.addRows(rowsToAdd);
  }

  return {
    success: true,
    added: rowsToAdd.length,
    updated,
    dates: targetDate ? [targetDate] : allDates,
  };
}
