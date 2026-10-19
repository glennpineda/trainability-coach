/**
 * A phone number as somebody reads it: "(415) 299-5154" (Studio's
 * src/lib/people.js, formatPhone; Run 1, U-19).
 *
 * Stored however it was typed — "4152995154", "415-299-5154", or
 * "14152995154" with the country code. North American numbers are shaped;
 * anything else (a +44, an extension) is shown as it was entered.
 */
export function formatPhone(p) {
  const raw = String(p || "").trim();
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  if (d.length !== 10 || /[a-z]/i.test(raw) || (raw.startsWith("+") && !raw.startsWith("+1"))) return raw;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
