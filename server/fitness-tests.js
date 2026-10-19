import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { TESTS, VO2_SOURCES, NEEDS_WHO, JUMP_STYLES, JUMP_TOOLS, HOLDS, MAX_REPS, LIFT, HEIGHT, BOX, BODY_WEIGHT,
  stepRating, rockportVo2, secondsOf, brzycki, rsiOf } from "../src/lib/fitness-tests.js";
import { exerciseById } from "./library.js";
import { MEASURES, fromShown } from "../src/lib/measures.js";
import { isRealDay } from "../src/lib/date.js";

/**
 * A client's fitness tests, heart and lungs and strength (Glenn, 18 Oct 2026; the tests and
 * their rules are src/lib/fitness-tests.js): one row per result, ids `tst`
 * (Glenn's tag). As measurements: every trainer of the client sees them with
 * who did each, and only that trainer may change or delete one. The result is
 * worked out here from what was entered, and kept with the age and the table
 * (women or men) it was worked out with, so it doesn't move if a birthday is
 * corrected later.
 */

const now = () => new Date().toISOString();
/* The latest day a trainer may pick: tomorrow by UTC, since the server can't
   know the trainer's clock and somewhere it is already tomorrow (UTC+14). The
   page caps the date box at the device's own today (Run 1, A-2). */
const latestDay = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const parse = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

function shape(r, trainerId) {
  return {
    id: r.id, clientId: r.client_id, kind: r.kind, takenOn: r.taken_on, age: r.age == null ? null : Number(r.age), sex: r.sex || "",
    data: parse(r.data), result: r.result == null ? null : Number(r.result), rating: r.rating || null, ratingAges: r.rating_ages || null,
    note: r.note || "", takenBy: r.trainer_name, mine: r.trainer_id === trainerId, createdAt: r.created_at,
  };
}

/** Newest first. */
export async function testsOf(clientId, trainerId) {
  const rows = await all(`SELECT * FROM coach_fitness_tests WHERE client_id = ? ORDER BY taken_on DESC, created_at DESC`, [clientId]);
  return rows.map(r => shape(r, trainerId));
}
export const testById = (id) => get(`SELECT * FROM coach_fitness_tests WHERE id = ?`, [id]);

const num = (v) => (v === undefined || v === null || v === "" ? null : Number(String(v).replace(",", ".")));

/**
 * What the page sent, checked, with the result worked out: `{ row }` or
 * `{ error }` in the trainer's words. `units` is the trainer's, for the
 * Rockport walk's weight.
 */
