/**
 * A client's body measurements (Glenn, 18 Oct 2026: measurements, "Usual set,
 * left and right", then "shoulder to the measurements too, and waist to hip
 * ratio, heart rate (optional), blood pressure (optional)"): what is taken,
 * in what, and how it reads in a trainer's own units. Shared by the page and
 * the server, as units.js is. Pure.
 *
 * Kept in metric (kg and cm) to two decimal places, so what was typed in
 * pounds or inches comes back as typed, and shown in the trainer's units
 * (Imperial: lb and inches): to one decimal place, but inches to the
 * nearest quarter, as a tape reads them. Heart rate (bpm) and blood pressure
 * (mmHg) are the same in either, in whole numbers. Each is optional: a
 * trainer fills in only what they took that day. The waist-to-hip ratio is
 * worked out from the waist and hips, never typed.
 */

/* key, its words, its kind (mass, percent, length, rate, pressure), the range
   a real person's falls in (in metric), for catching a slip, and for a pair
   the group and the side's word. */
export const MEASURES = [
  /* Height (Run 1, I-12; Glenn, 19 Oct 2026: "Height, BMI, body fat"): taken
     once in a while; a set without it uses the last one taken (heightBy). */
  { key: "height", label: "Height", kind: "length", min: 100, max: 250 },
  { key: "weight", label: "Weight", kind: "mass", min: 20, max: 400 },
  { key: "bodyFat", label: "Body fat", kind: "percent", min: 2, max: 75 },
  { key: "neck", label: "Neck", kind: "length", min: 15, max: 80 },
  { key: "shoulders", label: "Shoulders", kind: "length", min: 60, max: 200 },
  { key: "chest", label: "Chest", kind: "length", min: 40, max: 250 },
  { key: "waist", label: "Waist", kind: "length", min: 40, max: 250 },
  { key: "hips", label: "Hips", kind: "length", min: 40, max: 250 },
  { key: "armL", label: "Arm, left", kind: "length", min: 10, max: 90, pair: "Arm", side: "Left" },
  { key: "armR", label: "Arm, right", kind: "length", min: 10, max: 90, pair: "Arm", side: "Right" },
  { key: "thighL", label: "Thigh, left", kind: "length", min: 20, max: 150, pair: "Thigh", side: "Left" },
  { key: "thighR", label: "Thigh, right", kind: "length", min: 20, max: 150, pair: "Thigh", side: "Right" },
  { key: "calfL", label: "Calf, left", kind: "length", min: 15, max: 90, pair: "Calf", side: "Left" },
  { key: "calfR", label: "Calf, right", kind: "length", min: 15, max: 90, pair: "Calf", side: "Right" },
  { key: "heartRate", label: "Resting heart rate", kind: "rate", min: 25, max: 220 },
  { key: "bpSys", label: "Blood pressure, top", kind: "pressure", min: 60, max: 260, pair: "Blood pressure", side: "Top (systolic)" },
  { key: "bpDia", label: "Blood pressure, bottom", kind: "pressure", min: 30, max: 160, pair: "Blood pressure", side: "Bottom (diastolic)" },
];
export const MEASURE_KEYS = MEASURES.map(m => m.key);
const BY_KEY = Object.fromEntries(MEASURES.map(m => [m.key, m]));

const LB_PER_KG = 2.20462262;
const IN_PER_CM = 0.39370079;
const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;
const whole = (kind) => kind === "rate" || kind === "pressure";

/** The unit a measure is shown in, for these units. */
export function unitOf(measure, units) {
  if (measure.kind === "percent") return "%";
  if (measure.kind === "rate") return "bpm";
  if (measure.kind === "pressure") return "mmHg";
  if (measure.kind === "mass") return units === "metric" ? "kg" : "lb";
  return units === "metric" ? "cm" : "in";
}

/** A stored (metric) value as the trainer reads it. */
export function toShown(measure, value, units) {
  if (value == null) return null;
  if (whole(measure.kind)) return Math.round(value);
  if (units === "metric" || measure.kind === "percent") return round(value, 1);
  if (measure.kind === "mass") return round(value * LB_PER_KG, 1);
  /* Inches to the nearest quarter, as a tape reads them. */
  return Math.round(value * IN_PER_CM * 4) / 4;
}

/** What the trainer typed, in their units, as it is kept (metric). */
export function fromShown(measure, value, units) {
  if (value == null) return null;
  if (whole(measure.kind)) return Math.round(value);
  if (units === "metric" || measure.kind === "percent") return round(value, 2);
  return round(value / (measure.kind === "mass" ? LB_PER_KG : IN_PER_CM), 2);
}

/**
 * What a box sends when saved: what was typed, except that a box still
 * showing a kept value as it was filled in sends that value unrounded, so
 * saving changes nothing the trainer didn't (Run 1, A-3). Shown rounded (lb to
 * 0.1, inches to a quarter) and read back, 80.3 kg became 80.29.
 */
export function exactIfSame(text, value, measure, units) {
  if (value == null || String(text).trim() !== String(toShown(measure, value, units) ?? "")) return text;
  if (whole(measure.kind) || units === "metric" || measure.kind === "percent") return String(value);
  return String(value * (measure.kind === "mass" ? LB_PER_KG : IN_PER_CM));
}

/** "82.4 kg", "34.5 in", "18.2%", "62 bpm" */
export function shownText(measure, value, units) {
  const v = toShown(measure, value, units);
  if (v == null) return "";
  const u = unitOf(measure, units);
  return u === "%" ? `${v}%` : `${v} ${u}`;
}

