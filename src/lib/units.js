/**
 * Weights and distances in each trainer's own units (Glenn, 17 Oct 2026: "the
 * books recommend in imperial and kg … let's have a setting where we can
 * change this. Let's try to round up numbers"). His answers: imperial by
 * default, each trainer choosing their own, only their unit shown (never both),
 * rounded to the steps a gym actually has.
 *
 * Shared by the page (Coach IQ's principles and a book's proposals, drawn in
 * the reader's units) and the server (what Billy reads, in the units of the
 * trainer he is talking to). Pure: no imports, nothing changed in place.
 *
 *   convertText("Carry 20 kg for 30 m", "imperial") → "Carry 45 lb for 35 yd"
 *
 * Only numbers written with a unit are touched; a percentage, "1 in 3" or a
 * number of reps never is. A unit already in the reader's system is left as
 * written.
 */

export const UNITS = ["imperial", "metric"];
export const DEFAULT_UNITS = "imperial";
export const UNIT_LABELS = { imperial: "Imperial (lb, ft, yd, mi)", metric: "Metric (kg, cm, m, km)" };

/* Each unit: its system, what it becomes in the other, and the factor. */
const KINDS = {
  lb: { system: "imperial", to: "kg", factor: 0.45359237 },
  kg: { system: "metric", to: "lb", factor: 2.20462262 },
  yd: { system: "imperial", to: "m", factor: 0.9144 },
  m: { system: "metric", to: "yd", factor: 1.0936133 },
  ft: { system: "imperial", to: "cm", factor: 30.48 },
  in: { system: "imperial", to: "cm", factor: 2.54 },
  cm: { system: "metric", to: "in", factor: 0.39370079 },
  mi: { system: "imperial", to: "km", factor: 1.609344 },
  km: { system: "metric", to: "mi", factor: 0.62137119 },
};

/* The words a unit may be written as. Bare "in" is left out on purpose: "1 in
   3" is a ratio, so inches are only read as "inch" or "inches". */
const SPELLINGS = {
  lb: ["lbs", "lb", "pounds", "pound"],
  kg: ["kgs", "kg", "kilograms", "kilogram", "kilos", "kilo"],
  yd: ["yds", "yd", "yards", "yard"],
  m: ["metres", "metre", "meters", "meter", "m"],
  ft: ["feet", "foot", "ft"],
  in: ["inches", "inch"],
  cm: ["centimetres", "centimetre", "centimeters", "centimeter", "cm"],
  mi: ["miles", "mile", "mi"],
  km: ["kilometres", "kilometre", "kilometers", "kilometer", "km"],
};
const UNIT_OF = Object.fromEntries(Object.entries(SPELLINGS).flatMap(([u, words]) => words.map(w => [w, u])));
const WORDS = Object.keys(UNIT_OF).sort((a, b) => b.length - a.length).join("|");
const NUMBER = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;
const QUANTITY = new RegExp(String.raw`(?<![\w.])(${NUMBER})(?:(\s?(?:–|-|to)\s?)(${NUMBER}))?(\s?)(${WORDS})(?![\w])`, "gi");

/* The step a gym has, for an amount in a unit: plates and dumbbells come in
   5 lb and 2.5 kg, small ones in 1; distances in tidy numbers. */
function step(unit, value) {
  if (unit === "lb") return value < 10 ? 1 : 5;
  if (unit === "kg") return value < 10 ? 1 : 2.5;
  if (unit === "m" || unit === "yd") return value < 10 ? 1 : value < 100 ? 5 : 10;
  if (unit === "km" || unit === "mi") return value < 10 ? 0.5 : 1;
  return 1;   // cm, in, ft
}

/** An amount rounded to its unit's gym step. */
export function roundTo(unit, value) {
  const s = step(unit, Math.abs(value));
  const out = Math.round(value / s) * s;
  return Number(out.toFixed(2));
}

/* A short length reads better in centimetres (up to 3 m) or feet (under
   5 m, or 3 ft and over from centimetres); a longer one in metres or yards. */
function target(unit, value) {
  const kind = KINDS[unit];
  if (unit === "ft" || unit === "in") {
    const cm = value * kind.factor;
    return cm >= 300 ? { unit: "m", value: cm / 100 } : { unit: "cm", value: cm };
  }
  if (unit === "m" && value < 5) return { unit: "ft", value: value * 3.2808399 };
  if (unit === "cm") {
    const inches = value * kind.factor;
    return inches >= 36 ? { unit: "ft", value: inches / 12 } : { unit: "in", value: inches };
  }
  return { unit: kind.to, value: value * kind.factor };
}

const num = (s) => Number(String(s).replace(/,/g, ""));
const show = (n) => (Number.isInteger(n) ? n.toLocaleString("en-US") : String(n));

/** Text with every weight and distance in `system`, rounded to gym steps. */
export function convertText(text, system = DEFAULT_UNITS) {
  if (!text || !UNITS.includes(system)) return text;
  return String(text).replace(QUANTITY, (all, a, dash, b, space, word) => {
    const unit = UNIT_OF[word.toLowerCase()];
    const kind = KINDS[unit];
    if (!kind || kind.system === system) return all;
    const first = target(unit, num(a));
    const to = first.unit;
    const one = roundTo(to, first.value);
    if (b === undefined) return `${show(one)}${space || " "}${to}`;
    const factor = first.value / num(a);
    const two = roundTo(to, num(b) * factor);
    return `${show(one)}${dash}${show(two)}${space || " "}${to}`;
  });
}
