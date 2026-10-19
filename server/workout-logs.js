import { all, get, run } from "./db.js";
import { insertWithNewId, isId } from "./ids.js";
import { isRealDay } from "../src/lib/date.js";
import { MAX_SETS, plannedOf, setsDone } from "../src/lib/workout-log.js";
import { MAX_REPS, brzycki } from "../src/lib/fitness-tests.js";
import { exerciseById } from "./library.js";
import * as fitnessTests from "./fitness-tests.js";

/**
 * A client's logged sessions (Run 1, I-14; Glenn, 19 Oct 2026): one day of a
 * program as it was done, ids `wkl` (Glenn's tag). Every trainer of the
 * client sees them, with who logged each ("Every trainer of the client"), as
 * measurements and tests are; only the one who logged a session may change
 * or delete it. A set that beats the client's 1RM for a library lift is
 * kept as a new estimated 1RM in their Fitness tests ("Estimated 1RMs from
 * sets"), and goes again if the session is changed or deleted.
 */

const now = () => new Date().toISOString();
/* The latest day a trainer may pick: tomorrow by UTC (measurements.js). */
const latestDay = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const parse = (s) => { try { return JSON.parse(s || "[]"); } catch { return []; } };

function shape(r, trainerId) {
  return {
    id: r.id, clientId: r.client_id, programId: r.program_id, programName: r.program_name, dayId: r.day_id, dayName: r.day_name,
    doneOn: r.done_on, entries: parse(r.entries), note: r.note || "", units: r.units, loggedBy: r.trainer_name,
    mine: r.trainer_id === trainerId, createdAt: r.created_at,
  };
}

/** Newest first. */
export async function logsOf(clientId, trainerId) {
  return (await all(`SELECT * FROM coach_workout_logs WHERE client_id = ? ORDER BY done_on DESC, created_at DESC`, [clientId])).map(r => shape(r, trainerId));
}
export const logById = (id) => (isId("workoutLog", id) ? get(`SELECT * FROM coach_workout_logs WHERE id = ?`, [id]) : null);

/** Each exercise's latest logged entry for a client: exerciseId → { doneOn, entry, units }. */
export async function lastByExercise(clientId) {
  const out = new Map();
  for (const log of await logsOf(clientId, null)) {
    for (const e of log.entries) if (e.exerciseId && !out.has(e.exerciseId)) out.set(e.exerciseId, { doneOn: log.doneOn, entry: e, units: log.units });
  }
  return out;
}

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

/**
 * What the page sent, checked: `{ row }` or `{ error }`. `program` is the
 * full program the day is from (programs.full), whose exercises the entries
 * must be; their names and plans are taken from it, not from the page.
 */
export function check(body = {}, program) {
  const doneOn = String(body.doneOn || "");
  if (!isRealDay(doneOn)) return { error: "Choose the day of the session." };
  if (doneOn > latestDay() || doneOn < "1990-01-01") return { error: "Choose a day that has been, not one still to come." };
  const day = program.days.find(d => d.id === body.dayId);
  if (!day) return { error: "Choose the day of the program." };
  const sent = new Map((Array.isArray(body.entries) ? body.entries : []).map(e => [e?.peId, e]));
  const entries = [];
  for (const e of day.exercises) {
    const s = sent.get(e.id);
    if (!s) continue;
    let sets = null;
    if (Array.isArray(s.sets) && s.sets.length) {
      if (s.sets.length > MAX_SETS) return { error: `${e.name}: at most ${MAX_SETS} sets.` };
      sets = [];
      for (const x of s.sets) {
        const reps = num(x?.reps), kg = num(x?.weightKg);
        if (reps !== null && !(Number.isInteger(reps) && reps >= 0 && reps <= 200)) return { error: `${e.name}: write each set's reps as a whole number.` };
        if (kg !== null && !(Number.isFinite(kg) && kg >= 0 && kg <= 600)) return { error: `${e.name}: a weight of that doesn't look right. Check it and try again.` };
        sets.push({ reps, weightKg: kg === null ? null : Math.round(kg * 100) / 100 });
      }
    }
    entries.push({
      peId: e.id, exerciseId: e.exerciseId, name: e.name,
      planned: plannedOf(e),
      done: s.done !== false, sets, note: typeof s.note === "string" ? s.note.trim().slice(0, 300) : "",
    });
  }
  if (!entries.length) return { error: "This day has no exercises to log." };
  return { row: {
    programId: program.id, programName: program.name, dayId: day.id, dayName: day.name, doneOn, entries,
    note: typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "", units: body.units === "metric" ? "metric" : "imperial",
  } };
}