export function check(body = {}) {
  const kind = String(body.kind || "");
  if (!TESTS[kind]) return { error: "Choose which test it was." };
  const takenOn = String(body.takenOn || "");
  if (!isRealDay(takenOn)) return { error: "Choose the day of the test." };
  if (takenOn > latestDay() || takenOn < "1990-01-01") return { error: "Choose a day that has been, not one still to come." };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const age = num(body.age);
  const sex = body.sex === "female" || body.sex === "male" ? body.sex : "";
  const needsWho = NEEDS_WHO.includes(kind);
  if (needsWho && (age == null || !Number.isInteger(age) || age < 5 || age > 110)) return { error: "Fill in their age on the day, in whole years." };
  if (needsWho && !sex) return { error: "Choose which table to use: women's or men's." };

  if (kind === "step") {
    const hr = num(body.heartRate);
    if (hr == null || !Number.isFinite(hr)) return { error: "Fill in the heart rate counted in the minute after." };
    if (hr < 40 || hr > 220) return { error: `A heart rate of ${hr} doesn't look right. Check it and try again.` };
    const r = stepRating(Math.round(hr), age, sex);
    return { row: { kind, takenOn, age, sex, data: { heartRate: Math.round(hr) }, result: Math.round(hr), rating: r?.rating || null, ratingAges: r?.ages || null, note } };
  }
  if (kind === "rockport") {
    const seconds = secondsOf(body.time);
    if (seconds == null) return { error: "Fill in the time for the mile as minutes and seconds, such as 14:30." };
    if (seconds < 7 * 60 || seconds > 40 * 60) return { error: "A mile walked in that time doesn't look right. Check it and try again." };
    const hr = num(body.heartRate);
    if (hr == null || hr < 60 || hr > 220) return { error: hr == null ? "Fill in the heart rate at the end of the mile." : `A heart rate of ${hr} doesn't look right. Check it and try again.` };
    const w = num(body.weight);
    const weight = MEASURES.find(m => m.key === "weight");
    const weightKg = w == null ? null : fromShown(weight, w, body.units === "metric" ? "metric" : "imperial");
    if (weightKg == null) return { error: "Fill in their weight: the formula needs it." };
    if (weightKg < weight.min || weightKg > weight.max) return { error: `A weight of ${w} doesn't look right. Check it and try again.` };
    const vo2 = rockportVo2({ weightKg, age, sex, seconds, heartRate: Math.round(hr) });
    /* The formula runs out of sense for a slow walk with a high heart rate
       and heavy weight, down to below zero (Run 1, A-4); the same floor as a
       VO2 max typed in. */
    if (!(vo2 >= 10)) return { error: "The walk's formula doesn't fit these numbers: it gives a VO2 max below 10. Check the time, the heart rate and the weight." };
    return { row: { kind, takenOn, age, sex, data: { seconds, heartRate: Math.round(hr), weightKg }, result: vo2, rating: null, ratingAges: null, note } };
  }
  if (kind !== "vo2") {
    const out = strength(kind, body, body.units === "metric" ? "metric" : "imperial");
    return out.error ? out : { row: { kind, takenOn, age: null, sex: "", rating: null, ratingAges: null, note, ...out } };
  }
  const vo2 = num(body.vo2);
  if (vo2 == null || !Number.isFinite(vo2)) return { error: "Fill in the VO2 max." };
  if (vo2 < 10 || vo2 > 95) return { error: `A VO2 max of ${vo2} doesn't look right. Check it and try again.` };
  const source = VO2_SOURCES.includes(body.source) ? body.source : "";
  if (!source) return { error: "Choose where the VO2 max came from." };
  return { row: { kind, takenOn, age: age ?? null, sex, data: { vo2: Math.round(vo2 * 10) / 10, source }, result: Math.round(vo2 * 10) / 10, rating: null, ratingAges: null, note } };
}

/* A weight, height or box in the trainer's units, kept in metric: the value,
   or null when empty, or an error when no person's could be that. */
function inMetric(measure, value, units, what) {
  const v = num(value);
  if (v == null) return { value: null };
  const m = Number.isFinite(v) ? fromShown(measure, v, units) : null;
  if (m == null || m < measure.min || m > measure.max) return { error: `${what} of ${value} doesn't look right. Check it and try again.` };
  return { value: m };
}
const exerciseOf = (id) => { const x = exerciseById(String(id || "")); return x ? { exerciseId: x.id, exercise: x.name } : null; };

