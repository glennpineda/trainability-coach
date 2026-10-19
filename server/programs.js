import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { LEVELS } from "./coach-iq.js";
import * as library from "./library.js";
import * as equipment from "./equipment.js";
import * as limitations from "./limitations.js";
import { percentOf, kgAt, maxRepsAt, weightText } from "../src/lib/one-rm.js";

/**
 * The program designer (Glenn, 17 Oct 2026: "We need to start creating a
 * workout program designer so we can start testing Coach IQ in real time",
 * then "Go"). A trainer builds a program for one client of theirs, at one of
 * their places, day by day and exercise by exercise, and Coach IQ is beside
 * them at every step (Glenn: "That's the whole point of being an assistant is
 * being there at every step"):
 *
 *   - check(): the whole program against Coach IQ, worked out here in code,
 *     each point naming the principle or the rule it comes from, so a point
 *     that is wrong shows where Coach IQ needs fixing;
 *   - suggestNext(): what could come next on a day, from the library, already
 *     fitted to the place's equipment, the client's level and limitations,
 *     with a starting dose from the principles;
 *   - swapsFor(): alternatives for one exercise, the same way.
 *
 * Decided with Glenn: only the trainer who wrote a program sees it; on an
 * exercise only the exercise matters, the rest is optional; it can be printed
 * for the client. Ids: prg (program), prd (day), pre (an exercise on a day).
 */

/* ------------------------------------------------------------ the goals */

/*
 * What a program is for, and the starting dose and the ranges the checks use,
 * each from a principle (coach-iq/principles): reps (what each range
 * develops), sets (reps and sets go opposite ways; a set window), rest (by
 * goal). Rest is in seconds.
 */
export const GOALS = {
  strength: { label: "Strength", purpose: "strength", sets: "3–5", reps: "3–6", rest: 180, reps_range: [1, 8], rest_range: [120, 300] },
  power: { label: "Power", purpose: "power", sets: "3–5", reps: "1–5", rest: 180, reps_range: [1, 6], rest_range: [120, 600] },
  muscle: { label: "Muscle size", purpose: "muscle", sets: "3–4", reps: "6–12", rest: 75, reps_range: [6, 12], rest_range: [30, 90] },
  endurance: { label: "Strength endurance", purpose: "endurance", sets: "2–3", reps: "12–20", rest: 45, reps_range: [12, 30], rest_range: [30, 60] },
  "fat-loss": { label: "Fat loss and conditioning", purpose: "conditioning", sets: "2–3", reps: "12–20", rest: 45, reps_range: [10, 30], rest_range: [30, 60] },
  general: { label: "General fitness", purpose: "strength", sets: "2–3", reps: "8–12", rest: 90, reps_range: [6, 20], rest_range: [30, 180] },
  mobility: { label: "Mobility", purpose: "mobility", sets: "1–2", reps: "", rest: null, reps_range: null, rest_range: null },
};
export const goalsList = () => Object.entries(GOALS).map(([key, g]) => ({ key, label: g.label }));

/* ------------------------------------------------ what kind of program

   Asked before a program is made (Glenn, 17 Oct 2026: "Before creating a
   new program, ask what kind of program they are think of creating so we can
   help recommend exercises better"): its kind, which sets what each day
   trains; the days a week; areas to focus on; and how long a session is. */

/* What a day trains: the movement patterns offered for it, in the order they
   are offered, the big ones first. "isolation-…" is a single-muscle exercise
   for that part of the body. */
export const DAY_KINDS = {
  full: { label: "Full body", patterns: ["squat", "hinge", "push-horizontal", "pull-horizontal", "lunge", "push-vertical", "pull-vertical", "carry", "core-anti-extension", "core-anti-rotation"] },
  upper: { label: "Upper body", short: "Upper", patterns: ["push-horizontal", "pull-horizontal", "push-vertical", "pull-vertical", "isolation-push", "isolation-pull", "core-anti-rotation"] },
  lower: { label: "Lower body", short: "Lower", patterns: ["squat", "hinge", "lunge", "isolation-lower", "core-anti-extension", "carry"] },
  push: { label: "Push", patterns: ["push-horizontal", "push-vertical", "isolation-push", "core-anti-extension"] },
  pull: { label: "Pull", patterns: ["pull-horizontal", "pull-vertical", "isolation-pull", "carry"] },
  legs: { label: "Legs", patterns: ["squat", "hinge", "lunge", "isolation-lower", "core-anti-rotation"] },
  circuit: { label: "Circuit", patterns: ["conditioning", "squat", "push-horizontal", "hinge", "pull-horizontal", "plyometric", "core-anti-extension", "carry"] },
  mobility: { label: "Mobility", patterns: ["mobility", "breathing", "balance", "core-anti-extension"] },
};
export const dayKindsList = () => Object.entries(DAY_KINDS).map(([key, k]) => ({ key, label: k.label }));

/* The kinds of program: what its days train, in turn, and the days a week
   it usually has. */
export const KINDS = {
  full: { label: "Full body", about: "Every day works the whole body.", cycle: ["full"], days: 3, goal: "general" },
  "upper-lower": { label: "Upper and lower", about: "Days take turns: upper body, then lower body.", cycle: ["upper", "lower"], days: 4, goal: "muscle" },
  ppl: { label: "Push, pull, legs", about: "Days take turns: pushing, pulling, then legs.", cycle: ["push", "pull", "legs"], days: 3, goal: "muscle" },
  circuit: { label: "A circuit", about: "Exercises one after another with little rest, for conditioning.", cycle: ["circuit"], days: 3, goal: "fat-loss" },
  mobility: { label: "Mobility and flexibility", about: "Moving better: mobility, balance and breathing.", cycle: ["mobility"], days: 2, goal: "mobility" },
};

/* Areas to focus on: their patterns go first where the day trains them. */
export const FOCUS = {
  legs: { label: "Legs and glutes", patterns: ["squat", "hinge", "lunge", "isolation-lower"] },
  upper: { label: "Upper body", patterns: ["push-horizontal", "pull-horizontal", "push-vertical", "pull-vertical"] },
  core: { label: "Core", patterns: ["core-anti-extension", "core-anti-rotation", "core-lateral", "core-flexion"] },
  balance: { label: "Balance and stability", patterns: ["balance", "lunge", "core-anti-rotation"] },
  posture: { label: "Posture", patterns: ["pull-horizontal", "core-anti-extension", "mobility"] },
  conditioning: { label: "Conditioning", patterns: ["conditioning", "carry", "plyometric"] },
};

/* How long a session is, and about how many exercises it holds (sets.md:
   most sessions take about 45–75 minutes; the set count is what matters). */
export const MINUTES = { 30: 4, 45: 5, 60: 6, 75: 7, 90: 8 };

/* "What are we working on?" in the add-an-exercise dialog (Glenn, 18 Oct
   2026: "have an optional “what are we working on?” question with an optional
   option about muscle groups, this will help Billy narrow the exercise
   recommendations to a more precise way"). First kinds of movement (squat,
   hinge, push …); then, as Glenn put it ("I would rather have strength,
   cardio, balance, mobility.. The other options there seems out of place",
   and "Go with the five"), the kind of training: what quality is being built,
   with the muscle groups below saying where. Each matches the purposes Coach
   IQ's families are tagged with. */
