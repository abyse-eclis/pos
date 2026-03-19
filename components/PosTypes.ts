export interface Product {
  sku_code: string;
  name: string;
  price: number;
  cost?: number;
  image: string;
  category: string;
  is_active?: boolean;
  consumable_id?: string;
  packs_per_crate?: number; // e.g. 20 packs in 1 crate
  pieces_per_pack?: number; // e.g. 50 pieces in 1 pack
  conversion_rate?: number; // Fallback or direct pieces per unit
  is_inventory?: boolean; // true = physical item you withdraw from warehouse
}

export interface CartItem extends Product {
  qty: number;
}

export interface SummaryItem {
  sku_code: string;
  name: string;
  qty: number;
  revenue: number;
  price: number;
}

export interface BillDetail {
  billId: string;
  time: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
}

export interface StockSummaryItem {
  sku_code: string;
  name: string;
  start_bal: number;
  withdraw: number;
  withdraw_pack: number;
  withdraw_crate: number;
  split_pack: number;
  split_crate: number;
  sold: number;
  shouldRemain: number;
  actual: number;
  diff: number;
  remainPacks: number;
  remainCrates: number;
}

export interface StockSession {
  session_id: string;
  label: string;
  started_at: string;
  closed_at: string;
  status: "open" | "closed";
}

export interface StockMovement {
  movement_id: string;
  session_id: string;
  timestamp: string;
  date: string;
  sku_code: string;
  name: string;
  movement_type:
    | "receive_to_warehouse"
    | "move_to_storefront"
    | "return_to_warehouse"
    | "storefront_count";
  qty_piece: number;
  note: string;
}

export interface StockOverviewItem {
  sku_code: string;
  name: string;
  warehouseOpening: number;
  receivedToWarehouse: number;
  movedToStorefront: number;
  returnedToWarehouse: number;
  warehouseBalance: number;
  storefrontBalance: number;
  soldToday: number;
  soldInSession: number;
  storefrontExpected: number;
  storefrontActual: number;
  storefrontDiff: number;
}

export interface StockSessionSummaryItem {
  sku_code: string;
  name: string;
  withdrawn: number;
  sold: number;
  expected: number;
  counted: number;
  diff: number;
}

export interface StockOverviewData {
  session: StockSession | null;
  generatedAt: string;
  items: StockOverviewItem[];
  sessionSummary: StockSessionSummaryItem[];
  totals: {
    warehouseOpening: number;
    receivedToWarehouse: number;
    movedToStorefront: number;
    returnedToWarehouse: number;
    warehouseBalance: number;
    storefrontBalance: number;
    soldToday: number;
    soldInSession: number;
    storefrontExpected: number;
    storefrontActual: number;
    storefrontDiff: number;
  };
  sessionSummaryTotals: {
    totalWithdrawn: number;
    totalSold: number;
    totalExpected: number;
    totalCounted: number;
    totalDiff: number;
  };
  movements: StockMovement[];
}

export interface DailySummaryData {
  date: string;
  totalBills: number;
  totalRevenue: number;
  totalCash: number;
  totalTransfer: number;
  totalItems: number;
  items: SummaryItem[];
  bills: BillDetail[];
  stockItems: StockSummaryItem[];
  stockTotals: {
    totalProducts: number;
    countedProducts: number;
    totalSold: number;
    totalShouldRemain: number;
    totalActual: number;
    totalDiff: number;
    shortageCount: number;
    overCount: number;
  };
}