/* The strength tests (src/lib/fitness-tests.js): `{ data, result }` or `{ error }`. */
function strength(kind, body, units) {
  if (kind === "onerm") {
    const ex = exerciseOf(body.exerciseId);
    if (!ex) return { error: "Choose the exercise from the library." };
    const method = body.method === "estimated" ? "estimated" : "tested";
    const w = inMetric(LIFT, body.weight, units, "A weight");
    if (w.error) return w;
    if (w.value == null) return { error: method === "estimated" ? "Fill in the weight of the set." : "Fill in the weight lifted." };
    const bw = inMetric(BODY_WEIGHT, body.bodyWeight, units, "A body weight");
    if (bw.error) return bw;
    /* The units the weight was typed in, to show it back as typed (Run 1, U-17). */
    if (method === "tested") return { data: { ...ex, method, weightKg: w.value, bodyWeightKg: bw.value, units }, result: w.value };
    const reps = num(body.reps);
    if (reps == null || !Number.isInteger(reps) || reps < 1) return { error: "Fill in the reps done, in whole reps." };
    if (reps > MAX_REPS) return { error: "Over 10 reps the estimate gets loose: test with a heavier weight, for 10 reps or fewer." };
    return { data: { ...ex, method, weightKg: w.value, reps, bodyWeightKg: bw.value, units }, result: brzycki(w.value, reps) };
  }
  if (kind === "jump") {
    const style = JUMP_STYLES.some(([k]) => k === body.style) ? body.style : "";
    if (!style) return { error: "Choose how they jumped: hands on hips or with an arm swing." };
    const h = inMetric(HEIGHT, body.height, units, "A jump");
    if (h.error) return h;
    if (h.value == null) return { error: "Fill in the height jumped." };
    const tool = JUMP_TOOLS.includes(body.tool) ? body.tool : "";
    return { data: { style, tool, heightCm: h.value }, result: h.value };
  }
  if (kind === "rsi") {
    const h = inMetric(HEIGHT, body.height, units, "A jump");
    if (h.error) return h;
    if (h.value == null) return { error: "Fill in the height jumped." };
    const ms = num(body.contactMs);
    if (ms == null) return { error: "Fill in the time on the ground, in milliseconds." };
    if (!Number.isFinite(ms) || ms < 80 || ms > 1500) return { error: `${ms} ms on the ground doesn't look right. Check it and try again.` };
    const box = inMetric(BOX, body.box, units, "A box");
    if (box.error) return box;
    return { data: { heightCm: h.value, contactMs: Math.round(ms), boxCm: box.value }, result: rsiOf(h.value, Math.round(ms)) };
  }
  if (kind === "hold") {
    const hold = HOLDS.some(([k]) => k === body.hold) ? body.hold : "";
    if (!hold) return { error: "Choose which hold it was." };
    /* "1:30", or a bare number of seconds, "45" or "45.5" (to the nearest second). */
    const seconds = /^\s*\d{1,4}([.,]\d+)?\s*$/.test(String(body.time ?? "")) ? Math.round(Number(String(body.time).trim().replace(",", "."))) : secondsOf(body.time);
    if (seconds == null) return { error: "Fill in the time held as minutes and seconds, such as 1:30." };
    if (seconds < 5 || seconds > 60 * 60) return { error: "A hold of that time doesn't look right. Check it and try again." };
    return { data: { hold, seconds }, result: seconds };
  }
  /* Velocity loss. */
  const ex = exerciseOf(body.exerciseId);
  if (!ex) return { error: "Choose the exercise from the library." };
  const percent = num(body.percent);
  if (percent == null || !Number.isFinite(percent) || percent < 20 || percent > 100) return { error: "Fill in the weight as a percentage of their 1RM, from 20 to 100." };
  const reps = num(body.reps);
  if (reps == null || !Number.isInteger(reps) || reps < 2 || reps > 30) return { error: "Fill in the reps in the set, from 2 to 30." };
  const loss = num(body.loss);
  if (loss == null || !Number.isFinite(loss) || loss < 0 || loss > 100) return { error: "Fill in the velocity loss the sensor showed, as a percentage." };
  const w = inMetric(LIFT, body.weight, units, "A weight");
  if (w.error) return w;
  return { data: { ...ex, percent: Math.round(percent), reps, weightKg: w.value, units }, result: Math.round(loss * 10) / 10 };
}

export async function add(clientId, trainer, row) {
  const at = now();
  return insertWithNewId("fitnessTest", (id) => run(
    `INSERT INTO coach_fitness_tests (id, client_id, trainer_id, trainer_name, kind, taken_on, age, sex, data, result, rating, rating_ages, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, trainer.id, String(trainer.name || "").slice(0, 120), row.kind, row.takenOn, row.age, row.sex, JSON.stringify(row.data), row.result, row.rating, row.ratingAges, row.note, at, at]));
}

export async function update(id, trainerId, row) {
  const r = await testById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await run(`UPDATE coach_fitness_tests SET kind = ?, taken_on = ?, age = ?, sex = ?, data = ?, result = ?, rating = ?, rating_ages = ?, note = ?, updated_at = ? WHERE id = ?`,
    [row.kind, row.takenOn, row.age, row.sex, JSON.stringify(row.data), row.result, row.rating, row.ratingAges, row.note, now(), id]);
  return "done";
}

export async function remove(id, trainerId) {
  const r = await testById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await run(`DELETE FROM coach_fitness_tests WHERE id = ?`, [id]);
  return "done";
}

export const shapeOf = shape;