const purposesOf = (x) => library.familyOf(x)?.purposes || [];
const patternOfFamily = (x) => library.familyOf(x)?.pattern;
export const WORK_ON = {
  strength: { label: "Strength", matches: (x) => purposesOf(x).some(p => ["strength", "muscle", "control"].includes(p)) && patternOfFamily(x) !== "breathing" },
  power: { label: "Power", matches: (x) => purposesOf(x).includes("power") },
  cardio: { label: "Cardio", matches: (x) => purposesOf(x).includes("conditioning") || (purposesOf(x).includes("endurance") && patternOfFamily(x) === "conditioning") },
  balance: { label: "Balance", matches: (x) => purposesOf(x).includes("balance") },
  mobility: { label: "Mobility", matches: (x) => purposesOf(x).includes("mobility") || patternOfFamily(x) === "breathing" },
};
/* The top-level groups, in Glenn's words and order (18 Oct 2026: "chest,
   shoulders, arms, core, legs as the top level muscle group categories",
   with Back added as a sixth when asked), each opening to its own muscles. */
export const MUSCLE_GROUPS = [
  { key: "chest", label: "Chest", muscles: ["chest"] },
  { key: "shoulders", label: "Shoulders", muscles: ["front delts", "side delts", "rear delts", "rotator cuff"] },
  { key: "back", label: "Back", muscles: ["lats", "upper back", "traps", "lower back"] },
  { key: "arms", label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { key: "core", label: "Core", muscles: ["core", "obliques", "pelvic floor"] },
  { key: "legs", label: "Legs", muscles: ["quads", "hamstrings", "glutes", "adductors", "abductors", "hip flexors", "calves", "tibialis"] },
];
const ALL_MUSCLES = new Set(MUSCLE_GROUPS.flatMap(g => g.muscles));

export const kindsFor = () => ({
  workOn: Object.entries(WORK_ON).map(([key, w]) => ({ key, label: w.label })),
  muscleGroups: MUSCLE_GROUPS,
  kinds: Object.entries(KINDS).map(([key, k]) => ({ key, label: k.label, about: k.about, days: k.days, goal: k.goal })),
  focus: Object.entries(FOCUS).map(([key, f]) => ({ key, label: f.label })),
  minutes: Object.keys(MINUTES).map(Number),
  dayKinds: dayKindsList(),
});

/* Which muscles count for a single-muscle exercise on a day. */
const ISOLATION = {
  "isolation-push": ["chest", "front delts", "side delts", "triceps"],
  "isolation-pull": ["lats", "upper back", "rear delts", "biceps", "forearms", "traps"],
  "isolation-lower": ["quads", "hamstrings", "glutes", "adductors", "abductors", "calves", "tibialis", "hip flexors"],
};
const UPPER_PATTERNS = new Set(["push-horizontal", "pull-horizontal", "push-vertical", "pull-vertical", "isolation-push", "isolation-pull"]);
const LOWER_PATTERNS = new Set(["squat", "hinge", "lunge", "isolation-lower"]);

/* Whether a version is of a pattern as the designer means it. */
function ofPattern(x, pattern) {
  const p = library.familyOf(x)?.pattern;
  if (ISOLATION[pattern]) return p === "isolation" && (x.primary || []).some(m => ISOLATION[pattern].includes(m));
  return p === pattern;
}
/* The designer's pattern for a version (isolation split by body part). */
function patternOfX(x) {
  const p = library.familyOf(x)?.pattern;
  if (p !== "isolation") return p;
  return Object.keys(ISOLATION).find(k => (x.primary || []).some(m => ISOLATION[k].includes(m))) || p;
}

/* The days a program of a kind starts with: Upper A, Lower A, Upper B … */
export function startingDays(kindKey, count) {
  const kind = KINDS[kindKey] || KINDS.full;
  const n = Math.min(Math.max(Number(count) || kind.days, 1), 7);
  const cycle = kind.cycle;
  const rounds = Math.ceil(n / cycle.length);
  return Array.from({ length: n }, (_, i) => {
    const dk = cycle[i % cycle.length];
    const round = Math.floor(i / cycle.length);
    if (cycle.length === 1) return { kind: dk, name: dk === "circuit" ? `Circuit ${String.fromCharCode(65 + i)}` : `Day ${String.fromCharCode(65 + i)}` };
    return { kind: dk, name: `${DAY_KINDS[dk].short || DAY_KINDS[dk].label}${rounds > 1 ? ` ${String.fromCharCode(65 + round)}` : ""}` };
  });
}

/* ------------------------------------------------------ reading values */

/** Rest typed as "90", "90 s", "2 min", "1:30" or "2–3 min" → seconds (the first), or null. */
export function parseRest(text) {
  const t = String(text ?? "").trim().toLowerCase();
  if (!t) return null;
  let m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d+(?:\.\d+)?)\s*(?:[–-]\s*\d+(?:\.\d+)?\s*)?(s|sec|secs|seconds?|m|min|mins|minutes?)?$/.exec(t);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Math.round(m[2] && m[2].startsWith("m") ? n * 60 : n);
}
export const restWords = (s) => (s == null ? "" : s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

/* "8–12", "10", "3-5" → [low, high]; anything else (30 s, AMRAP, 10 each side) → null. */
function range(text) {
  const m = /^(\d+)(?:\s*(?:–|-|to)\s*(\d+))?$/.exec(String(text || "").trim());
  return m ? [Number(m[1]), Number(m[2] ?? m[1])] : null;
}
const TEMPO = /^[0-9xX](?:-[0-9xX]){2,3}$/;
/* Seconds of one rep from a tempo; X counts as one. */
const repSeconds = (tempo) => tempo.split("-").reduce((n, p) => n + (/x/i.test(p) ? 1 : Number(p)), 0);

/* ------------------------------------------------------------ the store */

const now = () => new Date().toISOString();
const parseList = (s) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const text = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** A program of this trainer's, or null: never another trainer's. */
export const programOf = (trainerId, id) =>
  get(`SELECT * FROM coach_programs WHERE id = ? AND trainer_id = ? AND archived = 0`, [id, trainerId]);

/** The program a day or an exercise belongs to, if it is this trainer's. */
export async function programOfDay(trainerId, dayId) {
  const d = await get(`SELECT program_id FROM coach_program_days WHERE id = ?`, [dayId]);
  return d ? programOf(trainerId, d.program_id) : null;
}
export async function programOfExercise(trainerId, peId) {
  const e = await get(`SELECT program_id FROM coach_program_exercises WHERE id = ?`, [peId]);
  return e ? programOf(trainerId, e.program_id) : null;
}

export async function list(trainerId) {
  const rows = await all(`SELECT * FROM coach_programs WHERE trainer_id = ? AND archived = 0 ORDER BY updated_at DESC`, [trainerId]);
  const out = [];
  for (const r of rows) {
    const days = await get(`SELECT COUNT(*) AS n FROM coach_program_days WHERE program_id = ?`, [r.id]);
    const ex = await get(`SELECT COUNT(*) AS n FROM coach_program_exercises WHERE program_id = ?`, [r.id]);
    out.push({ id: r.id, name: r.name, clientId: r.client_id, clientName: r.client_name, goal: r.goal, goalLabel: GOALS[r.goal]?.label || r.goal, kindLabel: (KINDS[r.kind] || KINDS.full).label,
      level: r.level, days: Number(days.n), exercises: Number(ex.n), updatedAt: r.updated_at });
  }
  return out;
}

/** What makes a program's details worth keeping, or the reason not. */
export function checkDetails(body = {}, { creating = false } = {}) {
  if (creating && body.kind !== undefined && !KINDS[body.kind]) return "Choose what kind of program it is.";
  if (creating && body.daysPerWeek !== undefined && !(Number.isInteger(body.daysPerWeek) && body.daysPerWeek >= 1 && body.daysPerWeek <= 7)) return "Choose 1 to 7 days a week.";
  if (body.focus !== undefined && (!Array.isArray(body.focus) || body.focus.some(f => !FOCUS[f]))) return "Choose what to focus on from the list.";
  if (body.minutes !== undefined && body.minutes !== null && !MINUTES[body.minutes]) return "Choose how long a session is.";
  if ((creating || body.name !== undefined) && !text(body.name, 120)) return "Give the program a name.";
  if ((creating || body.goal !== undefined) && !GOALS[body.goal]) return "Choose what it is for.";
  if ((creating || body.level !== undefined) && !LEVELS.includes(body.level)) return "Choose the client's level.";
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) return "Keep the notes under 2,000 characters.";
  return null;
}

