import { redirect } from "next/navigation";

export default function WithdrawLegacyPage() {
  redirect("/stock/storefront");
}
