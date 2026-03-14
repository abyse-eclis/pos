import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import {
  buildSessionId,
  getAllSessions,
  getOpenSession,
  getSessionSheet,
  rowToSession,
} from "../_lib/stockSession";

export async function GET() {
  try {
    const doc = await getSpreadsheet();
    const sessions = await getAllSessions(doc);
    const current = sessions.find((session) => session.status === "open") || null;

    return NextResponse.json({
      success: true,
      current,
      sessions,
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
    const label = (body.label || "").trim();

    if (!label) {
      return NextResponse.json(
        { success: false, error: "Missing session label" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const existing = await getOpenSession(doc);
    if (existing) {
      return NextResponse.json(
        { success: false, error: "There is already an open stock session" },
        { status: 409 },
      );
    }

    const sheet = await getSessionSheet(doc);
    const session = {
      session_id: buildSessionId(),
      label,
      started_at: getTodayDateStr(),
      closed_at: "",
      status: "open",
    };

    await sheet.addRow(session);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const sessionId = body.session_id;
    const action = body.action;

    if (!sessionId || action !== "close") {
      return NextResponse.json(
        { success: false, error: "Invalid close request" },
        { status: 400 },
      );
    }

    const doc = await getSpreadsheet();
    const sheet = await getSessionSheet(doc);
    const rows = await sheet.getRows();
    const row = rows.find((item) => item.get("session_id") === sessionId);

    if (!row) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 },
      );
    }

    row.set("status", "closed");
    row.set("closed_at", getTodayDateStr());
    await row.save();

    return NextResponse.json({
      success: true,
      session: rowToSession(row),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
