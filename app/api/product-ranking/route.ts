import { NextResponse } from "next/server";
import { getSpreadsheet, parseDateString } from "../_lib/googleSheets";

interface RankingItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  bills: number;
  image: string;
  category: string;
  averagePrice: number;
}

function normalizeImagePath(imageRaw: string) {
  const image = imageRaw.trim();
  if (!image) return "";
  if (!image.startsWith("http") && !image.startsWith("/")) {
    return image.startsWith("image/") ? `/${image}` : `/image/${image}`;
  }
  return image;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") || 7);
    const sortBy = searchParams.get("sortBy") === "revenue" ? "revenue" : "qty";
    const limit = Math.min(Number(searchParams.get("limit") || 100), 200);

    const doc = await getSpreadsheet();
    const allDateTitles = doc.sheetsByIndex
      .map((sheet) => sheet.title)
      .filter((title) => /^\d{2}-\d{2}-\d{4}$/.test(title))
      .sort((a, b) => parseDateString(b).getTime() - parseDateString(a).getTime());

    const selectedDates = daysParam > 0 ? allDateTitles.slice(0, daysParam) : allDateTitles;

    const productsSheet = doc.sheetsByTitle["สินค้า"];
    const productMeta = new Map<string, { image: string; category: string }>();

    if (productsSheet) {
      const productRows = await productsSheet.getRows();
      for (const row of productRows) {
        const skuCode = String(row.get("รหัส SKU") || row.get("sku_code") || "").trim();
        const name = String(row.get("ชื่อสินค้า") || row.get("name") || "").trim();
        const key = skuCode || name;
        if (!key) continue;

        productMeta.set(key, {
          image: normalizeImagePath(String(row.get("Path รูปภาพ") || row.get("image") || "")),
          category: String(row.get("หมวดหมู่") || "").trim(),
        });
      }
    }

    const rankingMap = new Map<string, RankingItem>();

    for (const title of selectedDates) {
      const sheet = doc.sheetsByTitle[title];
      if (!sheet) continue;

      const rows = await sheet.getRows();
      const billSeen = new Set<string>();

      for (const row of rows) {
        const skuCode = String(row.get("รหัสสินค้า") || "").trim();
        const name = String(row.get("ชื่อสินค้า") || "").trim();
        const key = skuCode || name;
        if (!key) continue;

        const qty = Number(row.get("จำนวน")) || 0;
        const revenue = Number(row.get("ราคารวม")) || 0;
        const billId = String(row.get("บิล") || "").trim();
        const meta = productMeta.get(key) || productMeta.get(name) || {
          image: "",
          category: "",
        };

        const current = rankingMap.get(key) || {
          sku_code: skuCode,
          name,
          qty: 0,
          revenue: 0,
          bills: 0,
          image: meta.image,
          category: meta.category,
          averagePrice: 0,
        };

        current.qty += qty;
        current.revenue += revenue;
        if (billId) {
          const billKey = `${title}:${key}:${billId}`;
          if (!billSeen.has(billKey)) {
            current.bills += 1;
            billSeen.add(billKey);
          }
        }
        if (!current.image && meta.image) current.image = meta.image;
        if (!current.category && meta.category) current.category = meta.category;

        rankingMap.set(key, current);
      }
    }

    const items = Array.from(rankingMap.values())
      .map((item) => ({
        ...item,
        averagePrice: item.qty > 0 ? Math.round((item.revenue / item.qty) * 100) / 100 : 0,
      }))
      .sort((a, b) => {
        if (sortBy === "revenue") {
          if (b.revenue !== a.revenue) return b.revenue - a.revenue;
          return b.qty - a.qty;
        }
        if (b.qty !== a.qty) return b.qty - a.qty;
        return b.revenue - a.revenue;
      })
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      sortBy,
      days: daysParam,
      dates: selectedDates,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "โหลดอันดับสินค้าไม่สำเร็จ";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