export async function create(trainerId, client, placeId, body) {
  const stamp = now();
  const kind = KINDS[body.kind] ? body.kind : "full";
  const days = startingDays(kind, body.daysPerWeek);
  const id = await insertWithNewId("program", (newId) => run(
    `INSERT INTO coach_programs (id, trainer_id, client_id, client_name, place_id, name, goal, level, notes, kind, days_per_week, minutes, focus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, trainerId, client.id, `${client.firstName} ${client.lastName}`.trim(), placeId || "", text(body.name, 120), body.goal, body.level, text(body.notes ?? "", 2000),
      kind, days.length, MINUTES[body.minutes] ? Number(body.minutes) : null, JSON.stringify([...new Set(body.focus || [])]), stamp, stamp]));
  for (const d of days) await addDay(id, d.name, d.kind);
  return id;
}

const touch = (programId) => run(`UPDATE coach_programs SET updated_at = ? WHERE id = ?`, [now(), programId]);

export async function update(program, body, { client, placeId } = {}) {
  const f = {};
  if (body.name !== undefined) f.name = text(body.name, 120);
  if (body.goal !== undefined) f.goal = body.goal;
  if (body.level !== undefined) f.level = body.level;
  if (body.notes !== undefined) f.notes = text(body.notes, 2000);
  if (body.focus !== undefined) f.focus = JSON.stringify([...new Set(body.focus)]);
  if (body.minutes !== undefined) f.minutes = MINUTES[body.minutes] ? Number(body.minutes) : null;
  if (placeId !== undefined) f.place_id = placeId;
  if (client) { f.client_id = client.id; f.client_name = `${client.firstName} ${client.lastName}`.trim(); }
  const keys = Object.keys(f);
  if (keys.length) await run(`UPDATE coach_programs SET ${keys.map(k => `${k} = ?`).join(", ")} WHERE id = ?`, [...keys.map(k => f[k]), program.id]);
  await touch(program.id);
}

/* Archived, not deleted: a client may come back to it. */
export async function archive(program) {
  await run(`UPDATE coach_programs SET archived = 1, updated_at = ? WHERE id = ?`, [now(), program.id]);
}

/* ------------------------------------------------------------- the days */

export async function addDay(programId, name, kind = "full") {
  const top = await get(`SELECT MAX(pos) AS top FROM coach_program_days WHERE program_id = ?`, [programId]);
  const id = await insertWithNewId("programDay", (newId) => run(
    `INSERT INTO coach_program_days (id, program_id, name, pos, kind) VALUES (?, ?, ?, ?, ?)`, [newId, programId, text(name, 80) || "A day", (Number(top?.top) || 0) + 1, DAY_KINDS[kind] ? kind : "full"]));
  await touch(programId);
  return id;
}

/* The next day after the ones there, in the program's turn: Day B after Day
   A, Lower B after Upper B. */
export async function nextDay(program) {
  const days = await all(`SELECT name FROM coach_program_days WHERE program_id = ?`, [program.id]);
  const kind = KINDS[program.kind] || KINDS.full;
  const dk = kind.cycle[days.length % kind.cycle.length];
  const base = kind.cycle.length === 1 ? (dk === "circuit" ? "Circuit" : "Day") : DAY_KINDS[dk].short || DAY_KINDS[dk].label;
  for (let i = 0; i < 26; i++) {
    const name = `${base} ${String.fromCharCode(65 + i)}`;
    if (!days.some(d => d.name === name || (i === 0 && d.name === base))) return { name, kind: dk };
  }
  return { name: `${base} ${days.length + 1}`, kind: dk };
}

export async function updateDay(dayId, programId, body) {
  if (body.name !== undefined) {
    if (!text(body.name, 80)) return "Give the day a name.";
    await run(`UPDATE coach_program_days SET name = ? WHERE id = ?`, [text(body.name, 80), dayId]);
  }
  if (body.notes !== undefined) await run(`UPDATE coach_program_days SET notes = ? WHERE id = ?`, [text(body.notes, 1000), dayId]);
  if (body.kind !== undefined) {
    if (!DAY_KINDS[body.kind]) return "Choose what the day trains.";
    await run(`UPDATE coach_program_days SET kind = ? WHERE id = ?`, [body.kind, dayId]);
  }
  await touch(programId);
  return null;
}

export async function deleteDay(dayId, programId) {
  await run(`DELETE FROM coach_program_exercises WHERE day_id = ?`, [dayId]);
  await run(`DELETE FROM coach_program_days WHERE id = ?`, [dayId]);
  await touch(programId);
}

/* Up (-1) or down (1) one place among its siblings. */
async function move(table, id, scope, scopeId, dir) {
  const rows = await all(`SELECT id, pos FROM ${table} WHERE ${scope} = ? ORDER BY pos, id`, [scopeId]);
  const at = rows.findIndex(r => r.id === id);
  const to = at + (dir < 0 ? -1 : 1);
  if (at === -1 || to < 0 || to >= rows.length) return;
  [rows[at], rows[to]] = [rows[to], rows[at]];
  for (let i = 0; i < rows.length; i++) await run(`UPDATE ${table} SET pos = ? WHERE id = ?`, [i + 1, rows[i].id]);
}
export async function moveDay(dayId, programId, dir) { await move("coach_program_days", dayId, "program_id", programId, dir); await touch(programId); }

/* --------------------------------------------------------- the exercises */

/** What a trainer typed for an exercise, tidied; or { error }. Only the exercise is needed. */
export function doseFrom(body = {}) {
  const out = {};
  const field = (key, max) => { if (body[key] !== undefined) out[key] = text(String(body[key] ?? ""), max); };
  field("sets", 20); field("reps", 40); field("load", 60); field("effort", 60); field("tempo", 20); field("note", 300);
  if (out.tempo) {
    const t = out.tempo.replace(/\s+/g, "").replace(/[–—]/g, "-");
    out.tempo = TEMPO.test(t) ? t.toUpperCase() : out.tempo;
  }
  if (body.rest !== undefined) {
    const s = parseRest(body.rest);
    if (s === undefined) return { error: "Write rest as seconds or minutes, such as 90 s or 2 min." };
    out.rest = s;
  }
  if (body.superset !== undefined) out.superset = body.superset ? 1 : 0;
  return out;
}

const COLUMNS = { sets: "sets", reps: "reps", load: "load_text", effort: "effort", tempo: "tempo", rest: "rest_seconds", note: "note", superset: "superset" };

export async function addExercise(program, dayId, exerciseId, dose) {
  const top = await get(`SELECT MAX(pos) AS top FROM coach_program_exercises WHERE day_id = ?`, [dayId]);
  const id = await insertWithNewId("programExercise", (newId) => run(
    `INSERT INTO coach_program_exercises (id, program_id, day_id, exercise_id, pos) VALUES (?, ?, ?, ?, ?)`,
    [newId, program.id, dayId, exerciseId, (Number(top?.top) || 0) + 1]));
  await updateExercise(id, program.id, dose);
  return id;
}

export async function updateExercise(peId, programId, dose, exerciseId) {
  const keys = Object.keys(dose).filter(k => COLUMNS[k]);
  if (exerciseId) await run(`UPDATE coach_program_exercises SET exercise_id = ? WHERE id = ?`, [exerciseId, peId]);
  if (keys.length) await run(`UPDATE coach_program_exercises SET ${keys.map(k => `${COLUMNS[k]} = ?`).join(", ")} WHERE id = ?`, [...keys.map(k => dose[k]), peId]);
  await touch(programId);
}

export async function deleteExercise(peId, programId) {
  await run(`DELETE FROM coach_program_exercises WHERE id = ?`, [peId]);
  await touch(programId);
}

export async function moveExercise(peId, programId, dir) {
  const e = await get(`SELECT day_id FROM coach_program_exercises WHERE id = ?`, [peId]);
  if (e) await move("coach_program_exercises", peId, "day_id", e.day_id, dir);
  await touch(programId);
}

/** Whether an exercise may go in this trainer's program: the library's, or one of their own. */
export async function canUse(trainerId, exerciseId) {
  if (library.isExercise(exerciseId)) return true;
  return !!await library.privateBrief(trainerId, exerciseId);
}

/* ------------------------------------------------------- the whole thing */

/* The trainer's own name for each exercise they have tied one to: their word wins. */
async function theirNames(trainerId) {
  const rows = await all(`SELECT name, exercise_id FROM coach_own_names WHERE trainer_id = ? AND exercise_id != '' ORDER BY created_at`, [trainerId]);
  const out = new Map();
  for (const r of rows) if (!out.has(r.exercise_id)) out.set(r.exercise_id, r.name);
  return out;
}

/* What the program's checks and suggestions need to know about its world,
   and what the client has done in this trainer's earlier programs. */
async function context(trainerId, program) {
  const { places } = await equipment.equipmentOf(trainerId);
  const place = places.find(p => p.id === program.place_id) || null;
  const lims = await limitations.limitationsOf(program.client_id, trainerId);
  const history = await historyOf(trainerId, program.client_id, { before: program });
  return { places, place, rules: limitations.rulesOf(lims), hasLimitations: lims.length > 0, ...history.steps, oneRms: await oneRmsOf(program.client_id) };
}

/* The client's latest 1RM for each exercise (fitness-tests.js, kind onerm;
   Glenn, 19 Oct 2026), for a load written as a percentage of it. */
async function oneRmsOf(clientId) {
  const out = new Map();
  for (const r of await all(`SELECT data, result, taken_on FROM coach_fitness_tests WHERE client_id = ? AND kind = 'onerm' ORDER BY taken_on DESC, created_at DESC`, [clientId])) {
    let d; try { d = JSON.parse(r.data || "{}"); } catch { d = {}; }
    if (d.exerciseId && !out.has(d.exerciseId)) out.set(d.exerciseId, { kg: Number(r.result), takenOn: r.taken_on });
  }
  return out;
}

/* ---------------------------------------------- what the client has done */

const WEEK = 7 * 24 * 3600 * 1000;
/* Weeks on programs at one level, without stepping back, before Coach IQ
   puts the next level forward. The principles' beginner is in the first
   months; a guess the trainer can always overrule. */
const WEEKS_TO_MOVE_UP = 12;

/**
 * What this trainer's programs for a client say about them (Glenn, 18 Oct
 * 2026: "see how many program they have and how the progression is there, or
 * even the regression"). Coach keeps no fitness level of a client's own, and
 * Studio sends none, so it comes from the programs: the level of the latest,
 * a level up after WEEKS_TO_MOVE_UP weeks at it without stepping back, and
 * whether the exercises got harder or easier from one program to the next
 * (their library levels on average). With no programs, level is null and the
 * trainer is asked. `before` leaves out that program and any made after it.
 *
 * steps: the exercises done (done), the next harder step of each (next, to
 * the name of the one it follows) and the easier ones they have moved past
 * (outgrown, likewise).
 */
export async function historyOf(trainerId, clientId, { before = null } = {}) {
  const rows = await all(`SELECT id, name, level, created_at FROM coach_programs WHERE trainer_id = ? AND client_id = ? ORDER BY created_at, id`, [trainerId, clientId]);
  const list = [];
  for (const p of rows) {
    if (before && (p.id === before.id || p.created_at > before.created_at)) continue;
    const xs = (await all(`SELECT exercise_id FROM coach_program_exercises WHERE program_id = ?`, [p.id]))
      .map(r => library.exerciseById(r.exercise_id)).filter(Boolean);
    list.push({ ...p, xs, reach: xs.length ? xs.reduce((n, x) => n + LEVELS.indexOf(x.level), 0) / xs.length : null });
  }
  const done = new Set(), next = new Map(), outgrown = new Map();
  for (const p of list) for (const x of p.xs) done.add(x.id);
  for (const p of list) for (const x of p.xs) {
    for (const h of x.harder || []) if (!done.has(h) && !next.has(h)) next.set(h, x.name);
    /* Every easier step down the chain: past a goblet squat is past a box
       squat and a sit to stand. */
    const down = [...library.easierOf(x.id)];
    while (down.length) {
      const e = down.shift();
      if (done.has(e) || outgrown.has(e)) continue;
      outgrown.set(e, x.name);
      down.push(...library.easierOf(e));
    }
  }
  const steps = { steps: { done, next, outgrown } };
  if (!list.length) return { level: null, programs: 0, trend: null, ...steps };

  const last = list[list.length - 1];
  const at = LEVELS.indexOf(last.level);
  const filled = list.filter(p => p.reach !== null);
  const [a, b] = filled.slice(-2);
  const prevLevel = list.length > 1 ? LEVELS.indexOf(list[list.length - 2].level) : at;
  const trend = prevLevel > at || (b && a.reach - b.reach >= 0.25) ? "down"
    : prevLevel < at || (b && b.reach - a.reach >= 0.25) ? "up" : list.length > 1 ? "steady" : null;
  let first = list.length - 1;
  while (first > 0 && list[first - 1].level === last.level) first--;
  const weeks = Math.floor((Date.now() - Date.parse(list[first].created_at)) / WEEK);
  const count = `${list.length} program${list.length === 1 ? "" : "s"} with you`;
  const reached = (b || a) && (b || a).reach >= at - 0.5;
  if (trend !== "down" && at < LEVELS.length - 1 && weeks >= WEEKS_TO_MOVE_UP && reached) {
    return { level: LEVELS[at + 1], programs: list.length, trend, ...steps,
      why: `${count}, on ${last.level} programs for ${weeks} weeks without stepping back: time for ${LEVELS[at + 1]}.` };
  }
  return { level: last.level, programs: list.length, trend, ...steps,
    why: trend === "down" ? `${count}. Their last program stepped back to easier exercises, so ${last.level} for now.`
      : trend === "up" ? `${count}, getting harder from one to the next. The last, “${last.name}”, was ${last.level}.`
      : `${count}. The last, “${last.name}”, was ${last.level}.` };
}

/** A program as the designer, the print page and Billy are shown it. */
export async function full(trainerId, program, { withCheck = true } = {}) {
  const days = await all(`SELECT * FROM coach_program_days WHERE program_id = ? ORDER BY pos, id`, [program.id]);
  const rows = await all(`SELECT * FROM coach_program_exercises WHERE program_id = ? ORDER BY pos, id`, [program.id]);
  const names = await theirNames(trainerId);
  const ctx = await context(trainerId, program);
  const own = new Map();
  for (const r of rows) {
    if (!library.isExercise(r.exercise_id) && !own.has(r.exercise_id)) own.set(r.exercise_id, await library.privateBrief(trainerId, r.exercise_id));
  }
  const shape = (r) => {
    const x = library.exerciseById(r.exercise_id);
    const p = own.get(r.exercise_id);
    return {
      id: r.id, exerciseId: r.exercise_id,
      name: names.get(r.exercise_id) || x?.name || p?.name || "An exercise no longer in the library",
      ...(x ? { libraryName: x.name, master: library.masterOf(x), level: x.level, retired: x.status === "retired" } : {}),
      ...(p ? { own: true } : {}),
      superset: !!Number(r.superset),
      sets: r.sets, reps: r.reps, load: r.load_text, effort: r.effort, tempo: r.tempo,
      /* A load as a percentage of the client's 1RM for it, worked out. */
      ...(ctx.oneRms.get(r.exercise_id) ? { oneRm: ctx.oneRms.get(r.exercise_id) } : {}),
      ...(percentOf(r.load_text) && ctx.oneRms.get(r.exercise_id) ? { loadKg: Math.round(kgAt(ctx.oneRms.get(r.exercise_id).kg, percentOf(r.load_text)) * 100) / 100 } : {}),
      rest: r.rest_seconds == null ? null : Number(r.rest_seconds), restText: restWords(r.rest_seconds == null ? null : Number(r.rest_seconds)), note: r.note,
    };
  };
  const out = {
    id: program.id, name: program.name, clientId: program.client_id, clientName: program.client_name,
    placeId: program.place_id, placeName: ctx.place?.name || null, goal: program.goal, goalLabel: GOALS[program.goal]?.label || program.goal,
    level: program.level, notes: program.notes, createdAt: program.created_at, updatedAt: program.updated_at,
    kind: program.kind || "full", kindLabel: (KINDS[program.kind] || KINDS.full).label, minutes: program.minutes == null ? null : Number(program.minutes),
    focus: parseList(program.focus), focusLabels: parseList(program.focus).map(f => FOCUS[f]?.label).filter(Boolean),
    /* With the one above means nothing for a day's first exercise. */
    days: days.map(d => ({ id: d.id, name: d.name, notes: d.notes, kind: d.kind || "full", kindLabel: (DAY_KINDS[d.kind] || DAY_KINDS.full).label, exercises: rows.filter(r => r.day_id === d.id).map(shape).map((e, i) => (i ? e : { ...e, superset: false })) })),
    places: ctx.places.map(p => ({ id: p.id, name: p.name, ...(p.fromStudio ? { fromStudio: true } : {}) })),
    /* The client's latest 1RM for each exercise, for the exercise dialog. */
    oneRms: Object.fromEntries(ctx.oneRms),
  };
  if (withCheck) out.check = check(out, rows, ctx, own);
  return out;
}

/* ------------------------------------------------------------ the check */

/*
 * Each point: { level: "stop" | "warn" | "note", text, from, day?, exercise? }
 * where `from` names what it comes from: a principle (rest, reps, sets …), or
 * the library, the client's limitations or the place's equipment.
 */
function check(program, rows, ctx, own) {
  const points = [];
  const goal = GOALS[program.goal] || GOALS.general;
  const level = LEVELS.indexOf(program.level);
  const beginner = program.level === "beginner";
  const add = (p) => points.push(p);

  if (!ctx.place) add({ level: "note", from: "equipment", text: "No place chosen, so the equipment isn't checked. Choose where they train." });
  if (beginner && program.days.length > 4) {
    add({ level: "note", from: "frequency-and-variety", text: `${program.days.length} days: early on two sessions a week are enough, and three or four after the first weeks.` });
  }

  for (const day of program.days) {
    const dayRows = rows.filter(r => r.day_id === day.id);
    let sets = 0, counted = 0;
    let sawLater = null;
    for (const e of day.exercises) {
      const x = library.exerciseById(e.exerciseId);
      const at = { day: day.id, exercise: e.id };
      const s = range(e.sets);
      if (s) { sets += s[1]; counted++; }
      if (x) {
        if (x.status === "retired") {
          const r = x.replacedBy && library.exerciseById(x.replacedBy);
          add({ ...at, level: "warn", from: "library", text: `${e.name} is retired from the library${r ? `: ${r.name} replaces it` : ""}.` });
        }
        if (ctx.place) {
          const fit = library.placeCheck(x, ctx.place);
          if (fit === "no") add({ ...at, level: "stop", from: "equipment", text: `${e.name} needs equipment that “${ctx.place.name}” doesn't have. Swap it.` });
          else if (Array.isArray(fit)) add({ ...at, level: "note", from: "equipment", text: `${e.name}: nobody has said whether “${ctx.place.name}” has ${fit.join(", ").toLowerCase()}. Check before the session.` });
        }
        const lim = library.limitsCheck(x, ctx.rules);
        if (lim === "no") add({ ...at, level: "stop", from: "limitations", text: `${e.name} is something ${program.clientName}'s limitations say to avoid. Swap it.` });
        else if (lim.length) add({ ...at, level: "warn", from: "limitations", text: `${e.name}: make it easier or supported for ${program.clientName} (${lim.join(", ")}).` });
        if (LEVELS.indexOf(x.level) > level) add({ ...at, level: "warn", from: "starting-out", text: `${e.name} is ${x.level}, above ${program.clientName}'s level (${program.level}).` });
        else if (ctx.outgrown?.has(x.id)) add({ ...at, level: "note", from: "progression", text: `${e.name} is a step back from ${ctx.outgrown.get(x.id)}, which ${program.clientName} did in an earlier program. Fine if that's the plan.` });
        /* The usual order: main lifts before accessories and finishers. */
        const roles = library.familyOf(x)?.roles || [];
        if (roles.includes("main") && !roles.includes("accessory") && sawLater) {
          add({ ...at, level: "note", from: "library", text: `${e.name} is usually a main lift, done before ${sawLater}.` });
        }
        if (!sawLater && (roles.includes("finisher") || (roles.includes("accessory") && !roles.includes("main")))) sawLater = e.name;
      } else if (own.get(e.exerciseId)) {
        const p = own.get(e.exerciseId);
        if (ctx.place && p.needs.length) {
          const has = new Set(ctx.place.categories.filter(c => c.has === true).map(c => c.key));
          const missing = p.needs.filter(k => !has.has(k) && ctx.place.categories.find(c => c.key === k)?.has === false);
          if (missing.length) add({ ...at, level: "stop", from: "equipment", text: `${e.name} needs ${missing.map(library.kindLabel).join(", ").toLowerCase()}, which “${ctx.place.name}” doesn't have.` });
        }
      }
      const r = range(e.reps);
      if (r && goal.reps_range) {
        if (r[1] < goal.reps_range[0] || r[0] > goal.reps_range[1]) {
          add({ ...at, level: "note", from: "reps", text: `${e.name}: ${e.reps} reps is outside ${goal.reps_range[0]}–${goal.reps_range[1]}, the usual range for ${goal.label.toLowerCase()}.` });
        }
      }
      if (r && beginner && r[0] < 8) add({ ...at, level: "note", from: "reps", text: `${e.name}: in the first year about 8 reps and up work best; ${e.reps} is heavy for a beginner.` });
      /* A load as a percentage of 1RM (Glenn, 19 Oct 2026): something to go
         by, no more than all of it, and reps that can be done at it. */
      const pct = percentOf(e.load);
      if (pct != null) {
        if (!e.oneRm) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: ${pct}% of a 1RM ${program.clientName} hasn't got for it. Add one in their Fitness tests, or write the weight.` });
        else if (pct > 100) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: ${pct}% is more than their 1RM, the most they can lift once.` });
        else if (r && r[0] > maxRepsAt(pct) + 1) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: at ${pct}% of 1RM about ${maxRepsAt(pct)} reps can be done; ${e.reps} asks for more. Lighten it, or fewer reps.` });
      }
      if (e.rest != null && goal.rest_range && !e.superset) {
        if (e.rest < goal.rest_range[0] || e.rest > goal.rest_range[1]) {
          add({ ...at, level: "note", from: "rest", text: `${e.name}: ${e.restText} rest is outside ${restWords(goal.rest_range[0])}–${restWords(goal.rest_range[1])}, the usual for ${goal.label.toLowerCase()}.` });
        }
      }
      if (e.tempo) {
        if (!TEMPO.test(e.tempo)) add({ ...at, level: "note", from: "tempo", text: `${e.name}: write tempo as four numbers, lowering-pause-lifting-pause, such as 3-1-1-0 (X for fast).` });
        else if (r && (program.goal === "strength" || program.goal === "power") && repSeconds(e.tempo) * r[1] > 60) {
          add({ ...at, level: "note", from: "tempo", text: `${e.name}: ${r[1]} reps at ${e.tempo} is over 60 seconds of work; past that a strength set turns into endurance.` });
        }
      }
    }
    if (counted) {
      if (sets > 30 || (beginner && sets > 36)) add({ day: day.id, level: "warn", from: beginner ? "starting-out" : "sets", text: `${day.name}: about ${sets} sets. Well beyond 30 the quality of the work falls; keep a session under about 20–25.` });
      else if (sets > 25) add({ day: day.id, level: "note", from: "sets", text: `${day.name}: about ${sets} sets, over the 20–25 a session usually holds.` });
    }
    if (beginner && dayRows.length > 7) add({ day: day.id, level: "note", from: "starting-out", text: `${day.name}: ${dayRows.length} exercises. A beginner's session is usually 4–7, unless it is a circuit.` });
    const fits = MINUTES[program.minutes];
    if (fits && dayRows.length > fits + 1) add({ day: day.id, level: "note", from: "sets", text: `${day.name}: ${dayRows.length} exercises, more than about ${fits} fit in a ${program.minutes}-minute session.` });
  }
  const order = { stop: 0, warn: 1, note: 2 };
  return points.sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------------------------------------------------- what comes next */

