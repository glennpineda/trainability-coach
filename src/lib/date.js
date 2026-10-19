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