/** Waist divided by hips, to two places, where both were taken. */
export function waistToHip(values) {
  const w = values?.waist, h = values?.hips;
  return w != null && h ? round(w / h, 2) : null;
}

/**
 * Body mass index: kg over metres squared, to one place, where there is a
 * weight and a height.
 */
export function bmiOf(values, heightCm) {
  const w = values?.weight, h = values?.height ?? heightCm;
  return w != null && h ? round(w / (h / 100) ** 2, 1) : null;
}

/**
 * The US Navy's body-fat estimate (Hodgdon and Beckett, 1984), metric:
 * men 495 / (1.0324 − 0.19077 log10(waist − neck) + 0.15456 log10(height)) − 450;
 * women 495 / (1.29579 − 0.35004 log10(waist + hips − neck) + 0.22100 log10(height)) − 450.
 * A percentage to one place, or null without the tape measures, a height or
 * the client's sex, or where the numbers make no sense.
 */
export function navyBodyFat(values, heightCm, sex) {
  const h = values?.height ?? heightCm, n = values?.neck, w = values?.waist, hip = values?.hips;
  if (!h || n == null || w == null) return null;
  let v;
  if (sex === "male" && w > n) v = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
  else if (sex === "female" && hip != null && w + hip > n) v = 495 / (1.29579 - 0.35004 * Math.log10(w + hip - n) + 0.221 * Math.log10(h)) - 450;
  else return null;
  return v > 2 && v < 75 ? round(v, 1) : null;
}

/** Each set's height, its own or the last one taken before it: sets newest first. */
export function heightBy(sets) {
  const out = new Map();
  let h = null;
  for (const s of [...sets].reverse()) { if (s.values?.height != null) h = s.values.height; out.set(s.id, h); }
  return out;
}

/* "−3.1 lb", "+0.25 in", "no change". */
function difference(d, unit) {
  if (!d) return "no change";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}${!unit ? "" : unit === "%" ? "%" : ` ${unit}`}`;
}

/**
 * One set as rows to show, in order: `{ key, label, text, change }`, with
 * the waist-to-hip ratio after the hips and blood pressure as one row
 * ("120/80 mmHg"). `change` is against `previous` where it had the same
 * measurement, else null. For the client's details, a message's card and
 * the printed sheet alike.
 */
export function rowsOf(values, previous, units, { heightCm = null, previousHeightCm = null, sex = null } = {}) {
  const rows = [];
  const before = previous || null;
  for (const m of MEASURES) {
    if (m.key === "bpSys" || m.key === "bpDia") continue;
    const v = values?.[m.key];
    if (v != null) {
      const p = before?.[m.key];
      const d = p == null ? null : round(toShown(m, v, units) - toShown(m, p, units), 2);
      rows.push({ key: m.key, label: m.label, text: shownText(m, v, units), change: d == null ? null : difference(d, unitOf(m, units)) });
    }
    /* Worked out, never typed (Run 1, I-12): BMI after the weight, and the
       Navy's body-fat estimate after the body fat, with the height carried
       from an earlier set when this one has none. */
    if (m.key === "weight") {
      const b = bmiOf(values, heightCm), pb = bmiOf(before, previousHeightCm ?? heightCm);
      if (b != null) rows.push({ key: "bmi", label: "BMI", text: String(b), change: pb == null ? null : difference(round(b - pb, 1), "") });
    }
    if (m.key === "bodyFat") {
      const f = navyBodyFat(values, heightCm, sex), pf = navyBodyFat(before, previousHeightCm ?? heightCm, sex);
      if (f != null) rows.push({ key: "navyFat", label: "Body fat, Navy estimate", text: `${f}%`, change: pf == null ? null : difference(round(f - pf, 1), "%") });
    }
    if (m.key === "hips") {
      const r = waistToHip(values);
      if (r != null) {
        const p = waistToHip(before);
        rows.push({ key: "waistToHip", label: "Waist to hip", text: r.toFixed(2), change: p == null ? null : difference(round(r - p, 2), "") });
      }
    }
  }
  const sys = values?.bpSys, dia = values?.bpDia;
  if (sys != null && dia != null) {
    const ps = before?.bpSys, pd = before?.bpDia;
    const change = ps == null || pd == null ? null
      : (Math.round(sys) === Math.round(ps) && Math.round(dia) === Math.round(pd)) ? "no change"
      : `${difference(Math.round(sys) - Math.round(ps), "")}/${difference(Math.round(dia) - Math.round(pd), "")} mmHg`.replace(/no change/g, "0");
    rows.push({ key: "bp", label: "Blood pressure", text: `${Math.round(sys)}/${Math.round(dia)} mmHg`, change });
  }
  return rows;
}

export const measureOf = (key) => BY_KEY[key];

/** The set a change is counted from: the newest taken on an earlier day
    (`list` newest first), so two sets on one day aren't compared. */
export const previousOf = (list, set) => list.find(m => m.takenOn < set.takenOn) || null;

/**
 * Whether a client's measurements are due: never taken, or last taken at
 * least `weeks` weeks ago (the trainer's setting; 0 is off). The Clients
 * list, its Due filter, Home and Today all ask it (Run 1, I-1, I-2).
 */
export function measurementsDue(c, weeks) {
  if (!weeks || !c || c.archived) return false;
  if (!c.lastMeasuredOn) return true;
  const days = (Date.now() - Date.parse(`${c.lastMeasuredOn}T00:00:00`)) / 864e5;
  return days >= weeks * 7;
}
