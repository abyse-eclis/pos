import { AppShell } from "@/components/AppShell";
import { StockWorkspace } from "@/components/stock/StockWorkspace";

export default function StockStorefrontPage() {
  return (
    <AppShell
      title="สต๊อก"
      subtitle="หน้าร้าน"
    >
      <StockWorkspace mode="storefront" />
    </AppShell>
  );
}