export async function add(clientId, trainer, row) {
  const at = now();
  const id = await insertWithNewId("workoutLog", (newId) => run(
    `INSERT INTO coach_workout_logs (id, client_id, trainer_id, trainer_name, program_id, program_name, day_id, day_name, done_on, entries, note, units, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, clientId, trainer.id, String(trainer.name || "").slice(0, 120), row.programId, row.programName.slice(0, 120), row.dayId, row.dayName.slice(0, 120),
      row.doneOn, JSON.stringify(row.entries), row.note, row.units, at, at]));
  await newBests(id, clientId, trainer, row);
  return id;
}

export async function update(id, trainer, row) {
  const r = await logById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainer.id) return "not_yours";
  await run(`UPDATE coach_workout_logs SET done_on = ?, entries = ?, note = ?, units = ?, updated_at = ? WHERE id = ?`,
    [row.doneOn, JSON.stringify(row.entries), row.note, row.units, now(), id]);
  await dropBests(id);
  await newBests(id, r.client_id, trainer, row);
  return "done";
}

export async function remove(id, trainerId) {
  const r = await logById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await dropBests(id);
  await run(`DELETE FROM coach_workout_logs WHERE id = ?`, [id]);
  return "done";
}

/* The client's best 1RM for each library lift, from their tests. */
async function bestsOf(clientId) {
  const out = new Map();
  for (const r of await all(`SELECT data, result FROM coach_fitness_tests WHERE client_id = ? AND kind = 'onerm'`, [clientId])) {
    let d; try { d = JSON.parse(r.data || "{}"); } catch { d = {}; }
    if (d.exerciseId) out.set(d.exerciseId, Math.max(out.get(d.exerciseId) || 0, Number(r.result) || 0));
  }
  return out;
}

/* Each library lift's best set of 10 reps or fewer, worked out as a 1RM
   (Brzycki, as Fitness tests does); kept when it beats every 1RM the client
   has for it, as an estimated 1RM saying it came from this session. */
async function newBests(logId, clientId, trainer, row) {
  const bests = await bestsOf(clientId);
  for (const e of row.entries) {
    const x = exerciseById(e.exerciseId);
    if (!x) continue;
    let top = null;
    for (const s of setsDone(e)) {
      if (!s.weightKg || !s.reps || s.reps > MAX_REPS) continue;
      const est = brzycki(s.weightKg, s.reps);
      if (!top || est > top.est) top = { est, set: s };
    }
    if (!top || top.est <= (bests.get(x.id) || 0) + 0.01) continue;
    await fitnessTests.add(clientId, trainer, {
      kind: "onerm", takenOn: row.doneOn, age: null, sex: "", rating: null, ratingAges: null,
      note: `From the session on ${row.doneOn}`,
      data: { exerciseId: x.id, exercise: x.name, method: "estimated", weightKg: top.set.weightKg, reps: top.set.reps, bodyWeightKg: null, units: row.units, fromSession: logId },
      result: top.est,
    });
    bests.set(x.id, top.est);
  }
}
async function dropBests(logId) {
  await run(`DELETE FROM coach_fitness_tests WHERE kind = 'onerm' AND data LIKE ?`, [`%"fromSession":"${logId}"%`]);
}
