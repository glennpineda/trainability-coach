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
 */

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
};
export const TEST_KINDS = Object.keys(TESTS);
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
export function secondsOf(text) {
  const m = /^\s*(\d{1,2})\s*[:.]\s*(\d{1,2})\s*$/.exec(String(text || ""));
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
 * A result as it is shown: `{ title, value, rating, detail }`.
 * `value` is what is compared from one result to the next.
 */
export function describe(t) {
  if (t.kind === "step") {
    return { title: TESTS.step.label, value: t.result, text: `${Math.round(t.result)} bpm`, rating: t.rating || null,
      detail: t.rating ? `Rated for ${t.sex === "female" ? "women" : "men"} aged ${t.ratingAges}` : "Not rated: the article's tables start at 18" };
  }
  if (t.kind === "rockport") {
    return { title: TESTS.rockport.label, value: t.result, text: `VO2 max ${t.result} ml/kg/min`, rating: null,
      detail: `1 mile in ${clockOf(t.data?.seconds)}, heart rate ${t.data?.heartRate} bpm` };
  }
  return { title: TESTS.vo2.label, value: t.result, text: `VO2 max ${t.result} ml/kg/min`, rating: null, detail: t.data?.source || "" };
}

/** How a result changed since the one before: a step test's heart rate falling is fitter. */
export function changeOf(t, before) {
  if (!before || before.result == null || t.result == null) return null;
  const d = Math.round((t.result - before.result) * 10) / 10;
  if (!d) return "no change";
  const unit = t.kind === "step" ? " bpm" : "";
  return `${d > 0 ? "+" : "−"}${Math.abs(d)}${unit}`;
}
