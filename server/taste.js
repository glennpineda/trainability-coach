import { all, get, run } from "./db.js";
import * as library from "./library.js";

/**
 * How each trainer builds programs, learned (Glenn, 20 Oct 2026: "make sure
 * we learn how each trainer creates programs, and suggest/autopopulate
 * exercises that trainers likes to do. Create a neural network that way").
 *
 * Not a neural network: with a handful of trainers and programs one would
 * have next to nothing to learn from, and couldn't say why it suggests
 * what it does. Instead a score a trainer gives each exercise without
 * meaning to, learned from the first program on and always explainable:
 *
 *   - what their programs hold: each program with it counts, the newer the
 *     more (a half-life of HALF_LIFE weeks), the session's exercises only;
 *   - what they do (coach_iq_taste): put in by hand +1, swapped in +1.5,
 *     taken out −1, swapped away −1.5, and taken out or swapped away after
 *     Coach IQ built it in −3 more, the plainest "not this one";
 *   - its family a third as much, so a liking for one deadlift leans to
 *     other deadlifts too.
 *
 * And their usual rest between sets for a goal, from the rests they wrote
 * themselves in programs for it (never one Coach IQ wrote and they left),
 * once there are MIN_RESTS.
 */

const HALF_LIFE = 12;
const MIN_RESTS = 5;
const WEEK = 7 * 24 * 3600 * 1000;
const now = () => new Date().toISOString();

const SIGNALS = { added: "added", removed: "removed", "swapped-in": "swapped_in", "swapped-out": "swapped_out", "iq-dropped": "iq_dropped" };

/** One thing a trainer did with an exercise: added, removed, swapped-in, swapped-out or iq-dropped. */
export async function record(trainerId, exerciseId, signal) {
  const col = SIGNALS[signal];
  if (!col || !library.isExercise(exerciseId)) return;
  /* Read, then insert or update: no upsert syntax, so it runs on both databases. */
  const had = await get(`SELECT trainer_id FROM coach_iq_taste WHERE trainer_id = ? AND exercise_id = ?`, [trainerId, exerciseId]);
  if (had) await run(`UPDATE coach_iq_taste SET ${col} = ${col} + 1, updated_at = ? WHERE trainer_id = ? AND exercise_id = ?`, [now(), trainerId, exerciseId]);
  else await run(`INSERT INTO coach_iq_taste (trainer_id, exercise_id, ${col}, updated_at) VALUES (?, ?, 1, ?)`, [trainerId, exerciseId, now()]);
}

/**
 * A trainer's way, read once for a program's suggestions: `score(x)` for a
 * version (about −4 to +4), `why(x)` in words where it counts, and
 * `usualRest(goal)`, seconds or null.
 */
export async function tasteOf(trainerId) {
  const rows = await all(`SELECT pe.exercise_id, pe.rest_seconds, pe.by_iq, pe.program_id, p.created_at, p.goal FROM coach_program_exercises pe
    JOIN coach_programs p ON p.id = pe.program_id WHERE p.trainer_id = ? AND pe.part = ''`, [trainerId]);
  const acts = await all(`SELECT * FROM coach_iq_taste WHERE trainer_id = ?`, [trainerId]);
  const t = Date.now();
  const used = new Map();       // exercise id → { weight, programs: Set }
  for (const r of rows) {
    const age = Math.max(0, (t - Date.parse(r.created_at)) / WEEK);
    const u = used.get(r.exercise_id) || { weight: 0, programs: new Set() };
    if (!u.programs.has(r.program_id)) { u.programs.add(r.program_id); u.weight += 0.5 ** (age / HALF_LIFE); }
    used.set(r.exercise_id, u);
  }
  const own = new Map();
  for (const [id, u] of used) own.set(id, u.weight);
  for (const a of acts) {
    const n = (k) => Number(a[k]) || 0;
    own.set(a.exercise_id, (own.get(a.exercise_id) || 0) + n("added") + 1.5 * n("swapped_in") - n("removed") - 1.5 * n("swapped_out") - 3 * n("iq_dropped"));
  }
  const family = new Map();
  for (const [id, v] of own) {
    const f = library.exerciseById(id)?.movement;
    if (f) family.set(f, (family.get(f) || 0) + v);
  }
  const clamp = (v) => Math.max(-4, Math.min(4, v));
  const score = (x) => clamp((own.get(x.id) || 0) + ((family.get(x.movement) || 0) - (own.get(x.id) || 0)) / 3);
  const dropped = new Map(acts.map(a => [a.exercise_id, Number(a.iq_dropped) || 0]));
  const chose = new Map(acts.map(a => [a.exercise_id, (Number(a.added) || 0) + (Number(a.swapped_in) || 0)]));
  const why = (x) => {
    const u = used.get(x.id);
    if (u && u.programs.size >= 2 && score(x) > 0) return `You often use it (in ${u.programs.size} of your programs).`;
    if (chose.get(x.id) && score(x) > 0) return "You have chosen it before.";
    if (dropped.get(x.id) && score(x) < 0) return "You have taken it out before.";
    return "";
  };
  /* Rests they wrote, by what the program is for (a strength program rests
     longer than one for muscle): by hand (0) or Coach IQ's changed by them (2). */
  const usualRest = (goal) => {
    const rests = rows.filter(r => r.goal === goal && Number(r.by_iq) !== 1 && r.rest_seconds != null).map(r => Number(r.rest_seconds)).sort((a, b) => a - b);
    return rests.length >= MIN_RESTS ? rests[Math.floor(rests.length / 2)] : null;
  };
  return { score, why, usualRest, programs: new Set(rows.map(r => r.program_id)).size };
}
