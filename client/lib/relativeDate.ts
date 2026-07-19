/**
 * relativeDate — sliding-window date helpers for demo data
 *
 * This app's seed data used to anchor "today" to a fixed calendar date
 * (e.g. `new Date(2026, 5, 14)`), so every due date, created date, and
 * chart label was really just "N days from June 14, 2026." That reads
 * fine on the day it was written and increasingly stale after — the
 * whole demo starts looking like it's stuck in the past the moment the
 * real calendar moves on.
 *
 * These helpers anchor to the real `new Date()` instead, so any date
 * built from an offset ("due in 2 days," "created 5 days ago," "last
 * week's call log") always reads as current relative to whenever the
 * demo is actually being run — a sliding window, not a fixed point.
 *
 * Use these for anything that should track "today." Do not use them for
 * dates that are meant to represent a specific fixed historical record
 * (e.g. a sample case's original open date) — those are fine as literals.
 */

const SHORT_DATE: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
const SHORT_DATE_NO_YEAR: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

/** Real "now" shifted by `offsetDays` days (negative = past, positive = future). */
export function dateFromToday(offsetDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
}

/** Real "now" shifted by `offsetMonths` months. */
export function monthsFromToday(offsetMonths: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d;
}

/** Formats a Date as "Jun 14, 2026" — the format used throughout the app. */
export function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", SHORT_DATE);
}

/** Formats a Date as "Jun 14" (no year) — used for compact chart axis labels. */
export function formatShortDateNoYear(d: Date): string {
  return d.toLocaleDateString("en-US", SHORT_DATE_NO_YEAR);
}

/** Real "now" shifted by `offsetDays` days, formatted like "Jun 14, 2026". */
export function daysFromToday(offsetDays: number): string {
  return formatShortDate(dateFromToday(offsetDays));
}

/** Real "now" shifted by `offsetMonths` months, formatted like "Jun 14, 2026". */
export function monthsFromTodayLabel(offsetMonths: number): string {
  return formatShortDate(monthsFromToday(offsetMonths));
}

/** `count` dates evenly spaced between `from` and `to` (inclusive of both ends). */
export function interpolateDates(from: Date, to: Date, count: number): Date[] {
  const fromTime = from.getTime();
  const toTime = to.getTime();
  const step = count > 1 ? (toTime - fromTime) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => new Date(fromTime + step * i));
}