/* A starting dose from the principles, for the goal and the client's level;
   lighter for an accessory. Rest in seconds. */
export function doseFor(goalKey, level, { accessory = false } = {}) {
  const g = GOALS[goalKey] || GOALS.general;
  let sets = g.sets, reps = g.reps;
  if (level === "beginner") {
    sets = goalKey === "mobility" ? "1–2" : "1–3";
    if (reps) { const r = range(reps); reps = r && r[0] < 8 ? "8–12" : reps; }
  } else if (accessory && g.sets) {
    const s = range(g.sets);
    if (s) sets = `${Math.max(1, s[0] - 1)}–${Math.max(1, s[1] - 1)}`;
  }
  return { sets, reps, rest: g.rest };
}

/* The versions that could go in, judged as the check would: never one that
   fails the place, the level or the limitations. */
function candidates(ctx, level) {
  const top = LEVELS.indexOf(level);
  return library.liveExercises().filter(x => {
    if (LEVELS.indexOf(x.level) > top) return false;
    if (library.limitsCheck(x, ctx.rules) === "no") return false;
    if (ctx.place && library.placeCheck(x, ctx.place) === "no") return false;
    return true;
  });
}

/* Most suitable first: at the client's level, with nothing to ask, for the
   goal's purpose, and in the role wanted. */
