import { NextResponse } from "next/server";
import { getSpreadsheet } from "../_lib/googleSheets";

function parseBoolean(value: unknown, defaultValue = true) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return defaultValue;
  return normalized === "TRUE" || normalized === "1" || normalized === "YES";
}

function normalizeImagePath(imageRaw: string) {
  const image = imageRaw.trim();
  if (!image) return "";
  if (!image.startsWith("http") && !image.startsWith("/")) {
    return image.startsWith("image/") ? `/${image}` : `/image/${image}`;
  }
  return image;
}

function normalizeSku(raw: unknown) {
  let skuCode = String(raw || "").trim();
  if (skuCode && (skuCode.includes("E+") || skuCode.includes("e+"))) {
    try {
      skuCode = BigInt(Math.round(Number(skuCode))).toString();
    } catch {
      skuCode = "";
    }
  }
  return skuCode;
}

function buildFallbackId(name: string, index: number) {
  const nameHandle = name
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0E00-\u0E7F]/g, "")
    .slice(0, 20);
  return `ITEM_${nameHandle || String(index + 1).padStart(3, "0")}`;
}

async function getProductsSheet() {
  const doc = await getSpreadsheet();
  const sheet = doc.sheetsByTitle["สินค้า"];
  if (!sheet) {
    throw new Error("ไม่พบ sheet 'สินค้า'");
  }
  return sheet;
}

async function ensureHeader(sheet: Awaited<ReturnType<typeof getProductsSheet>>, header: string) {
  await sheet.loadHeaderRow();
  if (!sheet.headerValues.includes(header)) {
    await sheet.setHeaderRow([...sheet.headerValues, header]);
  }
}

export async function GET() {
  try {
    const sheet = await getProductsSheet();
    const rows = await sheet.getRows();

    const products = rows
      .map((row, index) => {
        const skuRaw = row.get("รหัส SKU") || row.get("sku_code") || "";
        const name = (row.get("ชื่อสินค้า") || row.get("name") || "").trim();
        if (!name) return null;

        const skuCode = normalizeSku(skuRaw) || buildFallbackId(name, index);
        const price = Number(row.get("ราคาขาย (บาท)") || row.get("price")) || 0;
        const cost = Number(row.get("ราคาทุน (บาท)") || row.get("cost")) || 0;
        const category = (row.get("หมวดหมู่") || row.get("category") || "").trim();
        const image = normalizeImagePath(String(row.get("Path รูปภาพ") || row.get("image") || ""));
        const consumableId = (row.get("ตัดวัสดุ") || row.get("consumable_id") || "").trim();
        const packsPerCrate = Number(row.get("จำนวนแพ็คต่อ ลัง") || row.get("จำนวนแพ็คต่อลัง") || row.get("packs_per_crate")) || 0;
        const piecesPerPack = Number(row.get("จำนวนชิ้นต่อแพ็ค") || row.get("จำนวนต่อหน่วยใหญ่") || row.get("pieces_per_pack")) || 0;
        const isInventory = parseBoolean(row.get("is_inventory"), false);
        const isActive = parseBoolean(row.get("is_active"), true);

        return {
          sku_code: skuCode,
          name,
          price,
          cost,
          image,
          category,
          is_active: isActive,
          consumable_id: consumableId,
          packs_per_crate: packsPerCrate,
          pieces_per_pack: piecesPerPack,
          conversion_rate: piecesPerPack,
          is_inventory: isInventory,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ success: true, products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "โหลดสินค้าไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const skuCode = String(body.sku_code || "").trim();
    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    const price = Number(body.price) || 0;
    const cost = Number(body.cost) || 0;
    const isActive = Boolean(body.is_active);

    if (!skuCode) {
      return NextResponse.json({ success: false, error: "ไม่พบรหัสสินค้า" }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ success: false, error: "กรุณาระบุชื่อสินค้า" }, { status: 400 });
    }

    const sheet = await getProductsSheet();
    await ensureHeader(sheet, "is_active");
    const rows = await sheet.getRows();

    const targetRow = rows.find((row, index) => {
      const rowName = String(row.get("ชื่อสินค้า") || row.get("name") || "").trim();
      const rowSku =
        normalizeSku(row.get("รหัส SKU") || row.get("sku_code")) || buildFallbackId(rowName, index);
      return rowSku === skuCode;
    });

    if (!targetRow) {
      return NextResponse.json({ success: false, error: "ไม่พบสินค้าที่ต้องการแก้ไข" }, { status: 404 });
    }

    targetRow.set("name", name);
    targetRow.set("ชื่อสินค้า", name);
    targetRow.set("category", category);
    targetRow.set("หมวดหมู่", category);
    targetRow.set("price", price);
    targetRow.set("ราคาขาย (บาท)", price);
    targetRow.set("cost", cost);
    targetRow.set("ราคาทุน (บาท)", cost);
    targetRow.set("is_active", isActive ? "TRUE" : "FALSE");
    await targetRow.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "บันทึกสินค้าไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
