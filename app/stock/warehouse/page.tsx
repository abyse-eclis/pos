import { AppShell } from "@/components/AppShell";
import { StockWorkspace } from "@/components/stock/StockWorkspace";

export default function StockWarehousePage() {
  return (
    <AppShell
      title="สต๊อก"
      subtitle="คลังร้าน"
    >
      <StockWorkspace mode="warehouse" />
    </AppShell>
  );
}