function rank(list, ctx, { level, purpose, role }) {
  const want = LEVELS.indexOf(level);
  const score = (x) => {
    const f = library.familyOf(x);
    let s = 0;
    if ((f.purposes || []).includes(purpose)) s += 4;
    if (role && (f.roles || []).includes(role)) s += 3;
    if (ctx.place && Array.isArray(library.placeCheck(x, ctx.place))) s -= 3;
    const lim = library.limitsCheck(x, ctx.rules);
    if (Array.isArray(lim) && lim.length) s -= 2;
    s -= Math.abs(LEVELS.indexOf(x.level) - want);
    /* Progression: the next step of what they did before, ahead of the
       easier ones they have moved past. */
    if (ctx.next?.has(x.id)) s += 3;
    else if (ctx.outgrown?.has(x.id)) s -= 3;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

function suggestion(x, ctx, why, dose) {
  const fit = ctx.place ? library.placeCheck(x, ctx.place) : "yes";
  const lim = library.limitsCheck(x, ctx.rules);
  const step = ctx.next?.get(x.id);
  return {
    ...library.brief(x), why: step ? `${why} A step on from ${step}, from an earlier program.` : why,
    ...(Array.isArray(fit) ? { askFirst: fit } : {}),
    ...(Array.isArray(lim) && lim.length ? { modifyFor: lim } : {}),
    dose: { ...dose, restText: restWords(dose.rest) },
  };
}

/**
 * What fits what the trainer is working on, narrowed by kind of movement,
 * muscles, or both: versions that pass the place, the level and the
 * limitations, that are of that kind and work those muscles (a main muscle
 * counting three times an other one), not already on the day; the closest
 * first, then by the goal's purpose and the client's level as suggestNext
 * ranks. Each says why, and comes with a starting dose.
 */
export async function suggestFor(trainerId, program, dayId, { workOn = null, muscles = [] } = {}, limit = 6) {
  const ctx = await context(trainerId, program);
  const want = muscles.filter(m => ALL_MUSCLES.has(m));
  const kind = WORK_ON[workOn] || null;
  const onDay = new Set((await all(`SELECT exercise_id FROM coach_program_exercises WHERE day_id = ?`, [dayId])).map(r => r.exercise_id));
  const goal = GOALS[program.goal] || GOALS.general;
  const hits = (x) => {
    const main = (x.primary || []).filter(m => want.includes(m));
    const other = (x.secondary || []).filter(m => want.includes(m));
    /* Main muscles count, capped at two, so an exercise touching many of a
       whole group's muscles doesn't outrank the usual lifts for it; other
       muscles count only where no main one matches. Past that, the usual
       ranking (the goal, the level, a main lift) decides. */
    return { main, other, score: main.length ? Math.min(main.length, 2) * 3 : other.length ? 1 : 0 };
  };
  /* Stretches and breathing only when asked for (Mobility) or the program is
     for mobility: "the lats" otherwise means training them. */
  const stretches = workOn === "mobility" || program.goal === "mobility";
  const pool = candidates(ctx, program.level).filter(x => !onDay.has(x.id)
    && (!kind || kind.matches(x))
    && (stretches || !["mobility", "breathing"].includes(library.familyOf(x)?.pattern))
    && (!want.length || hits(x).score > 0));
  /* Main lifts first, for strength or for muscles alone, and one version of
     each family before a second, so the list shows different movements
     rather than one in three versions. */
  const base = rank(pool, ctx, { level: program.level, purpose: workOn === "power" ? "power" : workOn === "cardio" ? "conditioning" : goal.purpose, role: !kind || workOn === "strength" ? "main" : null });
  const sorted = want.length ? [...base].sort((a, b) => hits(b).score - hits(a).score) : base;
  const seen = new Set();
  const firsts = sorted.filter(x => (seen.has(x.movement) ? false : seen.add(x.movement)));
  const order = [...firsts, ...sorted.filter(x => !firsts.includes(x))];
  const out = order.slice(0, limit).map(x => {
    const h = hits(x);
    const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]);
    const works = h.main.length ? `Works the ${and(h.main)}${h.other.length ? `, and some ${and(h.other)}` : ""}.`
      : h.other.length ? `Works some ${and(h.other)}.` : `Works the ${and(x.primary || [])}.`;
    const accessory = !(library.familyOf(x).roles || []).includes("main");
    return suggestion(x, ctx, works, doseFor(program.goal, program.level, { accessory }));
  });
  return {
    suggestions: out,
    narrowed: [kind?.label, want.length ? want.join(", ") : null].filter(Boolean).join(" · "),
    ...(ctx.place ? { place: ctx.place.name } : {}),
    ...(out.length ? {} : { none: "Nothing in the library passes the place, the level and the limitations for that. Try fewer muscles, or another kind of movement." }),
  };
}

