import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

export function getThaiDateParts(date = new Date()) {
  const th = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const dd = String(th.getUTCDate()).padStart(2, "0");
  const mm = String(th.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = th.getUTCFullYear();
  return { dd, mm, yyyy };
}

export function getTodayDateStr(date = new Date()) {
  const { dd, mm, yyyy } = getThaiDateParts(date);
  return `${dd}-${mm}-${yyyy}`;
}

export function parseDateString(dateStr: string) {
  const [dd, mm, yyyy] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(yyyy, mm - 1, dd));
}

export function formatDateString(date: Date) {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function enumerateDateStrings(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = parseDateString(startDate);
  const end = parseDateString(endDate);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatDateString(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export async function getSpreadsheet() {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}
