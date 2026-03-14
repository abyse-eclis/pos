import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import {
  buildMovementId,
  getAllMovements,
  getMovementSheet,
  getOpenSession,
  rowToMovement,
  StockMovementType,
} from "../_lib/stockSession";

const ALLOWED_TYPES: StockMovementType[] = [
  "receive_to_warehouse",
  "move_to_storefront",
  "return_to_warehouse",
  "storefront_count",
];

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
    const {
      session_id,
      sku_code,
      name,
      movement_type,
      qty_piece,
      note = "",
    } = body;

    if (!sku_code || !name || !ALLOWED_TYPES.includes(movement_type)) {
      return NextResponse.json(
        { success: false, error: "Invalid movement payload" },
        { status: 400 },
      );
    }

    const qty = Number(qty_piece) || 0;
    if (qty <= 0) {
      return NextResponse.json(
        { success: false, error: "Quantity must be greater than zero" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const openSession = await getOpenSession(doc);
    const activeSessionId = session_id || openSession?.session_id;

    if (!activeSessionId) {
      return NextResponse.json(
        { success: false, error: "No open stock session" },
        { status: 409 },
      );
    }

    const sheet = await getMovementSheet(doc);
    const movement = {
      movement_id: buildMovementId(),
      session_id: activeSessionId,
      timestamp: new Date().toISOString(),
      date: getTodayDateStr(),
      sku_code,
      name,
      movement_type,
      qty_piece: qty,
      note,
    };

    await sheet.addRow(movement);

    return NextResponse.json({
      success: true,
      movement,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
