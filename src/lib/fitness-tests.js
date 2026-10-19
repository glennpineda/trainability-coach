/**
 * Cardiovascular fitness tests (Glenn, 18 Oct 2026, from Verywell Fit's
 * "Cardiovascular Fitness: How Do You Test It?", by Paige Waehner, CPT,
 * updated 22 May 2024, which he printed for us): what each test takes, how
 * its result is worked out, and how it is rated. Shared by the page and the
 * server. Pure.
 *
 * His choices: all three tests ("All three"); the Rockport walk's VO2 max by
 * the original study's formula, since the article only points to "a Rockport
 * 1-mile walk calculator"; the step test's tables read with their gaps filled
 * downwards and one misprint fixed; and VO2 max shown as a number, the
 * article giving no ratings for it.
 *
 * Then strength (Glenn, 18 Oct 2026, from GymAware's "Muscular strength
 * tests to track fitness progress", by Loek Vossen, which he printed for us):
 * of its fifteen, the ones a trainer can take without a bar-speed sensor, and
 * velocity loss for one who has one ("1RM, Jumps, Muscular endurance"). The
 * article gives no ratings for any of them, so each is a number to follow
 * over time. The 1RM worked out from a lighter set uses Brzycki's formula, up
 * to 10 reps ("Brzycki, up to 10 reps"); the article's own way needs a sensor.
 * Both kinds sit in the one Fitness tests section, in two groups ("One
 * section, two groups").
 */

import { MEASURES, toShown, fromShown, unitOf } from "./measures.js";

export const TESTS = {
  step: {
    label: "3-minute step test",
    short: "Step test",
    how: "Step up and down a 12-inch step in time to a metronome for three minutes, then sit down and count the heart rate for one full minute, every beat. A heart rate monitor or app makes the count easy.",
    tip: "The YMCA's version of this test keeps the metronome at 96 beats a minute: up, up, down, down, 24 steps a minute.",
  },
  rockport: {
    label: "Rockport 1-mile walk",
    short: "Rockport walk",
    how: "Warm up, then walk one mile as fast as possible, on a treadmill or outside; a track is best, so the mile is exact. Note the time and the heart rate at the end.",
    tip: "VO2 max is worked out with the formula from the original Rockport study (Kline et al., 1987), from the time, the heart rate, the client's age, weight and sex.",
  },
  vo2: {
    label: "VO2 max from a lab or watch",
    short: "VO2 max",
    how: "A VO2 max from a lab or gym treadmill test (a graded exercise test, the Bruce protocol) or reported by a watch, such as a Garmin. Say where it came from.",
    tip: "",
  },
  onerm: {
    label: "1RM (one-repetition maximum)",
    short: "1RM",
    how: "The heaviest weight lifted once, with good form, in one exercise. Most coaches don't test it at full weight: a lighter set taken to failure, 10 reps or fewer, gives it closely and with less risk.",
    tip: "From a lighter set, the 1RM is worked out with Brzycki's formula: weight × 36 ÷ (37 − reps).",
  },
  jump: {
    label: "Vertical jump",
    short: "Jump",
    how: "From standing, dip quickly and jump as high as possible (a countermovement jump). Measure the height with a wall reach, a jump mat, a phone app or a sensor.",
    tip: "Hands on hips measures the legs alone; an arm swing jumps higher. Compare like with like.",
  },
  rsi: {
    label: "Drop jump (Reactive Strength Index)",
    short: "Drop jump",
    how: "Step off a box, land and jump straight back up, as high and as quickly as possible. The Reactive Strength Index is the jump height divided by the time on the ground; a jump mat or a phone app measures both.",
    tip: "Higher is better: more height for less time on the ground. Use the same box each time.",
  },
  hold: {
    label: "Hold: wall sit or plank",
    short: "Hold",
    how: "Hold a wall sit, a plank or a side plank for as long as possible, and stop the clock when the form breaks. It measures muscular endurance held still: the legs, or the trunk.",
    tip: "",
  },
  vloss: {
    label: "Velocity loss in a set",
    short: "Velocity loss",
    how: "With a bar-speed sensor: one set at a fixed weight, such as 80% of 1RM, every rep as fast as possible. The sensor's app shows how far the speed fell over the set; the less it falls, the better the muscular endurance.",
    tip: "Keep the weight and the number of reps the same from test to test.",
  },
};
export const TEST_KINDS = Object.keys(TESTS);
/* How the Which test? list and the section are grouped. */
export const TEST_GROUPS = [
  { label: "Heart and lungs", kinds: ["step", "rockport", "vo2"] },
  { label: "Strength", kinds: ["onerm", "jump", "rsi", "hold", "vloss"] },
];
/* The tests that need the client's age and table (women or men). */
export const NEEDS_WHO = ["step", "rockport"];
export const JUMP_STYLES = [["hips", "Hands on hips"], ["swing", "Arm swing"]];
export const JUMP_TOOLS = ["Wall reach", "Jump mat", "Phone app", "Sensor"];
export const HOLDS = [["wallsit", "Wall sit"], ["plank", "Plank"], ["sideL", "Side plank, left"], ["sideR", "Side plank, right"]];
export const MAX_REPS = 10;