/**
 * What could come next on a day: for each movement pattern the program
 * hasn't covered yet (then the ones this day hasn't), the most suitable
 * version, already passing the place, the level and the limitations, with a
 * starting dose. Up to `limit`, the program's gaps first.
 */
export async function suggestNext(trainerId, program, dayId, limit = 4) {
  const ctx = await context(trainerId, program);
  const rows = await all(`SELECT day_id, exercise_id FROM coach_program_exercises WHERE program_id = ?`, [program.id]);
  const patternOf = (id) => { const x = library.exerciseById(id); return x ? library.familyOf(x)?.pattern : null; };
  const inProgram = new Set(rows.map(r => patternOf(r.exercise_id)).filter(Boolean));
  const dayRows = rows.filter(r => r.day_id === dayId);
  const inDay = new Set(dayRows.map(r => patternOf(r.exercise_id)).filter(Boolean));
  const used = new Set(rows.map(r => r.exercise_id));
  const mainsToday = dayRows.filter(r => { const x = library.exerciseById(r.exercise_id); return x && (library.familyOf(x).roles || []).includes("main"); }).length;
  const goal = GOALS[program.goal] || GOALS.general;
  /* What this day trains (its kind), the program's focus first where the
     day trains it, then what neither the day nor the program has yet. */
  const day = await get(`SELECT kind FROM coach_program_days WHERE id = ?`, [dayId]);
  const dayKind = DAY_KINDS[day?.kind] ? day.kind : program.goal === "mobility" ? "mobility" : "full";
  const allowed = DAY_KINDS[dayKind].patterns;
  const upperOnly = ["upper", "push", "pull"].includes(dayKind), lowerOnly = ["lower", "legs"].includes(dayKind);
  const focus = parseList(program.focus).filter(f => FOCUS[f]);
  const focusOf = new Map();
  for (const f of focus) for (const p of FOCUS[f].patterns) if (!focusOf.has(p)) focusOf.set(p, f);
  const fits = (p) => !(upperOnly && LOWER_PATTERNS.has(p)) && !(lowerOnly && UPPER_PATTERNS.has(p)) && !(dayKind === "mobility" && !allowed.includes(p) && !p.startsWith("core"));
  const inDayX = new Set(dayRows.map(r => library.exerciseById(r.exercise_id)).filter(Boolean).map(patternOfX));
  const open = (p) => !inDayX.has(p) && !inDay.has(p);
  /* The day's own movements and the focus taken in turn, so the main lifts
     still come first; at most two for the focus on a day, fewer for what the
     day already has of it. */
  const focusInDay = [...inDayX, ...inDay].filter(p => focusOf.has(p)).length;
  const front = [...focusOf.keys()].filter(fits).filter(open).slice(0, Math.max(0, 2 - focusInDay));
  const base = [...new Set([...allowed.filter(p => !inProgram.has(p)), ...allowed])].filter(p => open(p) && !front.includes(p));
  const order = [];
  for (let i = 0; i < Math.max(base.length, front.length); i++) {
    if (base[i]) order.push(base[i]);
    if (front[i]) order.push(front[i]);
  }
  const pool = candidates(ctx, program.level).filter(x => !used.has(x.id));
  const out = [];
  for (const pattern of order) {
    if (out.length >= limit) break;
    const role = dayKind === "mobility" || dayKind === "circuit" ? null : mainsToday + out.length < 2 ? "main" : "accessory";
    const best = rank(pool.filter(x => ofPattern(x, pattern) && !out.some(o => o.id === x.id)), ctx, { level: program.level, purpose: goal.purpose, role })[0];
    if (!best) continue;
    const accessory = !(library.familyOf(best).roles || []).includes("main");
    const why = focusOf.has(pattern) ? `A focus of this program: ${FOCUS[focusOf.get(pattern)].label.toLowerCase()}.`
      : !inProgram.has(pattern) ? `Nothing in this program for ${patternWords(pattern)} yet.` : `Nothing on this day for ${patternWords(pattern)} yet.`;
    out.push(suggestion(best, ctx, why, doseFor(program.goal, program.level, { accessory })));
  }
  const holds = MINUTES[program.minutes];
  return {
    suggestions: out,
    day: DAY_KINDS[dayKind].label,
    ...(holds && dayRows.length >= holds ? { full: `This day has about as much as a ${program.minutes}-minute session holds.` } : {}),
    ...(ctx.place ? { place: ctx.place.name } : {}),
    ...(ctx.hasLimitations ? { limitationsChecked: true } : {}),
  };
}

