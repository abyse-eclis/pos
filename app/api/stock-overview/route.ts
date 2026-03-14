import { NextResponse } from "next/server";
import { getSpreadsheet, getTodayDateStr } from "../_lib/googleSheets";
import {
  getAllMovements,
  getAllSessions,
  getOpenSession,
  getSalesTotalsForDates,
  getSessionDateRange,
  StockMovementRecord,
} from "../_lib/stockSession";

interface Accumulator {
  warehouseBeforeSession: number;
  receivedToWarehouse: number;
  movedToStorefront: number;
  returnedToWarehouse: number;
  storefrontCountLatest: number;
  storefrontCountTimestamp: string;
}

function getKey(skuCode: string, name: string) {
  return skuCode || name;
}

function emptyAccumulator(): Accumulator {
  return {
    warehouseBeforeSession: 0,
    receivedToWarehouse: 0,
    movedToStorefront: 0,
    returnedToWarehouse: 0,
    storefrontCountLatest: 0,
    storefrontCountTimestamp: "",
  };
}

function applyWarehouseBalance(acc: Accumulator, movement: StockMovementRecord, toSessionOpening: boolean) {
  const qty = movement.qty_piece;
  if (movement.movement_type === "receive_to_warehouse") {
    if (toSessionOpening) acc.warehouseBeforeSession += qty;
    else acc.receivedToWarehouse += qty;
  }
  if (movement.movement_type === "move_to_storefront") {
    if (toSessionOpening) acc.warehouseBeforeSession -= qty;
    else acc.movedToStorefront += qty;
  }
  if (movement.movement_type === "return_to_warehouse") {
    if (toSessionOpening) acc.warehouseBeforeSession += qty;
    else acc.returnedToWarehouse += qty;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");
    const doc = await getSpreadsheet();

    const sessions = await getAllSessions(doc);
    const activeSession =
      sessions.find((session) => session.session_id === sessionId) ||
      (await getOpenSession(doc));

    if (!activeSession) {
      return NextResponse.json({
        success: true,
        session: null,
        generatedAt: new Date().toISOString(),
        items: [],
        totals: {
          warehouseOpening: 0,
          receivedToWarehouse: 0,
          movedToStorefront: 0,
          returnedToWarehouse: 0,
          warehouseBalance: 0,
          storefrontBalance: 0,
          soldToday: 0,
          soldInSession: 0,
          storefrontExpected: 0,
          storefrontActual: 0,
          storefrontDiff: 0,
        },
        movements: [],
      });
    }

    const allMovements = await getAllMovements(doc);
    const sessionMovements = allMovements.filter(
      (movement) => movement.session_id === activeSession.session_id,
    );
    const sessionStart = `${activeSession.started_at}T00:00:00.000Z`;

    const perSku = new Map<string, Accumulator>();
    const ensureSku = (key: string) => {
      if (!perSku.has(key)) perSku.set(key, emptyAccumulator());
      return perSku.get(key)!;
    };

    for (const movement of allMovements) {
      const key = getKey(movement.sku_code, movement.name);
      if (!key) continue;
      const acc = ensureSku(key);
      const isBeforeSession =
        movement.timestamp < sessionStart && movement.session_id !== activeSession.session_id;
      if (isBeforeSession) {
        applyWarehouseBalance(acc, movement, true);
      }
    }

    for (const movement of sessionMovements) {
      const key = getKey(movement.sku_code, movement.name);
      if (!key) continue;
      const acc = ensureSku(key);
      applyWarehouseBalance(acc, movement, false);

      if (
        movement.movement_type === "storefront_count" &&
        movement.timestamp >= acc.storefrontCountTimestamp
      ) {
        acc.storefrontCountLatest = movement.qty_piece;
        acc.storefrontCountTimestamp = movement.timestamp;
      }
    }

    const sessionDates = getSessionDateRange(activeSession);
    const { soldBySku, soldTodayBySku } = await getSalesTotalsForDates(doc, sessionDates);

    const productsSheet = doc.sheetsByTitle["สินค้า"];
    const productRows = productsSheet ? await productsSheet.getRows() : [];
    const productRecords = productRows
      .map((row) => {
        const sku = row.get("รหัส SKU") || row.get("sku_code") || "";
        const name = (row.get("ชื่อสินค้า") || row.get("name") || "").trim();
        const isInventoryRaw = (row.get("is_inventory") || "").toString().trim().toUpperCase();
        const isInventory =
          isInventoryRaw === "TRUE" || isInventoryRaw === "1" || isInventoryRaw === "YES";
        return {
          key: getKey(String(sku).trim(), name),
          sku_code: String(sku).trim(),
          name,
          isInventory,
        };
      })
      .filter((item) => item.key && item.isInventory);

    const items = productRecords
      .map((product) => {
        const acc = perSku.get(product.key) || emptyAccumulator();
        const soldInSession = soldBySku.get(product.key)?.qty || 0;
        const soldToday = soldTodayBySku.get(product.key) || 0;
        const warehouseBalance =
          acc.warehouseBeforeSession +
          acc.receivedToWarehouse -
          acc.movedToStorefront +
          acc.returnedToWarehouse;
        const storefrontBalance =
          acc.movedToStorefront - acc.returnedToWarehouse - soldInSession;
        const storefrontExpected = storefrontBalance;
        const storefrontActual = acc.storefrontCountLatest;
        const storefrontDiff =
          acc.storefrontCountTimestamp ? storefrontActual - storefrontExpected : 0;

        return {
          sku_code: product.sku_code || product.key,
          name: product.name,
          warehouseOpening: acc.warehouseBeforeSession,
          receivedToWarehouse: acc.receivedToWarehouse,
          movedToStorefront: acc.movedToStorefront,
          returnedToWarehouse: acc.returnedToWarehouse,
          warehouseBalance,
          storefrontBalance,
          soldToday,
          soldInSession,
          storefrontExpected,
          storefrontActual,
          storefrontDiff,
        };
      })
      .filter(
        (item) =>
          item.warehouseOpening !== 0 ||
          item.receivedToWarehouse !== 0 ||
          item.movedToStorefront !== 0 ||
          item.returnedToWarehouse !== 0 ||
          item.warehouseBalance !== 0 ||
          item.storefrontBalance !== 0 ||
          item.soldToday !== 0 ||
          item.soldInSession !== 0 ||
          item.storefrontActual !== 0,
      )
      .sort((a, b) => b.storefrontBalance - a.storefrontBalance);

    const totals = items.reduce(
      (acc, item) => {
        acc.warehouseOpening += item.warehouseOpening;
        acc.receivedToWarehouse += item.receivedToWarehouse;
        acc.movedToStorefront += item.movedToStorefront;
        acc.returnedToWarehouse += item.returnedToWarehouse;
        acc.warehouseBalance += item.warehouseBalance;
        acc.storefrontBalance += item.storefrontBalance;
        acc.soldToday += item.soldToday;
        acc.soldInSession += item.soldInSession;
        acc.storefrontExpected += item.storefrontExpected;
        acc.storefrontActual += item.storefrontActual;
        acc.storefrontDiff += item.storefrontDiff;
        return acc;
      },
      {
        warehouseOpening: 0,
        receivedToWarehouse: 0,
        movedToStorefront: 0,
        returnedToWarehouse: 0,
        warehouseBalance: 0,
        storefrontBalance: 0,
        soldToday: 0,
        soldInSession: 0,
        storefrontExpected: 0,
        storefrontActual: 0,
        storefrontDiff: 0,
      },
    );

    return NextResponse.json({
      success: true,
      session: activeSession,
      generatedAt: new Date().toISOString(),
      items,
      totals,
      movements: sessionMovements,
      today: getTodayDateStr(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
