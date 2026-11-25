import type { Metadata } from "next";
import { RecurringPage } from "@/components/recurring/recurring-page";

export const metadata: Metadata = { title: "Recurring" };

export default function Page() {
  return <RecurringPage />;
}
