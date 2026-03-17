import { parseISO, format, isValid } from "date-fns";

/**
 * Safely format a date string returned from the API.
 *
 * Uses date-fns parseISO so that date-only strings like "2026-03-17" are parsed
 * as local midnight rather than UTC midnight, avoiding the off-by-one-day bug
 * that bare `new Date("2026-03-17")` causes in UTC-behind timezones.
 *
 * Returns "—" for null, undefined, or unparseable values.
 */
export function safeFormat(
  dateStr: string | null | undefined,
  fmt: string
): string {
  if (!dateStr) return "—";
  const d = parseISO(dateStr);
  return isValid(d) ? format(d, fmt) : "—";
}
