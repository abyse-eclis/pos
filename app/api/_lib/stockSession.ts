import { GoogleSpreadsheet } from "google-spreadsheet";
import {
  enumerateDateStrings,
  getRowValue,
  getSheetByAnyTitle,
  getTodayDateStr,
} from "./googleSheets";

export const SESSION_SHEET_TITLE = "รอบขายสต๊อก";
export const MOVEMENT_SHEET_TITLE = "ความเคลื่อนไหวสต๊อก";

const SESSION_HEADERS = [
  "session_id",
  "label",
  "started_at",
  "closed_at",
  "status",
];

const MOVEMENT_HEADERS = [
  "movement_id",
  "session_id",
  "timestamp",
  "date",
  "sku_code",
  "name",
  "movement_type",
  "qty_piece",
  "note",
];

export type StockMovementType =
  | "receive_to_warehouse"
  | "move_to_storefront"
  | "return_to_warehouse"
  | "storefront_count";

export interface StockSessionRecord {
  session_id: string;
  label: string;
  started_at: string;
  closed_at: string;
  status: "open" | "closed";
}

export interface StockMovementRecord {
  movement_id: string;
  session_id: string;
  timestamp: string;
  date: string;
  sku_code: string;
  name: string;
  movement_type: StockMovementType;
  qty_piece: number;
  note: string;
}

export interface StockSnapshotItem {
  warehouseBalance: number;
  storefrontBalance: number;
}

export async function getOrCreateSheet(
  doc: GoogleSpreadsheet,
  title: string,
  headers: string[],
) {
  let sheet = getSheetByAnyTitle(doc, title);
  if (!sheet) {
    sheet = await doc.addSheet({
      title,
      headerValues: headers,
    });
  }
  return sheet;
}

export async function getSessionSheet(doc: GoogleSpreadsheet) {
  return getOrCreateSheet(doc, SESSION_SHEET_TITLE, SESSION_HEADERS);
}

export async function getMovementSheet(doc: GoogleSpreadsheet) {
  return getOrCreateSheet(doc, MOVEMENT_SHEET_TITLE, MOVEMENT_HEADERS);
}

export function rowToSession(row: any): StockSessionRecord {
  return {
    session_id: row.get("session_id") || "",
    label: row.get("label") || "",
    started_at: row.get("started_at") || "",
    closed_at: row.get("closed_at") || "",
    status: (row.get("status") || "open") as "open" | "closed",
  };
}

export function rowToMovement(row: any): StockMovementRecord {
  return {
    movement_id: row.get("movement_id") || "",
    session_id: row.get("session_id") || "",
    timestamp: row.get("timestamp") || "",
    date: row.get("date") || "",
    sku_code: row.get("sku_code") || "",
    name: row.get("name") || "",
    movement_type: (row.get("movement_type") ||
      "receive_to_warehouse") as StockMovementType,
    qty_piece: Number(row.get("qty_piece")) || 0,
    note: row.get("note") || "",
  };
}

export async function getAllSessions(doc: GoogleSpreadsheet) {
  const sheet = await getSessionSheet(doc);
  const rows = await sheet.getRows();
  return rows
    .map(rowToSession)
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
}

export async function getAllMovements(doc: GoogleSpreadsheet) {
  const sheet = await getMovementSheet(doc);
  const rows = await sheet.getRows();
  return rows
    .map(rowToMovement)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getOpenSession(doc: GoogleSpreadsheet) {
  const sessions = await getAllSessions(doc);
  return sessions.find((session) => session.status === "open") || null;
}

export function buildSessionId() {
  return `SESSION_${Date.now()}`;
}

export function buildMovementId() {
  return `MOVE_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export function getSessionDateRange(session: StockSessionRecord) {
  const endDate = session.closed_at || getTodayDateStr();
  return enumerateDateStrings(session.started_at, endDate);
}

export async function getSessionStockSnapshot(
  doc: GoogleSpreadsheet,
  session: StockSessionRecord,
) {
  const allMovements = await getAllMovements(doc);
  const sessionDates = getSessionDateRange(session);
  const { soldBySku } = await getSalesTotalsForDates(doc, sessionDates);
  const sessionStart = `${session.started_at}T00:00:00.000Z`;
  const snapshot = new Map<string, StockSnapshotItem>();

  const ensureKey = (key: string) => {
    if (!snapshot.has(key)) {
      snapshot.set(key, {
        warehouseBalance: 0,
        storefrontBalance: 0,
      });
    }
    return snapshot.get(key)!;
  };

  for (const movement of allMovements) {
    const key = movement.sku_code || movement.name;
    if (!key) continue;

    const isBeforeSession =
      movement.timestamp < sessionStart &&
      movement.session_id !== session.session_id;
    const isInSession = movement.session_id === session.session_id;

    if (!isBeforeSession && !isInSession) continue;

    const item = ensureKey(key);

    if (movement.movement_type === "receive_to_warehouse") {
      item.warehouseBalance += movement.qty_piece;
      continue;
    }

    if (movement.movement_type === "move_to_storefront") {
      item.warehouseBalance -= movement.qty_piece;
      item.storefrontBalance += movement.qty_piece;
      continue;
    }

    if (movement.movement_type === "return_to_warehouse") {
      item.warehouseBalance += movement.qty_piece;
      item.storefrontBalance -= movement.qty_piece;
    }
  }

  for (const [key, sold] of soldBySku.entries()) {
    const item = ensureKey(key);
    item.storefrontBalance -= sold.qty || 0;
  }

  return snapshot;
}

export async function getSalesTotalsForDates(
  doc: GoogleSpreadsheet,
  dates: string[],
) {
  const soldBySku = new Map<string, { qty: number; name: string; revenue: number }>();
  const soldTodayBySku = new Map<string, number>();
  const today = getTodayDateStr();

  for (const date of dates) {
    const sheet = doc.sheetsByTitle[date];
    if (!sheet) continue;
    const rows = await sheet.getRows();

    for (const row of rows) {
      const sku = getRowValue(row, "รหัสสินค้า");
      const name = getRowValue(row, "ชื่อสินค้า");
      const qty = Number(getRowValue(row, "จำนวน")) || 0;
      const revenue = Number(getRowValue(row, "ราคารวม")) || 0;
      const key = sku || name;
      if (!key) continue;

      const existing = soldBySku.get(key) || { qty: 0, name, revenue: 0 };
      existing.qty += qty;
      existing.revenue += revenue;
      soldBySku.set(key, existing);

      if (date === today) {
        soldTodayBySku.set(key, (soldTodayBySku.get(key) || 0) + qty);
      }
    }
  }

  return { soldBySku, soldTodayBySku };
}