/* Weights, heights and box heights in the trainer's units, as measurements
   are, with the ranges a real one falls in (metric). */
export const LIFT = { key: "lift", label: "Weight", kind: "mass", min: 1, max: 500 };
export const HEIGHT = { key: "jumpHeight", label: "Height", kind: "length", min: 2, max: 150 };
export const BOX = { key: "box", label: "Box", kind: "length", min: 10, max: 120 };
const BODY = MEASURES.find(m => m.key === "weight");
export { BODY as BODY_WEIGHT };

/** Brzycki's 1RM from a set of `reps` (1–10) at `kg`, to two places. */
export const brzycki = (kg, reps) => Math.round((kg * 36 / (37 - reps)) * 100) / 100;

/** The Reactive Strength Index: jump height (cm) ÷ ground contact time (ms), as metres ÷ seconds. */
export const rsiOf = (heightCm, contactMs) => Math.round(((heightCm / 100) / (contactMs / 1000)) * 100) / 100;

/** Which results are compared with each other: the same test, and for
    some, the same exercise, jump style or hold. */
export function seriesOf(t) {
  const d = t.data || {};
  return `${t.kind}|${d.exerciseId || d.style || d.hold || ""}`;
}
/** A result's name, with what it was of: "1RM · Barbell back squat". */
export function titleOf(t, { short = false } = {}) {
  const d = t.data || {};
  const what = d.exercise || JUMP_STYLES.find(([k]) => k === d.style)?.[1] || HOLDS.find(([k]) => k === d.hold)?.[1] || "";
  if (!what) return short ? TESTS[t.kind]?.short : TESTS[t.kind]?.label;
  return `${t.kind === "jump" && !short ? TESTS.jump.label : TESTS[t.kind].short} · ${what}`;
}
export const VO2_SOURCES = ["Lab or gym test", "Garmin", "Apple Watch", "Fitbit", "Other watch or app"];

/* The article's step-test ratings, best first: one-minute heart rate after
   the test, by age band. Each band's top is what counts: a value above one
   band's top and up to the next one's is in the next (the article's tables
   leave gaps between bands, such as women 18–25 Excellent 52–81 then Good
   85–93, so 82–84 is Good; Glenn: "Fill gaps down"). Above Very Poor's top is
   still Very Poor; below Excellent's bottom is still Excellent. One misprint
   fixed: men 46–55 Good is printed "97–93", read as 83–94, between
   Excellent's 82 and Above Average's 95. */
