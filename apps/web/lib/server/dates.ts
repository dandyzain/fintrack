/** Interprets "YYYY-MM-DD" as that calendar day (midnight UTC); full ISO strings keep their instant. */
export function parseDateInput(v: string | Date): Date {
  if (v instanceof Date) return v;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : new Date(v);
}
