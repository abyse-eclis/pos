import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSpreadsheet } from "../_lib/googleSheets";

const MAX_FILE_SIZE = 4_500_000;

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName) return fromName;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };

  return byType[file.type] || "jpg";
}

async function getProductsSheet() {
  const doc = await getSpreadsheet();
  const exact = doc.sheetsByTitle["สินค้า"];
  if (exact) return exact;

  for (const sheet of doc.sheetsByIndex) {
    await sheet.loadHeaderRow();
    if (
      sheet.headerValues.includes("sku_code") ||
      sheet.headerValues.includes("image") ||
      sheet.headerValues.includes("name")
    ) {
      return sheet;
    }
  }

  throw new Error("ไม่พบ sheet สินค้า");
}

async function ensureImageColumn(sheet: Awaited<ReturnType<typeof getProductsSheet>>) {
  await sheet.loadHeaderRow();
  if (!sheet.headerValues.includes("image")) {
    await sheet.setHeaderRow([...sheet.headerValues, "image"]);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const skuCode = String(formData.get("sku_code") || "").trim();
    const productName = String(formData.get("name") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "กรุณาเลือกรูปสินค้า" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ success: false, error: "รองรับเฉพาะไฟล์รูปภาพ" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "ไฟล์ใหญ่เกินไป กรุณาใช้รูปไม่เกิน 4.5 MB" },
        { status: 400 },
      );
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN" },
        { status: 500 },
      );
    }

    const extension = getExtension(file);
    const keyBase = sanitizeSlug(skuCode || productName || "product");
    const blob = await put(`products/${keyBase}-${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: false,
    });

    const sheet = await getProductsSheet();
    await ensureImageColumn(sheet);
    const rows = await sheet.getRows();

    const targetRow = rows.find((row) => {
      const rowSku = String(row.get("sku_code") || row.get("รหัส SKU") || "").trim();
      const rowName = String(row.get("name") || row.get("ชื่อสินค้า") || "").trim();
      return (skuCode && rowSku === skuCode) || (productName && rowName === productName);
    });

    if (!targetRow) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้าใน Google Sheet" }, { status: 404 });
    }

    targetRow.set("image", blob.url);
    await targetRow.save();

    return NextResponse.json({
      success: true,
      image: blob.url,
      pathname: blob.pathname,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "อัปโหลดรูปไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
