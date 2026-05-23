/**
 * Philippine Timezone Utilities (Asia/Manila — UTC+8)
 * All date comparisons in Spendie use PH time so transactions are
 * always bucketed into the correct day/month for Filipino users.
 */

const TZ = 'Asia/Manila';

/**
 * Return the current moment expressed in PH timezone as a plain JS Date.
 * (The returned Date object's getMonth / getFullYear / getDate values
 *  reflect Philippine local time.)
 */
export function getPHNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Parse an ISO timestamp (from Supabase) and return a Date object whose
 * local-time accessors (.getMonth, .getFullYear, .getDate) reflect PH time.
 */
export function toPHDate(isoString) {
  if (!isoString) return new Date();
  return new Date(new Date(isoString).toLocaleString('en-US', { timeZone: TZ }));
}

/**
 * Return { month: 0-11, year: YYYY } for the given ISO timestamp in PH time.
 */
export function getPHMonthYear(isoString) {
  const d = toPHDate(isoString);
  return { month: d.getMonth(), year: d.getFullYear() };
}

/**
 * Return today's date string (YYYY-MM-DD) in PH timezone.
 */
export function getPHDateString() {
  const d = getPHNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Return a human-readable date string in PH time.
 * e.g. "May 23, 2026"
 */
export function formatPHDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-PH', {
    timeZone: TZ,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Return an ISO timestamp representing "now" in PH timezone stored as UTC.
 * Use this when you need to explicitly set created_at.
 */
export function getPHNowISO() {
  return new Date().toISOString(); // Supabase stores in UTC; JS converts to PH on read
}

/**
 * Check if two PH-local dates fall in the same month/year.
 */
export function isSamePHMonth(isoString, month, year) {
  const { month: m, year: y } = getPHMonthYear(isoString);
  return m === month && y === year;
}

/**
 * Get the day-of-week (0=Sun … 6=Sat) in PH time.
 */
export function getPHDayOfWeek(isoString) {
  return toPHDate(isoString).getDay();
}

/**
 * Get the hour (0–23) in PH time.
 */
export function getPHHour(isoString) {
  return toPHDate(isoString).getHours();
}

/**
 * Format a time string (e.g. "09:41 AM") always in PH timezone,
 * regardless of the device's local timezone.
 * Safe for web and native.
 */
export function formatPHTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-PH', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Return a "YYYY-MM-DD" date string in PH timezone for a given ISO timestamp.
 * Useful for grouping transactions by PH day.
 */
export function toPHDateKey(isoString) {
  const d = toPHDate(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
