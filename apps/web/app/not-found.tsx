"use client";

import { useLanguage } from "@/context/language-context";
import { StatusPage } from "@/components/layout/status-page";

export default function NotFound() {
  const { t } = useLanguage();
  return <StatusPage code="404" title={t.system.notFoundTitle} description={t.system.notFoundDesc} />;
}
