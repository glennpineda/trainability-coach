/* How a client's name and Studio's dates read on Coach's screens. Studio sends
   dates as YYYY-MM-DD with no time, so they are read as a day here, never
   shifted by the device's time zone. */

export const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ") || "Unnamed client";

export const clientInitials = (c) =>
  ((c.firstName?.[0] || "") + (c.lastName?.[0] || "")).toUpperCase() || "?";

function asDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/* "3 October", or "3 October 2025" when asked for the year or it is not this
   year's. */
export function longDate(iso, withYear = false) {
  const d = asDay(iso);
  if (!d) return "";
  const year = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}) });
}

/* "12 March (age 34)". */
export function birthday(iso) {
  const d = asDay(iso);
  if (!d) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  const day = d.toLocaleDateString(undefined, { day: "numeric", month: "long" });
  return age > 0 && age < 120 ? `${day} (age ${age})` : day;
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
