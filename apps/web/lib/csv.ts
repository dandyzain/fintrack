/**
 * One CSV cell. Text that a spreadsheet would treat as a formula (=, +, -, @,
 * tab, CR) is prefixed with an apostrophe, so a merchant name read from a
 * receipt can't run a formula when the file is opened (CSV injection).
 * Numbers are written as-is.
 */
export function csvCell(value: unknown): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