export const STEP_RATINGS = ["Excellent", "Good", "Above average", "Average", "Below average", "Poor", "Very poor"];
export const STEP_AGES = [[18, 25], [26, 35], [36, 45], [46, 55], [56, 65], [66, Infinity]];
const AGE_WORDS = ["18–25", "26–35", "36–45", "46–55", "56–65", "65+"];
/* [sex][age band] → each rating's printed range, best first. */
export const STEP_TABLE = {
  female: [
    [[52, 81], [85, 93], [96, 102], [104, 110], [113, 120], [122, 131], [135, 169]],
    [[58, 80], [85, 92], [95, 101], [104, 110], [113, 119], [122, 129], [134, 171]],
    [[51, 84], [89, 96], [100, 104], [107, 112], [115, 120], [124, 132], [137, 169]],
    [[63, 91], [95, 101], [104, 110], [113, 118], [120, 124], [126, 132], [137, 171]],
    [[60, 92], [97, 103], [106, 111], [116, 121], [119, 127], [129, 135], [141, 174]],
    [[70, 92], [96, 101], [104, 111], [116, 121], [123, 126], [128, 133], [135, 155]],
  ],
  male: [
    [[50, 76], [79, 84], [88, 93], [95, 100], [102, 107], [111, 119], [124, 157]],
    [[51, 76], [79, 85], [88, 94], [96, 102], [104, 110], [114, 121], [126, 161]],
    [[49, 76], [80, 88], [88, 95], [100, 105], [108, 113], [116, 124], [130, 163]],
    [[56, 82], [83, 94], [95, 101], [103, 111], [113, 119], [121, 126], [131, 159]],
    [[60, 77], [86, 94], [97, 100], [103, 109], [111, 117], [119, 128], [131, 154]],
    [[59, 81], [87, 92], [94, 102], [104, 110], [114, 118], [121, 126], [130, 151]],
  ],
};

const bandOf = (age) => STEP_AGES.findIndex(([lo, hi]) => age >= lo && age <= hi);

/** A step test's rating, or null where the tables don't reach (under 18). */
export function stepRating(heartRate, age, sex) {
  const band = bandOf(age);
  if (band < 0 || !STEP_TABLE[sex]) return null;
  const rows = STEP_TABLE[sex][band];
  const at = rows.findIndex(([, top]) => heartRate <= top);
  return { rating: STEP_RATINGS[at < 0 ? rows.length - 1 : at], ages: AGE_WORDS[band], table: sex === "female" ? "women" : "men" };
}

/**
 * The Rockport walk's VO2 max (ml/kg/min), Kline et al., 1987:
 * 132.853 − 0.0769 × weight (lb) − 0.3877 × age + 6.315 × sex (1 male, 0
 * female) − 3.2649 × time (minutes) − 0.1565 × heart rate. To one decimal.
 */
export function rockportVo2({ weightKg, age, sex, seconds, heartRate }) {
  const lb = weightKg * 2.20462262;
  const v = 132.853 - 0.0769 * lb - 0.3877 * age + 6.315 * (sex === "male" ? 1 : 0) - 3.2649 * (seconds / 60) - 0.1565 * heartRate;
  return Math.round(v * 10) / 10;
}

