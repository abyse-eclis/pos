import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import { syncInventorySheetFromMovements } from "../_lib/inventorySync";
import {
  buildMovementId,
  getAllMovements,
  getMovementSheet,
  getOpenSession,
  getSessionStockSnapshot,
  StockMovementType,
} from "../_lib/stockSession";

const ALLOWED_TYPES: StockMovementType[] = [
  "receive_to_warehouse",
  "move_to_storefront",
  "return_to_warehouse",
  "storefront_count",
];

interface MovementPayload {
  session_id?: string;
  sku_code: string;
  name: string;
  movement_type: StockMovementType;
  qty_piece: number;
  note?: string;
}

function normalizePayloads(body: any): MovementPayload[] {
  if (Array.isArray(body?.movements)) return body.movements;
  return [body];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const movementType = url.searchParams.get("movement_type");

    const doc = await getSpreadsheet();
    const movements = await getAllMovements(doc);

    const filtered = movements.filter((movement) => {
      if (sessionId && movement.session_id !== sessionId) return false;
      if (movementType && movement.movement_type !== movementType) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      movements: filtered,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payloads = normalizePayloads(body);

    if (payloads.length === 0) {
      return NextResponse.json(
        { success: false, error: "No movements provided" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const openSession = await getOpenSession(doc);
    const activeSessionId = payloads[0]?.session_id || openSession?.session_id;

    if (!activeSessionId) {
      return NextResponse.json(
        { success: false, error: "No open stock session" },
        { status: 409 },
      );
    }

    if (!openSession || openSession.session_id !== activeSessionId) {
      return NextResponse.json(
        { success: false, error: "Stock session is not available for movement" },
        { status: 409 },
      );
    }

    const stockSnapshot = await getSessionStockSnapshot(doc, openSession);
    const workingSnapshot = new Map(stockSnapshot);

    const movementsToAdd = payloads.map((payload) => {
      const qty = Number(payload.qty_piece) || 0;
      if (
        !payload.sku_code ||
        !payload.name ||
        !ALLOWED_TYPES.includes(payload.movement_type)
      ) {
        throw new Error("Invalid movement payload");
      }
      if (qty <= 0) {
        throw new Error("Quantity must be greater than zero");
      }

      const key = payload.sku_code || payload.name;
      const stockItem = workingSnapshot.get(key) || {
        warehouseBalance: 0,
        storefrontBalance: 0,
      };

      if (
        payload.movement_type === "move_to_storefront" &&
        qty > stockItem.warehouseBalance
      ) {
        throw new Error(`เบิกเกินคลังร้านได้สูงสุด ${stockItem.warehouseBalance} ชิ้น`);
      }

      if (
        payload.movement_type === "return_to_warehouse" &&
        qty > stockItem.storefrontBalance
      ) {
        throw new Error(
          `คืนเกินหน้าร้านได้สูงสุด ${Math.max(stockItem.storefrontBalance, 0)} ชิ้น`,
        );
      }

      if (payload.movement_type === "receive_to_warehouse") {
        stockItem.warehouseBalance += qty;
      } else if (payload.movement_type === "move_to_storefront") {
        stockItem.warehouseBalance -= qty;
        stockItem.storefrontBalance += qty;
      } else if (payload.movement_type === "return_to_warehouse") {
        stockItem.warehouseBalance += qty;
        stockItem.storefrontBalance -= qty;
      } else if (payload.movement_type === "storefront_count") {
        stockItem.storefrontBalance = qty;
      }

      workingSnapshot.set(key, stockItem);

      return {
        movement_id: buildMovementId(),
        session_id: activeSessionId,
        timestamp: new Date().toISOString(),
        date: getTodayDateStr(),
        sku_code: payload.sku_code,
        name: payload.name,
        movement_type: payload.movement_type,
        qty_piece: qty,
        note: payload.note || "",
      };
    });

    const sheet = await getMovementSheet(doc);
    await sheet.addRows(movementsToAdd);

    const dates = Array.from(new Set(movementsToAdd.map((movement) => movement.date)));
    for (const date of dates) {
      await syncInventorySheetFromMovements(doc, { date });
    }

    return NextResponse.json({
      success: true,
      movements: movementsToAdd,
    });
  } catch (error: any) {
    const message =
      error instanceof Error ? error.message : "Unable to save stock movements";
    const status =
      message === "Invalid movement payload" || message === "Quantity must be greater than zero"
        ? 400
        : 409;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
