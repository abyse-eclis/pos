import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import { syncInventorySheetFromMovements } from "../_lib/inventorySync";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || getTodayDateStr();

    const doc = await getSpreadsheet();
    const result = await syncInventorySheetFromMovements(doc, { date });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = String(body?.date || "").trim();

    const doc = await getSpreadsheet();
    const result = await syncInventorySheetFromMovements(doc, {
      date: date || undefined,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
