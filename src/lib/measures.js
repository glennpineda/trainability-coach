/**
 * A client's body measurements (Glenn, 18 Oct 2026: measurements, "Usual set,
 * left and right"): what is taken, in what, and how it reads in a trainer's
 * own units. Shared by the page and the server, as units.js is. Pure.
 *
 * Kept in metric (kg and cm) to two decimal places, so what was typed in
 * pounds or inches comes back as typed, and shown in the trainer's units
 * (Imperial: lb and inches): to one decimal place, but inches to the
 * nearest quarter, as a tape reads them. Each is optional: a trainer fills in only what
 * they took that day.
 */

/* key, its words, whether it is a weight, a length or a percentage, and the
   range a real person's falls in (in metric), for catching a slip. */
export const MEASURES = [
  { key: "weight", label: "Weight", kind: "mass", min: 20, max: 400 },
  { key: "bodyFat", label: "Body fat", kind: "percent", min: 2, max: 75 },
  { key: "neck", label: "Neck", kind: "length", min: 15, max: 80 },
  { key: "chest", label: "Chest", kind: "length", min: 40, max: 250 },
  { key: "waist", label: "Waist", kind: "length", min: 40, max: 250 },
  { key: "hips", label: "Hips", kind: "length", min: 40, max: 250 },
  { key: "armL", label: "Arm, left", kind: "length", min: 10, max: 90, pair: "Arm" },
  { key: "armR", label: "Arm, right", kind: "length", min: 10, max: 90, pair: "Arm" },
  { key: "thighL", label: "Thigh, left", kind: "length", min: 20, max: 150, pair: "Thigh" },
  { key: "thighR", label: "Thigh, right", kind: "length", min: 20, max: 150, pair: "Thigh" },
  { key: "calfL", label: "Calf, left", kind: "length", min: 15, max: 90, pair: "Calf" },
  { key: "calfR", label: "Calf, right", kind: "length", min: 15, max: 90, pair: "Calf" },
];
export const MEASURE_KEYS = MEASURES.map(m => m.key);

const LB_PER_KG = 2.20462262;
const IN_PER_CM = 0.39370079;
const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;


/** The unit a measure is shown in, for these units. */
export function unitOf(measure, units) {
  if (measure.kind === "percent") return "%";
  if (measure.kind === "mass") return units === "metric" ? "kg" : "lb";
  return units === "metric" ? "cm" : "in";
}

/** A stored (metric) value as the trainer reads it: a number to one decimal. */
export function toShown(measure, value, units) {
  if (value == null) return null;
  if (units === "metric" || measure.kind === "percent") return round(value, 1);
  if (measure.kind === "mass") return round(value * LB_PER_KG, 1);
  /* Inches to the nearest quarter, as a tape reads them. */
  return Math.round(value * IN_PER_CM * 4) / 4;
}

/** What the trainer typed, in their units, as it is kept (metric). */
export function fromShown(measure, value, units) {
  if (value == null) return null;
  if (units === "metric" || measure.kind === "percent") return round(value, 2);
  return round(value / (measure.kind === "mass" ? LB_PER_KG : IN_PER_CM), 2);
}

/** "82.4 kg", "34.5 in", "18.2 %" */
export function shownText(measure, value, units) {
  const v = toShown(measure, value, units);
  if (v == null) return "";
  const u = unitOf(measure, units);
  return u === "%" ? `${v}%` : `${v} ${u}`;
}
