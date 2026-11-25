"use client";

import { useTheme } from "next-themes";

/**
 * Report series colours: blue = income, orange = spending. Validated with the
 * dataviz palette checker against both chart surfaces (CVD ΔE ≈ 27, normal
 * vision ΔE ≈ 34). Light orange is under 3:1 on white, so the chart always
 * ships with a legend, tooltips and the monthly table.
 */
export const REPORT_COLORS = {
  light: { income: "#257de0", expense: "#f47230", grid: "#E6E9F1", tick: "#646B82", cursor: "rgba(100,107,130,0.10)" },
  dark: { income: "#338ced", expense: "#e76624", grid: "#212940", tick: "#868FA9", cursor: "rgba(134,143,169,0.12)" },
};

export function useReportColors() {
  const { resolvedTheme } = useTheme();
  return REPORT_COLORS[resolvedTheme === "dark" ? "dark" : "light"];
}
