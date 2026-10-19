/**
 * A Date as "YYYY-MM-DD", read off the local clock (Studio's src/lib/date.js).
 *
 * Not toISOString(), which converts to UTC first and so answers with a
 * different day for most of the world for part of every day: in California
 * after 5 pm it is already tomorrow, and east of UTC in the morning it is
 * still yesterday (Run 1, A-2). Every date a trainer picks is a wall-clock
 * date, so it is written the way the device reads it.
 */
export function isoDate(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayIso() { return isoDate(new Date()); }

/**
 * Whether "YYYY-MM-DD" is a day the calendar has. Date.parse rolls 30
 * February over to 2 March rather than refusing it (Run 1, A-7), so the day
 * is written back out and compared.
 */
export function isRealDay(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === iso;
}

/** A moment as its day, "Oct 19, 2026", the way the rest of Coach writes a
    date (Run 1, B-19): not the browser's "10/19/2026". */
export function fmtDay(at) {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