/** "14:32" from seconds, and seconds from "14:32" (or null). */
export const clockOf = (s) => (s == null ? "" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
/* Only a colon: "45.5" is more likely seconds and a half than 45:05, and
   "14.5" minutes and a half than 14:05 (Run 1, A-5), so a point is not read
   as one; the hold takes a decimal as seconds itself (server/fitness-tests.js). */
export function secondsOf(text) {
  const m = /^\s*(\d{1,2})\s*:\s*(\d{1,2})\s*$/.exec(String(text || ""));
  if (!m || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Whole years on a day, from a birthday (YYYY-MM-DD), or null. */
export function ageOn(birthday, day) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(birthday || "")) || !day) return null;
  const [by, bm, bd] = birthday.slice(0, 10).split("-").map(Number);
  const [ty, tm, td] = day.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Which table a client's gender points to: "female", "male", or "" to ask. */
export function sexOf(gender) {
  const g = String(gender || "").trim().toLowerCase();
  if (/^(f|female|woman|girl|cis woman|cisgender woman)$/.test(g)) return "female";
  if (/^(m|male|man|boy|cis man|cisgender man)$/.test(g)) return "male";
  return "";
}

/**
 * A result as it is shown: `{ text, rating, detail }`, weights and heights in
 * `units` (the trainer's).
 */
export function describe(t, units = "imperial") {
  const d = t.data || {};
  if (t.kind === "step") {
    return { title: TESTS.step.label, value: t.result, text: `${Math.round(t.result)} bpm`, rating: t.rating || null,
      detail: t.rating ? `Rated for ${t.sex === "female" ? "women" : "men"} aged ${t.ratingAges}` : "Not rated: the article's tables start at 18" };
  }
  if (t.kind === "rockport") {
    return { title: TESTS.rockport.label, value: t.result, text: `VO2 max ${t.result} ml/kg/min`, rating: null,
      detail: `1 mile in ${clockOf(d.seconds)}, heart rate ${d.heartRate} bpm` };
  }
  if (t.kind === "onerm") {
    const w = (kg) => `${toShown(LIFT, kg, units)} ${unitOf(LIFT, units)}`;
    const how = d.method === "estimated" ? `Worked out from ${w(d.weightKg)} × ${d.reps}` : "Lifted once";
    const ratio = d.bodyWeightKg ? ` · ${(t.result / d.bodyWeightKg).toFixed(2)} × body weight` : "";
    return { title: titleOf(t), value: t.result, text: `1RM ${w(t.result)}`, rating: null, detail: `${how}${ratio}` };
  }
  if (t.kind === "jump") {
    return { title: titleOf(t), value: t.result, text: `${toShown(HEIGHT, t.result, units)} ${unitOf(HEIGHT, units)}`, rating: null,
      detail: [JUMP_STYLES.find(([k]) => k === d.style)?.[1], d.tool].filter(Boolean).join(", ") };
  }
  if (t.kind === "rsi") {
    return { title: titleOf(t), value: t.result, text: `RSI ${t.result.toFixed(2)}`, rating: null,
      detail: `Jumped ${toShown(HEIGHT, d.heightCm, units)} ${unitOf(HEIGHT, units)}, ${d.contactMs} ms on the ground${d.boxCm ? `, from a ${toShown(BOX, d.boxCm, units)} ${unitOf(BOX, units)} box` : ""}` };
  }
  if (t.kind === "hold") {
    return { title: titleOf(t), value: t.result, text: `${clockOf(t.result)} held`, rating: null, detail: "" };
  }
  if (t.kind === "vloss") {
    return { title: titleOf(t), value: t.result, text: `Velocity loss ${t.result}%`, rating: null,
      detail: `${d.reps} reps at ${d.percent}% of 1RM${d.weightKg ? ` (${toShown(LIFT, d.weightKg, units)} ${unitOf(LIFT, units)})` : ""}` };
  }
  return { title: TESTS.vo2.label, value: t.result, text: `VO2 max ${t.result} ml/kg/min`, rating: null, detail: d.source || "" };
}

/**
 * How a result changed since the one before, as the trainer reads it: a step
 * test's heart rate falling is fitter, as is less velocity loss; the rest,
 * higher is better. Shown as it is, "−11 bpm", "+5 lb", "+0:20".
 */
export function changeOf(t, before, units = "imperial") {
  if (!before || before.result == null || t.result == null) return null;
  const sign = (d) => (d > 0 ? "+" : "−");
  if (t.kind === "hold") {
    const d = Math.round(t.result - before.result);
    return d ? `${sign(d)}${clockOf(Math.abs(d))}` : "no change";
  }
  const measure = t.kind === "onerm" ? LIFT : t.kind === "jump" ? HEIGHT : null;
  const a = measure ? toShown(measure, t.result, units) : t.result;
  const b = measure ? toShown(measure, before.result, units) : before.result;
  const d = Math.round((a - b) * 100) / 100;
  if (!d) return "no change";
  const unit = t.kind === "step" ? " bpm" : t.kind === "vloss" ? " points" : measure ? ` ${unitOf(measure, units)}` : "";
  return `${sign(d)}${Math.abs(d)}${unit}`;
}

export { fromShown };