const PATTERN_WORDS = {
  squat: "a squat", hinge: "a hinge (deadlift, hip thrust)", lunge: "single-leg work", "push-horizontal": "a horizontal push",
  "push-vertical": "an overhead push", "pull-horizontal": "a row", "pull-vertical": "a vertical pull", carry: "a carry",
  "core-anti-extension": "core work against arching", "core-anti-rotation": "core work against twisting", mobility: "mobility",
  breathing: "breathing", balance: "balance", conditioning: "conditioning", plyometric: "jumping", "core-lateral": "core work against bending sideways",
  "core-flexion": "core work bending forward", "isolation-push": "chest, shoulder or triceps work", "isolation-pull": "back or biceps work",
  "isolation-lower": "single-muscle leg work",
};
const patternWords = (p) => PATTERN_WORDS[p] || p;

/**
 * One exercise as the add-and-edit dialog shows it, for a day of this program
 * (Glenn, 17 Oct 2026: "When adding a new exercise, have a dialog asking what
 * exercise, reps, sets, etc before adding it to program"): what it is, what
 * Coach IQ says about it here before it goes in (stop, take care, ask first),
 * and a starting dose from the principles.
 */
export async function preview(trainerId, program, exerciseId) {
  const ctx = await context(trainerId, program);
  const names = await theirNames(trainerId);
  const x = library.exerciseById(exerciseId);
  if (!x) {
    const p = await library.privateBrief(trainerId, exerciseId);
    if (!p) return null;
    return {
      exercise: { id: p.id, name: names.get(p.id) || p.name, own: true, primary: p.primary, needs: p.needs.map(library.kindLabel), note: p.note },
      points: [{ level: "note", text: "Your own exercise: Coach IQ can't check it beyond its equipment." }],
      dose: doseFor(program.goal, program.level, { accessory: true }),
    };
  }
  const b = library.brief(x);
  const points = [];
  if (x.status === "retired") points.push({ level: "warn", text: "Retired from the library." });
  if (ctx.place) {
    const fit = library.placeCheck(x, ctx.place);
    if (fit === "no") points.push({ level: "stop", text: `Needs equipment that “${ctx.place.name}” doesn't have.` });
    else if (Array.isArray(fit)) points.push({ level: "note", text: `Nobody has said whether “${ctx.place.name}” has ${fit.join(", ").toLowerCase()}.` });
  }
  const lim = library.limitsCheck(x, ctx.rules);
  if (lim === "no") points.push({ level: "stop", text: `${program.client_name}'s limitations say to avoid it.` });
  else if (lim.length) points.push({ level: "warn", text: `Make it easier or supported for ${program.client_name} (${lim.join(", ")}).` });
  if (LEVELS.indexOf(x.level) > LEVELS.indexOf(program.level)) points.push({ level: "warn", text: `${x.level[0].toUpperCase() + x.level.slice(1)}, above ${program.client_name}'s level (${program.level}).` });
  const accessory = !(library.familyOf(x)?.roles || []).includes("main");
  return {
    exercise: { ...b, name: names.get(x.id) || x.name, libraryName: x.name, secondary: x.secondary || [] },
    points,
    dose: doseFor(program.goal, program.level, { accessory }),
  };
}

