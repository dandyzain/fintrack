import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "FinTrack AI — Personal finance with AI receipt scanning" },
  description:
    "Scan receipts with AI, track every pocket, set budgets, automate recurring payments and see 12-month reports. Try the private demo without signing up.",
  openGraph: {
    title: "FinTrack AI",
    description: "Personal finance with AI receipt scanning, budgets, recurring payments and reports.",
    type: "website",
  },
};

export default function Page() {
  return <LandingPage />;
}
