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

export function repairMojibakeText(text: string) {
  if (!text) return text;

  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    if (repaired.includes("\uFFFD")) return text;
    return repaired;
  } catch {
    return text;
  }
}

export function toMojibakeText(text: string) {
  if (!text) return text;

  try {
    return Buffer.from(text, "utf8").toString("latin1");
  } catch {
    return text;
  }
}

export function buildTextCandidates(...values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter(Boolean)
        .flatMap((value) => {
          const repaired = repairMojibakeText(value);
          const mojibake = toMojibakeText(value);
          return Array.from(
            new Set(
              [value, repaired, mojibake].filter(
                (candidate) => Boolean(candidate) && candidate.length > 0,
              ),
            ),
          );
        }),
    ),
  );
}

export function getSheetByAnyTitle(
  doc: GoogleSpreadsheet,
  ...titles: string[]
) {
  for (const title of buildTextCandidates(...titles)) {
    const sheet = doc.sheetsByTitle[title];
    if (sheet) return sheet;
  }
  return null;
}

export function getRowValue(row: any, ...keys: string[]) {
  for (const key of buildTextCandidates(...keys)) {
    const value = row.get(key);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
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
