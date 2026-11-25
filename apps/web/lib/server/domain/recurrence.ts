import type { RecurrenceFrequency } from "@fintrack/shared";

/**
 * Occurrence dates are always computed from the anchor (startDate), never from
 * the previous occurrence, so a rule on the 31st lands on Feb 28/29 and then
 * back on Mar 31 instead of drifting to the 28th forever.
 */

const DAY_MS = 86_400_000;

function daysInMonthUTC(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Normalises any date to midnight UTC of the same calendar day. */
export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function occurrenceDate(
  anchor: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  index: number
): Date {
  const a = startOfDayUTC(anchor);
  const steps = index * Math.max(1, interval);
  switch (frequency) {
    case "DAILY":
      return new Date(a.getTime() + steps * DAY_MS);
    case "WEEKLY":
      return new Date(a.getTime() + steps * 7 * DAY_MS);
    case "MONTHLY": {
      const total = a.getUTCMonth() + steps;
      const year = a.getUTCFullYear() + Math.floor(total / 12);
      const month = ((total % 12) + 12) % 12;
      return new Date(Date.UTC(year, month, Math.min(a.getUTCDate(), daysInMonthUTC(year, month))));
    }
    case "YEARLY": {
      const year = a.getUTCFullYear() + steps;
      const month = a.getUTCMonth();
      return new Date(Date.UTC(year, month, Math.min(a.getUTCDate(), daysInMonthUTC(year, month))));
    }
  }
}

/** The first occurrence on or after `from` (used when a rule is created with a past start date). */
export function firstOccurrenceOnOrAfter(
  anchor: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  from: Date
): { index: number; date: Date } {
  const target = startOfDayUTC(from).getTime();
  let index = 0;
  let date = occurrenceDate(anchor, frequency, interval, 0);
  // Bounded loop: at most a few thousand daily steps for very old anchors.
  while (date.getTime() < target && index < 50_000) {
    index++;
    date = occurrenceDate(anchor, frequency, interval, index);
  }
  return { index, date };
}

/** Max occurrences materialised in one pass, so a long-paused rule can't flood the ledger at once. */
export const MAX_CATCH_UP = 36;
