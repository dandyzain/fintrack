import type { Language } from "@/lib/i18n/translations";

/**
 * Single source of truth for money, number and date formatting.
 * Rupiah always uses Indonesian digit grouping (1.250.000) in both languages,
 * which is the convention Indonesian users expect for "Rp".
 */

const idrGrouping = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export const localeOf = (lang: Language) => (lang === "id" ? "id-ID" : "en-US");

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export interface MoneyOptions {
  /** Prefix "+" / "−" based on sign or an explicit direction. */
  sign?: "auto" | "always" | "never";
  /** Short form: 1,2 jt / 1.2M */
  compact?: boolean;
  lang?: Language;
}

export function formatIDR(value: unknown, opts: MoneyOptions = {}): string {
  const { sign = "auto", compact = false, lang = "en" } = opts;
  const n = toNumber(value);
  const abs = Math.abs(Math.round(n));
  const body = compact ? formatCompact(abs, lang) : idrGrouping.format(abs);
  let prefix = "";
  if (sign === "always") prefix = n < 0 ? "−" : "+";
  else if (sign === "auto" && n < 0) prefix = "−";
  return `${prefix}Rp ${body}`;
}

export function formatCompact(value: number, lang: Language = "en"): string {
  const abs = Math.abs(value);
  const fmt = (v: number) =>
    new Intl.NumberFormat(localeOf(lang), { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v);
  if (abs >= 1_000_000_000) return `${fmt(value / 1_000_000_000)}${lang === "id" ? " M" : "B"}`;
  if (abs >= 1_000_000) return `${fmt(value / 1_000_000)}${lang === "id" ? " jt" : "M"}`;
  if (abs >= 1_000) return `${fmt(value / 1_000)}${lang === "id" ? " rb" : "K"}`;
  return fmt(value);
}

/** Digits-only grouping for editable amount inputs (no currency prefix). */
export function groupDigits(value: number | string): string {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return idrGrouping.format(Number(digits));
}

export function parseDigits(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatPercent(value: number, lang: Language = "en", fractionDigits = 0): string {
  return `${new Intl.NumberFormat(localeOf(lang), {
    maximumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatDate(
  value: string | Date,
  lang: Language,
  style: "short" | "medium" | "long" | "weekday" = "medium"
): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "long"
      ? { day: "numeric", month: "long", year: "numeric" }
      : style === "weekday"
      ? { weekday: "long", day: "numeric", month: "long" }
      : { day: "numeric", month: "short", year: "numeric" };
  return new Intl.DateTimeFormat(localeOf(lang), options).format(d);
}

export function formatMonth(month: number, year: number, lang: Language, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(localeOf(lang), { month: style, year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

/** YYYY-MM-DD in local time (for <input type="date"> and API date filters). */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalize loosely formatted receipt dates (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO)
 * into YYYY-MM-DD for date inputs. Returns "" if unparseable.
 */
export function normalizeDateInput(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw).trim();
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? "" : toDateInputValue(dt);
}

/** Percentage change between two values; null when the baseline is zero. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