/** Alternatives for one exercise in a program: the library's, fitted to this program's world. */
export async function swapsFor(trainerId, program, exerciseId) {
  if (!library.isExercise(exerciseId)) return { alternatives: [], note: "Your own exercise: Coach IQ has no alternatives for it." };
  const ctx = await context(trainerId, program);
  const out = library.alternativesFor(exerciseId, { place: ctx.place, level: program.level, rules: ctx.hasLimitations ? ctx.rules : null });
  return { ...out, alternatives: out.alternatives.slice(0, 8) };
}

/* ----------------------------------------------------------- for Billy */

/** A program as Billy reads it: its days in words, the check, and what could come next on each day. */
export async function forBilly(trainerId, program) {
  const p = await full(trainerId, program);
  const next = {};
  for (const d of p.days) next[d.name] = (await suggestNext(trainerId, program, d.id, 3)).suggestions.map(s => ({ name: s.name, id: s.id, why: s.why, dose: s.dose, ...(s.askFirst ? { askFirst: s.askFirst } : {}), ...(s.modifyFor ? { modifyFor: s.modifyFor } : {}) }));
  return {
    id: p.id, name: p.name, client: p.clientName, place: p.placeName, goal: p.goalLabel, level: p.level, notes: p.notes,
    kind: p.kindLabel, ...(p.focusLabels.length ? { focus: p.focusLabels } : {}), ...(p.minutes ? { sessionMinutes: p.minutes } : {}),
    days: p.days.map(d => ({
      name: d.name, notes: d.notes, trains: d.kindLabel,
      exercises: d.exercises.map(e => {
        const out = { name: e.name };
        for (const k of ["sets", "reps", "load", "effort", "tempo", "note"]) if (e[k]) out[k] = e[k];
        /* A percentage load worked out, and the 1RM it is of, in kg (Billy says it in the trainer's units). */
        if (e.loadKg) out.loadWorkedOutKg = e.loadKg;
        if (e.oneRm) out.clientsOneRm = { kg: e.oneRm.kg, takenOn: e.oneRm.takenOn };
        if (e.restText) out.rest = e.restText;
        if (e.superset) out.withThePrevious = true;
        if (e.own) out.theirOwnExercise = true;
        return out;
      }),
    })),
    check: p.check.map(c => ({ level: c.level, text: c.text, from: c.from })),
    couldComeNext: next,
    dayIds: Object.fromEntries(p.days.map(d => [d.name, d.id])),
  };
}

/** The facts a check point can name, for the screen. */
export const FROM = {
  equipment: "the place's equipment", limitations: "the client's limitations", library: "Coach IQ's library",
  reps: "Reps", sets: "Sets", rest: "Rest", tempo: "Tempo", "starting-out": "Starting out", "frequency-and-variety": "How often, and keeping it varied",
};
