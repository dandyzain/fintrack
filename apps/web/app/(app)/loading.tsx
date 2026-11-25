import { PageSkeleton } from "@/components/layout/app-shell";

/** Shown while a page's server data loads (navigation stays instant). */
export default function Loading() {
  return <PageSkeleton />;
}
