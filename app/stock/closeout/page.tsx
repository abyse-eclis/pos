import { AppShell } from "@/components/AppShell";
import { StockWorkspace } from "@/components/stock/StockWorkspace";

export default function StockCloseoutPage() {
  return (
    <AppShell
      title="สต๊อก"
      subtitle="ปิดรอบ"
    >
      <StockWorkspace mode="closeout" />
    </AppShell>
  );
}
