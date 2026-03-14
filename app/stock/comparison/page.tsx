import { AppShell } from "@/components/AppShell";
import { StockWorkspace } from "@/components/stock/StockWorkspace";

export default function StockComparisonPage() {
  return (
    <AppShell
      title="สต๊อก"
      subtitle="เปรียบเทียบ"
    >
      <StockWorkspace mode="comparison" />
    </AppShell>
  );
}
