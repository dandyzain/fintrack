import type { Metadata } from "next";
import { BudgetsPage } from "@/components/budgets/budgets-page";

export const metadata: Metadata = { title: "Budgets" };

export default function Page() {
  return <BudgetsPage />;
}
