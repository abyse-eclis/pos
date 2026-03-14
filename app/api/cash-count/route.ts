import { NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

const HEADERS = [
  "วันที่",
  "เงินทอนตั้งต้น",
  "ยอดขายเงินสด",
  "ยอดขายโอน",
  "ยอดควรมี",
  "นับเงินจริง",
  "ส่วนต่าง",
];

function getTodayDateStr() {
  const now = new Date();
  const th = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

async function getCashCountSheet(doc: GoogleSpreadsheet) {
  let sheet = doc.sheetsByTitle["นับเงินรายวัน"];
  if (!sheet) {
    sheet = await doc.addSheet({
      title: "นับเงินรายวัน",
      headerValues: HEADERS,
    });
  }
  return sheet;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || getTodayDateStr();

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = await getCashCountSheet(doc);
    const rows = await sheet.getRows();

    const row = rows.find((r) => r.get("วันที่") === date);

    if (row) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          starting_cash: Number(row.get("เงินทอนตั้งต้น")) || 0,
          cash_sales: Number(row.get("ยอดขายเงินสด")) || 0,
          transfer_sales: Number(row.get("ยอดขายโอน")) || 0,
          expected_cash: Number(row.get("ยอดควรมี")) || 0,
          actual_cash: Number(row.get("นับเงินจริง")) || 0,
          difference: Number(row.get("ส่วนต่าง")) || 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        starting_cash: 0,
        cash_sales: 0,
        transfer_sales: 0,
        expected_cash: 0,
        actual_cash: 0,
        difference: 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      starting_cash,
      cash_sales,
      transfer_sales,
      expected_cash,
      actual_cash,
      difference,
    } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: "Missing date" }, { status: 400 });
    }

    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
    await doc.loadInfo();
    const sheet = await getCashCountSheet(doc);
    const rows = await sheet.getRows();

    const existingRow = rows.find((r) => r.get("วันที่") === date);

    const rowData = {
      "วันที่": date,
      "เงินทอนตั้งต้น": starting_cash || 0,
      "ยอดขายเงินสด": cash_sales || 0,
      "ยอดขายโอน": transfer_sales || 0,
      "ยอดควรมี": expected_cash || 0,
      "นับเงินจริง": actual_cash || 0,
      "ส่วนต่าง": difference || 0,
    };

    if (existingRow) {
      Object.entries(rowData).forEach(([key, val]) => {
        existingRow.set(key, val);
      });
      await existingRow.save();
    } else {
      await sheet.addRow(rowData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
