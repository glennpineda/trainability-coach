import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { LEVELS, measureOf } from "./coach-iq.js";
import * as library from "./library.js";
import * as equipment from "./equipment.js";
import * as limitations from "./limitations.js";
import * as workoutLogs from "./workout-logs.js";
import * as taste from "./taste.js";
import { percentOf, kgAt, maxRepsAt, weightText, oneRmText, unreadPercent, topReps } from "../src/lib/one-rm.js";
import { TECHNIQUE_KEYS, MAX_DROPS, isPyramid, groupSizes, techniqueText } from "../src/lib/techniques.js";
import { aOrAn, kindsWords, plural } from "../src/lib/words.js";
import { sessionSeconds, partSeconds, REST_DEFAULT } from "../src/lib/session-time.js";

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
/* What a day is dosed and checked for: a circuit day as conditioning and a
   mobility day as mobility, whatever the program is for (build 1.0.164: a
   strength program's mobility day had downward dog at 2–4 × 30–45 s with
   3 minutes' rest); any other day as the program. */
export const goalOfDay = (dayKind, goal) => (dayKind === "circuit" && goal !== "mobility" ? "fat-loss" : dayKind === "mobility" ? "mobility" : GOALS[goal] ? goal : "general");
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
  /* Made step by step, each day chosen on its own (build()); not offered in
     the kind-of-program step. Added days start again from the first day's. */
  own: { label: "Day by day", about: "Each day chosen on its own.", cycle: ["full"], days: 3, goal: "general", hidden: true },
};

/* What a program made step by step is to focus on (Glenn, 20 Oct 2026:
   "What do we want to focus on this workout program? (Strength, cardio,
   balance etc)"): one, which sets what it is for and so its doses; balance
   adds itself to the areas to focus on as well. */
export const AIMS = {
  strength: { label: "Strength", about: "Heavier weights, fewer reps, longer rests.", goal: "strength" },
  muscle: { label: "Muscle size", about: "Moderate weights and reps, to build muscle.", goal: "muscle" },
  power: { label: "Power", about: "Fast, explosive work: jumps, throws, quick lifts.", goal: "power" },
  cardio: { label: "Cardio and fat loss", about: "Keep moving, short rests, heart rate up.", goal: "fat-loss" },
  endurance: { label: "Strength endurance", about: "Lighter weights, more reps, lasting longer.", goal: "endurance" },
  balance: { label: "Balance and stability", about: "Steadier on their feet, one leg at a time.", goal: "general", focus: "balance" },
  mobility: { label: "Mobility", about: "Moving more freely: stretches, mobility and breathing.", goal: "mobility" },
  general: { label: "General fitness", about: "A bit of everything, to be fitter all round.", goal: "general" },
};

/* What each kind of day works, when the steps say nothing more: what a
   day's own movements run out on is filled with work for these. */
const DAY_MUSCLES = {
  full: ["quads", "glutes", "chest", "upper back", "core"],
  upper: ["chest", "lats", "side delts", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  push: ["chest", "front delts", "side delts", "triceps"],
  pull: ["lats", "upper back", "rear delts", "biceps"],
  legs: ["quads", "hamstrings", "glutes", "calves"],
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
  kinds: Object.entries(KINDS).filter(([, k]) => !k.hidden).map(([key, k]) => ({ key, label: k.label, about: k.about, days: k.days, goal: k.goal })),
  aims: Object.entries(AIMS).map(([key, a]) => ({ key, label: a.label, about: a.about })),
  focus: Object.entries(FOCUS).map(([key, f]) => ({ key, label: f.label })),
  minutes: Object.keys(MINUTES).map(Number),
  /* About how many exercises each length holds, for the steps to say. */
  holds: MINUTES,
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

/* A day's name without its letter: "Upper", "Push", "Full body". */
const dayBase = (dk) => (DAY_KINDS[dk] || DAY_KINDS.full).short || (DAY_KINDS[dk] || DAY_KINDS.full).label;

/* Days chosen one by one, named as startingDays names them: a kind there
   once by itself ("Push"), one there more than once lettered in turn
   ("Upper A", "Upper B"), and full-body days "Day A", "Day B" as before. */
export function namedDays(kinds) {
  const seen = {};
  return kinds.map(dk => {
    const many = kinds.filter(k => k === dk).length > 1;
    const i = seen[dk] = (seen[dk] ?? -1) + 1;
    const letter = String.fromCharCode(65 + i);
    if (dk === "full") return kinds.every(k => k === "full") ? `Day ${letter}` : many ? `Full body ${letter}` : "Full body";
    if (dk === "circuit" && kinds.every(k => k === "circuit")) return `Circuit ${letter}`;
    return many ? `${dayBase(dk)} ${letter}` : dayBase(dk);
  });
}

/* The kind of program a set of days chosen one by one adds up to: one of
   the usual turns where they follow it, else day by day. */
export function kindOfDays(kinds) {
  for (const [key, k] of Object.entries(KINDS)) {
    if (k.hidden) continue;
    if (kinds.length >= k.cycle.length && kinds.every((dk, i) => dk === k.cycle[i % k.cycle.length])) return key;
  }
  return "own";
}

/* The muscle groups a day works more, known ones only, each once. */
const GROUPS = Object.fromEntries(MUSCLE_GROUPS.map(g => [g.key, g]));
const musclesOf = (list) => [...new Set((Array.isArray(list) ? list : []).filter(m => GROUPS[m]))];

/*
 * The sets a session holds: 20–25 is the usual (sets.md), well beyond 30 the
 * quality falls. Those are for a session of about an hour; a longer one
 * holds more at the same rate (Glenn, 20 Oct 2026, asked whether long
 * sessions should go past 25 sets: "Yes it can"), so a 90-minute session
 * about 38, and too many past 45. Never fewer than the hour's.
 */
export const setsHeld = (mins) => Math.max(25, Math.round(25 * (Number(mins) || 60) / 60));
export const setsTooMany = (mins) => Math.max(30, Math.round(30 * (Number(mins) || 60) / 60));

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

/** This trainer's programs; with `putAway`, the ones put away instead (Run 1, U-5). */
export async function list(trainerId, { putAway = false } = {}) {
  const rows = await all(`SELECT * FROM coach_programs WHERE trainer_id = ? AND archived = ? ORDER BY updated_at DESC`, [trainerId, putAway ? 1 : 0]);
  /* Days and exercises counted for all of them at once, not two questions a
     program (Run 1, O-10). */
  const counts = async (table) => new Map((await all(`SELECT t.program_id, COUNT(*) AS n FROM ${table} t JOIN coach_programs p ON p.id = t.program_id
    WHERE p.trainer_id = ? AND p.archived = ? GROUP BY t.program_id`, [trainerId, putAway ? 1 : 0])).map(r => [r.program_id, Number(r.n)]));
  const [days, ex] = await Promise.all([counts("coach_program_days"), counts("coach_program_exercises")]);
  return rows.map(r => ({ id: r.id, name: r.name, clientId: r.client_id, clientName: r.client_name, goal: r.goal, goalLabel: GOALS[r.goal]?.label || r.goal, kindLabel: (KINDS[r.kind] || KINDS.full).label,
    level: r.level, days: days.get(r.id) || 0, exercises: ex.get(r.id) || 0, updatedAt: r.updated_at }));
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
  /* Made step by step, the days come already chosen (build()). */
  const days = Array.isArray(body.days) ? body.days : startingDays(kind, body.daysPerWeek);
  const id = await insertWithNewId("program", (newId) => run(
    `INSERT INTO coach_programs (id, trainer_id, client_id, client_name, place_id, name, goal, level, notes, kind, days_per_week, minutes, focus, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, trainerId, client.id, `${client.firstName} ${client.lastName}`.trim(), placeId || "", text(body.name, 120), body.goal, body.level, text(body.notes ?? "", 2000),
      kind, days.length, MINUTES[body.minutes] ? Number(body.minutes) : null, JSON.stringify([...new Set(body.focus || [])]), stamp, stamp]));
  for (const d of days) await addDay(id, d.name, d.kind, d);
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

/** A put-away program of this trainer's back on their list, or false when there is none. */
export async function putBack(trainerId, id) {
  const r = await get(`SELECT id FROM coach_programs WHERE id = ? AND trainer_id = ? AND archived = 1`, [id, trainerId]);
  if (!r) return false;
  await run(`UPDATE coach_programs SET archived = 0, updated_at = ? WHERE id = ?`, [now(), id]);
  return true;
}

/* ------------------------------------------------------------- the days */

/* `minutes` and `muscles`, a day's own session length and the muscle
   groups it works more, from the steps (build()). */
export async function addDay(programId, name, kind = "full", { minutes = null, muscles = [] } = {}) {
  const top = await get(`SELECT MAX(pos) AS top FROM coach_program_days WHERE program_id = ?`, [programId]);
  const id = await insertWithNewId("programDay", (newId) => run(
    `INSERT INTO coach_program_days (id, program_id, name, pos, kind, minutes, muscles) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId, programId, text(name, 80) || "A day", (Number(top?.top) || 0) + 1, DAY_KINDS[kind] ? kind : "full",
      MINUTES[minutes] ? Number(minutes) : null, JSON.stringify(musclesOf(muscles))]));
  await touch(programId);
  return id;
}

/* The next day after the ones there, in the program's turn: Day B after Day
   A, Lower B after Upper B. */
export async function nextDay(program) {
  const days = await all(`SELECT name, kind FROM coach_program_days WHERE program_id = ? ORDER BY pos, id`, [program.id]);
  const kind = KINDS[program.kind] || KINDS.full;
  /* Made day by day, the turn is its own days': after the last, the first's again. */
  const dk = program.kind === "own" && days.length && DAY_KINDS[days[0].kind] ? days[0].kind : kind.cycle[days.length % kind.cycle.length];
  const base = kind.cycle.length === 1 && program.kind !== "own" ? (dk === "circuit" ? "Circuit" : "Day") : dayBase(dk);
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
  if (body.minutes !== undefined) {
    if (body.minutes !== null && !MINUTES[body.minutes]) return "Choose how long the session is.";
    await run(`UPDATE coach_program_days SET minutes = ? WHERE id = ?`, [body.minutes === null ? null : Number(body.minutes), dayId]);
  }
  if (body.muscles !== undefined) {
    if (!Array.isArray(body.muscles) || body.muscles.some(m => !GROUPS[m])) return "Choose the muscle groups from the list.";
    await run(`UPDATE coach_program_days SET muscles = ? WHERE id = ?`, [JSON.stringify(musclesOf(body.muscles)), dayId]);
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
  /* Sets and reps are written freely ("8–12", "12, 10, 8", "AMRAP"), but
     never below one (Run 1, B-17). */
  const below = (v) => v && (/^[-–—]/.test(v) || /^0+(\D|$)/.test(v));
  if (below(out.sets)) return { error: "Sets start at 1. Write a number, or a range such as 3–4." };
  if (below(out.reps)) return { error: "Reps start at 1. Write a number, a range such as 8–12, or a list such as 12, 10, 8." };
  if (out.tempo) {
    const t = out.tempo.replace(/\s+/g, "").replace(/[–—]/g, "-");
    /* Read in three numbers or four, written in four (coach-iq/principles/tempo.md,
       "Read both, write four"): "3-1-1" is saved as "3-1-1-0" (Run 1, B-16). */
    out.tempo = TEMPO.test(t) ? (t.split("-").length === 3 ? `${t}-0` : t).toUpperCase() : out.tempo;
  }
  if (body.rest !== undefined) {
    const s = parseRest(body.rest);
    if (s === undefined) return { error: "Write rest as seconds or minutes, such as 90 s or 2 min." };
    out.rest = s;
  }
  if (body.superset !== undefined) out.superset = body.superset ? 1 : 0;
  /* A drop set or a pyramid (src/lib/techniques.js); drops only for a drop set. */
  if (body.technique !== undefined) {
    if (!TECHNIQUE_KEYS.includes(body.technique || "")) return { error: "Choose how the sets are done from the list." };
    out.technique = body.technique || "";
    if (out.technique !== "drop") out.drops = null;
  }
  if (body.drops !== undefined && (body.technique === undefined || body.technique === "drop")) {
    const n = body.drops === "" || body.drops === null ? null : Number(body.drops);
    if (n !== null && !(Number.isInteger(n) && n >= 1 && n <= MAX_DROPS)) return { error: `A drop set has 1 to ${MAX_DROPS} drops.` };
    out.drops = n;
  }
  return out;
}

const COLUMNS = { sets: "sets", reps: "reps", load: "load_text", effort: "effort", tempo: "tempo", rest: "rest_seconds", note: "note", superset: "superset", technique: "technique", drops: "drops" };

/* The parts of a day beside the session itself, which is ''. */
export const PARTS = { warmup: "Warm-up", cooldown: "Cool-down" };
export const partOf = (v) => (PARTS[v] ? v : "");

/* `byIq`: put in by Coach IQ building from the steps (taste.js learns from
   what the trainer then takes out). */
export async function addExercise(program, dayId, exerciseId, dose, part = "", { byIq = false } = {}) {
  const top = await get(`SELECT MAX(pos) AS top FROM coach_program_exercises WHERE day_id = ?`, [dayId]);
  const id = await insertWithNewId("programExercise", (newId) => run(
    `INSERT INTO coach_program_exercises (id, program_id, day_id, exercise_id, pos, part, by_iq) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId, program.id, dayId, exerciseId, (Number(top?.top) || 0) + 1, partOf(part), byIq ? 1 : 0]));
  await updateExercise(id, program.id, dose, null, { byTrainer: false });
  return id;
}

/* One exercise on a day as stored: its exercise and who chose it. */
export const exerciseRow = (peId) => get(`SELECT exercise_id, by_iq, part FROM coach_program_exercises WHERE id = ?`, [peId]);

/* `byTrainer`: a change the trainer made (the route), not the dose first written by addExercise. */
export async function updateExercise(peId, programId, dose, exerciseId, { byTrainer = true } = {}) {
  const keys = Object.keys(dose).filter(k => COLUMNS[k]);
  /* Swapped, it is the trainer's choice; Coach IQ's with its dose changed, still Coach IQ's but changed. */
  if (exerciseId) await run(`UPDATE coach_program_exercises SET exercise_id = ?, by_iq = 0 WHERE id = ?`, [exerciseId, peId]);
  else if (keys.length && byTrainer) await run(`UPDATE coach_program_exercises SET by_iq = 2 WHERE id = ? AND by_iq = 1`, [peId]);
  if (keys.length) await run(`UPDATE coach_program_exercises SET ${keys.map(k => `${COLUMNS[k]} = ?`).join(", ")} WHERE id = ?`, [...keys.map(k => dose[k]), peId]);
  await touch(programId);
}

export async function deleteExercise(peId, programId) {
  await run(`DELETE FROM coach_program_exercises WHERE id = ?`, [peId]);
  await touch(programId);
}

/* Up or down among the exercises in its own part of the day. */
export async function moveExercise(peId, programId, dir) {
  const e = await get(`SELECT day_id, part FROM coach_program_exercises WHERE id = ?`, [peId]);
  if (e) {
    const rows = await all(`SELECT id, part FROM coach_program_exercises WHERE day_id = ? ORDER BY pos, id`, [e.day_id]);
    const mine = rows.filter(r => (r.part || "") === (e.part || ""));
    const at = mine.findIndex(r => r.id === peId);
    const other = mine[at + (dir < 0 ? -1 : 1)];
    if (at !== -1 && other) {
      const a = rows.findIndex(r => r.id === peId), b = rows.findIndex(r => r.id === other.id);
      [rows[a], rows[b]] = [rows[b], rows[a]];
      for (let i = 0; i < rows.length; i++) await run(`UPDATE coach_program_exercises SET pos = ? WHERE id = ?`, [i + 1, rows[i].id]);
    }
  }
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
async function context(trainerId, program, { frozen = false } = {}) {
  const { places } = await equipment.equipmentOf(trainerId);
  const place = places.find(p => p.id === program.place_id) || null;
  /* A client no longer the trainer's: nothing new of theirs is read (Run 1,
     B-2; Glenn, 19 Oct 2026: "Freeze them"). */
  const lims = frozen ? [] : await limitations.limitationsOf(program.client_id, trainerId);
  const oneRms = frozen ? new Map() : await oneRmsOf(program.client_id);
  const history = await historyOf(trainerId, program.client_id, { before: program, tested: [...oneRms.keys()] });
  /* What was done last time with each exercise, from the client's logged sessions (Run 1, I-14). */
  const lastTime = frozen ? new Map() : await workoutLogs.lastByExercise(program.client_id);
  /* A logged session counts as done, on its day. */
  for (const [id, l] of lastTime) {
    if (!history.steps.seen.has(id) || history.steps.seen.get(id) < l.doneOn) history.steps.seen.set(id, l.doneOn);
    const f = library.exerciseById(id)?.movement;
    if (f) history.steps.families.add(f);
  }
  return { places, place, rules: limitations.rulesOf(lims), hasLimitations: lims.length > 0, ...history.steps, oneRms, lastTime,
    taste: await taste.tasteOf(trainerId), clientFirst: String(program.client_name || "").split(" ")[0] || "them" };
}

/* The client's latest 1RM for each exercise (fitness-tests.js, kind onerm;
   Glenn, 19 Oct 2026), for a load written as a percentage of it. */
async function oneRmsOf(clientId) {
  const out = new Map();
  for (const r of await all(`SELECT data, result, taken_on FROM coach_fitness_tests WHERE client_id = ? AND kind = 'onerm' ORDER BY taken_on DESC, created_at DESC`, [clientId])) {
    let d; try { d = JSON.parse(r.data || "{}"); } catch { d = {}; }
    if (d.exerciseId && !out.has(d.exerciseId)) out.set(d.exerciseId, { kg: Number(r.result), takenOn: r.taken_on, bodyWeightKg: d.bodyWeightKg ? Number(d.bodyWeightKg) : null });
  }
  return out;
}

/* ---------------------------------------------- what the client has done */

/* A level from a client's lifts (Run 1, U-15; Glenn, 19 Oct 2026: "Suggest
   a level"): a 1RM over their body weight on the four barbell lifts, against
   the bands most strength-standard tables give, rounded, men and women apart.
   Below the first number is beginner, from it intermediate, from the second
   advanced. A guide for the trainer, not a rule (Glenn, 19 Oct 2026: "Keep
   them"), written up as coach-iq/principles/strength-levels.md: change both
   together. */
const STANDARDS = {
  squat: { label: "back squat", male: [1.0, 1.5], female: [0.75, 1.25] },
  bench: { label: "bench press", male: [0.75, 1.25], female: [0.5, 0.85] },
  deadlift: { label: "deadlift", male: [1.25, 2.0], female: [1.0, 1.5] },
  press: { label: "overhead press", male: [0.5, 0.8], female: [0.35, 0.6] },
};
/* Which of the four a library exercise is: the barbell versions only. */
function standardOf(x) {
  const f = library.familyOf(x)?.label, a = x.attributes || {};
  if (f === "Squat" && a.implement === "Barbell" && !a.load) return "squat";
  if (f === "Chest Press" && a.implement === "Barbell" && a.support === "Bench") return "bench";
  if (f === "Deadlift" && (a.implement === "Barbell" || a.implement === "Trap Bar")) return "deadlift";
  if (f === "Overhead Press" && a.implement === "Barbell") return "press";
  return null;
}

/** What the client's latest 1RMs say about their level: { level, why } or null. `sex` "female" or "male". */
export async function levelFromTests(clientId, sex) {
  if (sex !== "female" && sex !== "male") return null;
  const said = [];
  for (const [id, t] of await oneRmsOf(clientId)) {
    const x = library.exerciseById(id), lift = x && standardOf(x);
    if (!lift || !t.bodyWeightKg || said.some(s => s.lift === lift)) continue;
    const ratio = t.kg / t.bodyWeightKg;
    const [mid, top] = STANDARDS[lift][sex];
    said.push({ lift, ratio, level: ratio >= top ? "advanced" : ratio >= mid ? "intermediate" : "beginner" });
  }
  if (!said.length) return null;
  /* The lowest of them, to be safe. */
  const level = LEVELS[Math.min(...said.map(s => LEVELS.indexOf(s.level)))];
  const each = said.map(s => `${STANDARDS[s.lift].label} ${s.ratio.toFixed(2)} × body weight (${s.level})`);
  return { level, why: `Their 1RM ${each.join(", ")}${said.length > 1 ? `: ${level}, the lowest` : ""}.` };
}

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
/* `tested`: the library exercises the client has a 1RM for. A lift they can
   be tested on counts as done, as one in an earlier program does, so Coach IQ
   offers its next step and not the easier ones (Run 1, U-15; Glenn, 19 Oct
   2026: "Suggest a level, and steps on"). */
export async function historyOf(trainerId, clientId, { before = null, tested = [] } = {}) {
  const rows = await all(`SELECT id, name, level, created_at FROM coach_programs WHERE trainer_id = ? AND client_id = ? ORDER BY created_at, id`, [trainerId, clientId]);
  /* Every one of their exercises in one question, not one a program (Run 1, O-10). */
  const byProgram = new Map();
  /* The sessions' exercises, not their warm-ups and cool-downs. */
  for (const r of await all(`SELECT pe.program_id, pe.exercise_id FROM coach_program_exercises pe JOIN coach_programs p ON p.id = pe.program_id
    WHERE p.trainer_id = ? AND p.client_id = ? AND pe.part = ''`, [trainerId, clientId])) {
    if (!byProgram.has(r.program_id)) byProgram.set(r.program_id, []);
    byProgram.get(r.program_id).push(r.exercise_id);
  }
  const list = [];
  for (const p of rows) {
    if (before && (p.id === before.id || p.created_at > before.created_at)) continue;
    const xs = (byProgram.get(p.id) || []).map(id => library.exerciseById(id)).filter(Boolean);
    list.push({ ...p, xs, reach: xs.length ? xs.reduce((n, x) => n + LEVELS.indexOf(x.level), 0) / xs.length : null });
  }
  const done = new Set(), next = new Map(), outgrown = new Map();
  const testedXs = tested.map(id => library.exerciseById(id)).filter(Boolean);
  /* Each step says what it is a step from: { name, tested }. */
  const doneXs = [...list.flatMap(p => p.xs).map(x => [x, false]), ...testedXs.map(x => [x, true])];
  for (const [x] of doneXs) done.add(x.id);
  for (const [x, wasTested] of doneXs) {
    for (const h of x.harder || []) if (!done.has(h) && !next.has(h)) next.set(h, { name: x.name, tested: wasTested });
    /* Every easier step down the chain: past a goblet squat is past a box
       squat and a sit to stand. */
    const down = [...library.easierOf(x.id)];
    while (down.length) {
      const e = down.shift();
      if (done.has(e) || outgrown.has(e)) continue;
      outgrown.set(e, { name: x.name, tested: wasTested });
      down.push(...library.easierOf(e));
    }
  }
  /* For keeping it fresh (Glenn, 20 Oct 2026: "suggesting exercises that
     client hasn't done in a while and new ones they haven't done"): when
     each was last in a program, what the latest program had, and the
     families they know. */
  const seen = new Map();
  for (const p of list) for (const x of p.xs) seen.set(x.id, p.created_at.slice(0, 10));
  const latest = new Set(list.length ? list[list.length - 1].xs.map(x => x.id) : []);
  const families = new Set([...doneXs.map(([x]) => x.movement)]);
  const steps = { steps: { done, next, outgrown, seen, latest, families } };
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
export async function full(trainerId, program, { withCheck = true, ctx: given = null, frozen = false } = {}) {
  const days = await all(`SELECT * FROM coach_program_days WHERE program_id = ? ORDER BY pos, id`, [program.id]);
  const everything = await all(`SELECT * FROM coach_program_exercises WHERE program_id = ? ORDER BY pos, id`, [program.id]);
  /* The session's exercises; the warm-up and the cool-down apart, beside them. */
  const rows = everything.filter(r => !partOf(r.part));
  const names = await theirNames(trainerId);
  const ctx = given || await context(trainerId, program, { frozen });
  const own = new Map();
  for (const r of everything) {
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
      /* What it works, for the day's body drawing (BodyMap.jsx). */
      primary: x?.primary || p?.primary || [], secondary: x?.secondary || [],
      superset: !!Number(r.superset),
      technique: r.technique || "", drops: r.drops == null ? null : Number(r.drops),
      sets: r.sets, reps: r.reps, load: r.load_text, effort: r.effort, tempo: r.tempo,
      /* A load as a percentage of the client's 1RM for it, worked out. */
      ...(ctx.oneRms.get(r.exercise_id) ? { oneRm: ctx.oneRms.get(r.exercise_id) } : {}),
      ...(percentOf(r.load_text) && ctx.oneRms.get(r.exercise_id) ? { loadKg: Math.round(kgAt(ctx.oneRms.get(r.exercise_id).kg, percentOf(r.load_text)) * 100) / 100 } : {}),
      rest: r.rest_seconds == null ? null : Number(r.rest_seconds), restText: restWords(r.rest_seconds == null ? null : Number(r.rest_seconds)), note: r.note,
      /* Its latest logged entry, by any trainer of the client: { doneOn, entry, units }. */
      ...(ctx.lastTime?.get(r.exercise_id) ? { lastTime: ctx.lastTime.get(r.exercise_id) } : {}),
    };
  };
  const out = {
    id: program.id, name: program.name, clientId: program.client_id, clientName: program.client_name,
    placeId: program.place_id, placeName: ctx.place?.name || null, goal: program.goal, goalLabel: GOALS[program.goal]?.label || program.goal,
    level: program.level, notes: program.notes, createdAt: program.created_at, updatedAt: program.updated_at,
    kind: program.kind || "full", kindLabel: (KINDS[program.kind] || KINDS.full).label, minutes: program.minutes == null ? null : Number(program.minutes),
    focus: parseList(program.focus), focusLabels: parseList(program.focus).map(f => FOCUS[f]?.label).filter(Boolean),
    /* With the one above means nothing for a day's first exercise. */
    days: days.map(d => ({ id: d.id, name: d.name, notes: d.notes, kind: d.kind || "full", kindLabel: (DAY_KINDS[d.kind] || DAY_KINDS.full).label,
      minutes: d.minutes == null ? null : Number(d.minutes),
      muscles: parseList(d.muscles).filter(m => GROUPS[m]), muscleLabels: parseList(d.muscles).filter(m => GROUPS[m]).map(m => GROUPS[m].label),
      exercises: rows.filter(r => r.day_id === d.id).map(shape).map((e, i) => (i ? e : { ...e, superset: false })),
      warmup: everything.filter(r => r.day_id === d.id && r.part === "warmup").map(shape).map(e => ({ ...e, superset: false })),
      cooldown: everything.filter(r => r.day_id === d.id && r.part === "cooldown").map(shape).map(e => ({ ...e, superset: false })) })),
    places: ctx.places.map(p => ({ id: p.id, name: p.name, ...(p.fromStudio ? { fromStudio: true } : {}) })),
    /* The client's latest 1RM for each exercise, for the exercise dialog. */
    oneRms: Object.fromEntries(ctx.oneRms),
  };
  /* About how long each day takes, all of it (src/lib/session-time.js). */
  const restDefault = ctx.taste?.usualRest(program.goal) ?? REST_DEFAULT;
  for (const d of out.days) {
    d.plannedSeconds = d.exercises.length || d.warmup.length || d.cooldown.length
      ? sessionSeconds(d.exercises, { restDefault, warmupSet: hasWarmupSet }) + partSeconds(d.warmup) + partSeconds(d.cooldown) : 0;
  }
  if (frozen) out.frozen = true;
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
  const level = LEVELS.indexOf(program.level);
  const beginner = program.level === "beginner";
  const add = (p) => points.push(p);

  if (!ctx.place) add({ level: "note", from: "equipment", text: "No place chosen, so the equipment isn't checked. Choose where they train." });
  if (beginner && program.days.length > 4) {
    add({ level: "note", from: "frequency-and-variety", text: `${program.days.length} days: early on two sessions a week are enough, and three or four after the first weeks.` });
  }

  /* Drop sets and giant sets, by the muscles they mainly work, across the
     week: once or twice a week for a muscle, more risks overtraining (the
     techniques' source, Glenn, 19 Oct 2026). */
  const hard = new Map();
  for (const day of program.days) {
    const sizes = groupSizes(day.exercises);
    for (const [i, e] of day.exercises.entries()) {
      const way = e.technique === "drop" ? "drop" : sizes[i] >= 3 ? "giant" : null;
      if (!way) continue;
      for (const m of e.primary || []) hard.set(m, (hard.get(m) || 0) + 1);
    }
  }
  for (const [m, n] of hard) {
    if (n > 2) add({ level: "note", from: "technique", text: `${m[0].toUpperCase() + m.slice(1)}: ${n} drop sets or giant-set exercises a week. Once or twice a week for a muscle is the usual; more risks overtraining.` });
  }

  for (const day of program.days) {
    const dayRows = rows.filter(r => r.day_id === day.id);
    let sets = 0, counted = 0;
    let sawLater = null;
    const sizes = groupSizes(day.exercises);
    const goal = GOALS[goalOfDay(day.kind, program.goal)];
    for (const [ei, e] of day.exercises.entries()) {
      const x = library.exerciseById(e.exerciseId);
      const at = { day: day.id, exercise: e.id };
      /* The techniques (src/lib/techniques.js): drop sets and giant sets for
         intermediate lifters and up, a pyramid's reps set by set. */
      if (beginner && (e.technique === "drop" || (sizes[ei] >= 3 && !e.superset))) {
        add({ ...at, level: "warn", from: "technique", text: `${e.name}: ${e.technique === "drop" ? "a drop set" : "a giant set"} suits intermediate to advanced lifters. For a beginner, a pyramid or a superset first.` });
      }
      if (isPyramid(e.technique)) {
        const list = String(e.reps || "").split(/\s*[,/]\s*|\s+/).filter(Boolean).map(Number);
        if (list.length < 2 || list.some(n => !Number.isInteger(n) || n < 1)) {
          add({ ...at, level: "note", from: "technique", text: `${e.name}: a pyramid's reps change each set. Write them in order, such as ${e.technique === "pyramid-down" ? "6, 8, 10" : e.technique === "pyramid-double" ? "12, 10, 8, 10, 12" : "12, 10, 8, 6"}.` });
        } else if (e.technique === "pyramid-up" && list.some((n, i) => i && n > list[i - 1])) {
          add({ ...at, level: "note", from: "technique", text: `${e.name}: going up, the weight rises and the reps fall each set; ${e.reps} has reps rising.` });
        } else if (e.technique === "pyramid-down" && list.some((n, i) => i && n < list[i - 1])) {
          add({ ...at, level: "note", from: "technique", text: `${e.name}: coming down, the weight falls and the reps rise each set; ${e.reps} has reps falling.` });
        }
      }
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
          else if (Array.isArray(fit)) add({ ...at, level: "note", from: "equipment", text: `${e.name}: nobody has said whether “${ctx.place.name}” has ${kindsWords(fit)}. Check before the session.` });
        }
        const lim = library.limitsCheck(x, ctx.rules);
        if (lim === "no") add({ ...at, level: "stop", from: "limitations", text: `${e.name} is something ${program.clientName}'s limitations say to avoid. Swap it.` });
        else if (lim.length) add({ ...at, level: "warn", from: "limitations", text: `${e.name}: make it easier or supported for ${program.clientName} (${lim.join(", ")}).` });
        if (LEVELS.indexOf(x.level) > level) add({ ...at, level: "warn", from: "starting-out", text: `${e.name} is ${x.level}, above ${program.clientName}'s level (${program.level}).` });
        else if (ctx.outgrown?.has(x.id)) add({ ...at, level: "note", from: "progression", text: ((o) => `${e.name} is a step back from ${o.name}, ${o.tested ? `which ${program.clientName} has a 1RM for` : `which ${program.clientName} did in an earlier program`}. Fine if that's the plan.`)(ctx.outgrown.get(x.id)) });
        /* The usual order: main lifts before accessories and finishers. */
        const roles = library.familyOf(x)?.roles || [];
        if (roles.includes("main") && !roles.includes("accessory") && sawLater) {
          add({ ...at, level: "note", from: "library", text: `${e.name} is usually a main lift, done before ${sawLater}.` });
        }
        if (!sawLater && (roles.includes("finisher") || (roles.includes("accessory") && !roles.includes("main")))) sawLater = e.name;
        if (needsWarmupSet(x) && !hasWarmupSet(e) && !["fat-loss", "mobility"].includes(goalOfDay(day.kind, program.goal))) add({ ...at, level: "note", from: "warm-up-sets", text: `${e.name}: a loaded compound lift. Start it with a warm-up set: 8–10 easy reps at about half the working weight.` });
      } else if (own.get(e.exerciseId)) {
        const p = own.get(e.exerciseId);
        if (ctx.place && p.needs.length) {
          const has = new Set(ctx.place.categories.filter(c => c.has === true).map(c => c.key));
          const missing = p.needs.filter(k => !has.has(k) && ctx.place.categories.find(c => c.key === k)?.has === false);
          if (missing.length) add({ ...at, level: "stop", from: "equipment", text: `${e.name} needs ${kindsWords(missing.map(library.kindLabel))}, which “${ctx.place.name}” doesn't have.` });
        }
      }
      const r = range(e.reps);
      if (r && goal.reps_range) {
        if (r[1] < goal.reps_range[0] || r[0] > goal.reps_range[1]) {
          add({ ...at, level: "note", from: "reps", text: `${e.name}: ${plural(e.reps, "rep")} is outside ${goal.reps_range[0]}–${goal.reps_range[1]}, the usual range for ${goal.label.toLowerCase()}.` });
        }
      }
      if (r && beginner && r[0] < 8) add({ ...at, level: "note", from: "reps", text: `${e.name}: in the first year about 8 reps and up work best; ${e.reps} is heavy for a beginner.` });
      /* A load as a percentage of 1RM (Glenn, 19 Oct 2026): something to go
         by, no more than all of it, and reps that can be done at it. */
      const pct = percentOf(e.load);
      const top = topReps(e.reps);
      if (pct != null) {
        /* A 1RM is only kept for the library's exercises (fitness-tests.js),
           so one of the trainer's own is only told to have a weight (Run 1, B-10). */
        if (!e.oneRm) add({ ...at, level: "warn", from: "one-rm", text: e.own
          ? `${e.name}: ${pct}% of a 1RM, but a 1RM is only kept for exercises from the library. Write the weight.`
          : `${e.name}: ${pct}% of a 1RM ${program.clientName} hasn't got for it. Add one in their Fitness tests, or write the weight.` });
        else if (pct > 100) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: ${pct}% is more than their 1RM, the most they can lift once.` });
        else if (pct < 10) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: ${pct}% of their 1RM is next to nothing. Check the load.` });
        /* The top of a range counts: 10–12 at 75% asks for 12 (Run 1, B-8). */
        else if (top && top > maxRepsAt(pct) + 1) add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: at ${pct}% of 1RM about ${plural(maxRepsAt(pct), "rep")} can be done; ${e.reps} asks for more. Lighten it, or fewer reps.` });
      } else if (unreadPercent(e.load)) {
        add({ ...at, level: "warn", from: "one-rm", text: `${e.name}: “${e.load}” can't be worked out from a 1RM. Write one share of it, such as 75%, or the weight.` });
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
    /* The sets a session holds, for its length (setsHeld): 25 and 30 for an
       hour or less, as the principles give, and more for a longer one. */
    const mins = day.minutes ?? program.minutes;
    const held = setsHeld(mins), tooMany = setsTooMany(mins);
    if (counted) {
      if (sets > tooMany || (beginner && sets > tooMany + 6)) add({ day: day.id, level: "warn", from: beginner ? "starting-out" : "sets", text: `${day.name}: about ${sets} sets. Well beyond ${tooMany}${mins > 60 ? ` in ${aOrAn(mins)} ${mins}-minute session` : ""} the quality of the work falls; keep it under about ${held}.` });
      else if (sets > held) add({ day: day.id, level: "note", from: "sets", text: `${day.name}: about ${sets} sets, over the ${mins > 60 ? `${held} ${aOrAn(mins)} ${mins}-minute session` : "20–25 a session"} usually holds.` });
    }
    if (beginner && dayRows.length > 7) add({ day: day.id, level: "note", from: "starting-out", text: `${day.name}: ${dayRows.length} exercises. A beginner's session is usually 4–7, unless it is a circuit.` });
    /* Timed, not counted (Glenn, 20 Oct 2026): its sets, reps, tempo and
       rests, with the warm-up and cool-down, against the session's length. */
    const planned = Math.round(day.plannedSeconds / 60);
    if (mins && day.plannedSeconds > (mins + 5) * 60) add({ day: day.id, level: "note", from: "session-time", text: `${day.name}: about ${planned} minutes planned, over its ${mins}-minute session.` });
    /* Short of it only where the sets are already at what a session holds:
       otherwise there is simply room for more, which the suggestions say. */
    else if (mins && counted && sets >= held && day.plannedSeconds < (mins - 15) * 60) add({ day: day.id, level: "note", from: "sets", text: `${day.name}: about ${planned} minutes planned for ${aOrAn(mins)} ${mins}-minute session, with ${sets} sets already, about what it holds. Longer rests, or a slower tempo, would fill it.` });
    /* The warm-up and the cool-down are checked for what could hurt or
       can't be done there: the place, the limitations, the level. Their
       doses are their own, so the goal's ranges aren't held to them. */
    for (const e of [...(day.warmup || []), ...(day.cooldown || [])]) {
      const x = library.exerciseById(e.exerciseId);
      if (!x) continue;
      const at = { day: day.id, exercise: e.id };
      if (ctx.place && library.placeCheck(x, ctx.place) === "no") add({ ...at, level: "stop", from: "equipment", text: `${e.name} needs equipment that “${ctx.place.name}” doesn't have. Swap it.` });
      const lim = library.limitsCheck(x, ctx.rules);
      if (lim === "no") add({ ...at, level: "stop", from: "limitations", text: `${e.name} is something ${program.clientName}'s limitations say to avoid. Swap it.` });
      else if (lim.length) add({ ...at, level: "warn", from: "limitations", text: `${e.name}: make it easier or supported for ${program.clientName} (${lim.join(", ")}).` });
      if (LEVELS.indexOf(x.level) > level) add({ ...at, level: "warn", from: "starting-out", text: `${e.name} is ${x.level}, above ${program.clientName}'s level (${program.level}).` });
    }
  }
  const order = { stop: 0, warn: 1, note: 2 };
  return points.sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------------------------------------------------- what comes next */

/* A starting dose from the principles, for the goal and the client's level;
   lighter for an accessory. Rest in seconds. */
export function doseFor(goalKey, level, { accessory = false, measure = "reps" } = {}) {
  const g = GOALS[goalKey] || GOALS.general;
  let sets = g.sets, reps = g.reps;
  /* Held or carried for a time, not counted in reps: a plank or a carry
     isn't "8–12" (Run 1, B-17). Carries by time too, which needs no units. */
  if (measure === "time" || measure === "distance") reps = level === "beginner" ? "20–30 s" : "30–45 s";
  else if (measure === "calories") reps = level === "beginner" ? "8–10 cal" : "10–15 cal";
  if (level === "beginner") {
    sets = goalKey === "mobility" ? "1–2" : "1–3";
    if (reps && measure === "reps") { const r = range(reps); reps = r && r[0] < 8 ? "8–12" : reps; }
  } else if (accessory && g.sets) {
    const s = range(g.sets);
    /* One fewer, written once when both ends meet: "1", never "1–1". */
    if (s) sets = ((lo, hi) => (lo === hi ? `${lo}` : `${lo}–${hi}`))(Math.max(1, s[0] - 1), Math.max(1, s[1] - 1));
  }
  return { sets, reps, rest: g.rest };
}

/* How an exercise is counted first: reps, time, distance or calories. */
const firstMeasure = (x) => measureOf(x, library.familyOf(x))[0];

/* The versions that could go in, judged as the check would: never one that
   fails the place, the level or the limitations. */
function candidates(ctx, level) {
  const top = LEVELS.indexOf(level);
  return library.liveExercises().filter(x => {
    if (LEVELS.indexOf(x.level) > top) return false;
    if (ctx.avoid?.has(x.id)) return false;
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
    /* Building from the steps: a lift they have a 1RM for, so its weight can be written. */
    if (ctx.prefer?.has(x.id)) s += 2;
    /* The trainer's way, learned (taste.js), and keeping it fresh for the client. */
    if (ctx.taste) s += ctx.taste.score(x);
    s += freshness(x, ctx).bonus;
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

/*
 * Keeping it fresh for the client: never anything when they have no history
 * yet (everything would be new). In the latest program: a little down. Not
 * in a program or a logged session for WEEKS_FRESH weeks: up. Never done, a
 * family they know (a new way to do a lift they know): up most. Never done,
 * a family they don't: up a little.
 */
const WEEKS_FRESH = 8;
function freshness(x, ctx) {
  if (!ctx.seen?.size) return { bonus: 0, why: "" };
  if (ctx.latest?.has(x.id)) return { bonus: -1, why: "" };
  const last = ctx.seen.get(x.id);
  if (last) {
    const weeks = Math.floor((Date.now() - Date.parse(`${last}T00:00:00`)) / WEEK);
    return weeks >= WEEKS_FRESH ? { bonus: 1, why: `${ctx.clientFirst} hasn't done it in ${weeks} weeks.` } : { bonus: 0, why: "" };
  }
  if (ctx.families?.has(x.movement)) return { bonus: 1.5, why: `New for ${ctx.clientFirst}: another way to do ${aOrAn(library.familyOf(x)?.label || "it")} ${String(library.familyOf(x)?.label || "").toLowerCase()} they know.` };
  return { bonus: 0.5, why: `New for ${ctx.clientFirst}.` };
}

function suggestion(x, ctx, why, dose) {
  const fit = ctx.place ? library.placeCheck(x, ctx.place) : "yes";
  const lim = library.limitsCheck(x, ctx.rules);
  const step = ctx.next?.get(x.id);
  /* One learned reason at most: the trainer's way, else what is fresh. */
  const learned = (ctx.taste?.why(x)) || (!step && freshness(x, ctx).why) || "";
  why = learned ? `${why} ${learned}` : why;
  return {
    ...library.brief(x), why: step ? `${why} A step on from ${step.name}, ${step.tested ? "which they have a 1RM for" : "from an earlier program"}.` : why,
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
export async function suggestFor(trainerId, program, dayId, { workOn = null, muscles = [] } = {}, limit = 6, given = null) {
  const ctx = given || await context(trainerId, program);
  const want = muscles.filter(m => ALL_MUSCLES.has(m));
  const kind = WORK_ON[workOn] || null;
  const onDay = new Set((await all(`SELECT exercise_id FROM coach_program_exercises WHERE day_id = ? AND part = ''`, [dayId])).map(r => r.exercise_id));
  const dayGoal = goalOfDay((await get(`SELECT kind FROM coach_program_days WHERE id = ?`, [dayId]))?.kind, program.goal);
  const goal = GOALS[dayGoal];
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
  const stretches = workOn === "mobility" || dayGoal === "mobility";
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
    return suggestion(x, ctx, works, doseFor(dayGoal, program.level, { accessory, measure: firstMeasure(x) }));
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
/* `inOrder`: the day's own movements in their order, main lifts first,
   whatever other days have (building a second Lower day starts with a
   squat, not with what the first Lower day left out). */
export async function suggestNext(trainerId, program, dayId, limit = 4, given = null, { inOrder = false } = {}) {
  const ctx = given || await context(trainerId, program);
  const rows = await all(`SELECT day_id, exercise_id FROM coach_program_exercises WHERE program_id = ? AND part = ''`, [program.id]);
  const patternOf = (id) => { const x = library.exerciseById(id); return x ? library.familyOf(x)?.pattern : null; };
  const inProgram = new Set(rows.map(r => patternOf(r.exercise_id)).filter(Boolean));
  const dayRows = rows.filter(r => r.day_id === dayId);
  const inDay = new Set(dayRows.map(r => patternOf(r.exercise_id)).filter(Boolean));
  const used = new Set(rows.map(r => r.exercise_id));
  const mainsToday = dayRows.filter(r => { const x = library.exerciseById(r.exercise_id); return x && (library.familyOf(x).roles || []).includes("main"); }).length;
  /* What this day trains (its kind), the program's focus first where the
     day trains it, then what neither the day nor the program has yet. */
  const day = await get(`SELECT kind, minutes FROM coach_program_days WHERE id = ?`, [dayId]);
  const dayKind = DAY_KINDS[day?.kind] ? day.kind : program.goal === "mobility" ? "mobility" : "full";
  const dayGoal = goalOfDay(dayKind, program.goal);
  const goal = GOALS[dayGoal];
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
  const base = [...new Set([...(inOrder ? [] : allowed.filter(p => !inProgram.has(p))), ...allowed])].filter(p => open(p) && !front.includes(p));
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
    out.push(suggestion(best, ctx, why, doseFor(dayGoal, program.level, { accessory, measure: firstMeasure(best) })));
  }
  const mins = day?.minutes ?? program.minutes;
  const asWritten = mins ? await all(`SELECT sets, reps, tempo, rest_seconds, superset, technique, drops, note, part FROM coach_program_exercises WHERE day_id = ? ORDER BY pos, id`, [dayId]) : [];
  const shaped = asWritten.map(r => ({ ...r, rest: r.rest_seconds == null ? null : Number(r.rest_seconds), superset: !!Number(r.superset) }));
  const planned = sessionSeconds(shaped.filter(r => !partOf(r.part)), { restDefault: ctx.taste?.usualRest(program.goal) ?? REST_DEFAULT, warmupSet: hasWarmupSet })
    + partSeconds(shaped.filter(r => partOf(r.part)));
  return {
    suggestions: out,
    day: DAY_KINDS[dayKind].label,
    ...(mins && planned >= mins * 60 - 150 ? { full: `This day already fills about ${aOrAn(mins)} ${mins}-minute session.` } : {}),
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
export async function preview(trainerId, program, exerciseId, part = "") {
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
    else if (Array.isArray(fit)) points.push({ level: "note", text: `Nobody has said whether “${ctx.place.name}” has ${kindsWords(fit)}.` });
  }
  const lim = library.limitsCheck(x, ctx.rules);
  if (lim === "no") points.push({ level: "stop", text: `${program.client_name}'s limitations say to avoid it.` });
  else if (lim.length) points.push({ level: "warn", text: `Make it easier or supported for ${program.client_name} (${lim.join(", ")}).` });
  if (LEVELS.indexOf(x.level) > LEVELS.indexOf(program.level)) points.push({ level: "warn", text: `${x.level[0].toUpperCase() + x.level.slice(1)}, above ${program.client_name}'s level (${program.level}).` });
  const accessory = !(library.familyOf(x)?.roles || []).includes("main");
  return {
    exercise: { ...b, name: names.get(x.id) || x.name, libraryName: x.name, secondary: x.secondary || [] },
    points,
    dose: partOf(part) ? partDose(x, part) : doseFor(program.goal, program.level, { accessory, measure: firstMeasure(x) }),
  };
}

/** Alternatives for one exercise in a program: the library's, fitted to this program's world. */
export async function swapsFor(trainerId, program, exerciseId) {
  if (!library.isExercise(exerciseId)) return { alternatives: [], note: "Your own exercise: Coach IQ has no alternatives for it." };
  const ctx = await context(trainerId, program);
  const out = library.alternativesFor(exerciseId, { place: ctx.place, level: program.level, rules: ctx.hasLimitations ? ctx.rules : null });
  return { ...out, alternatives: out.alternatives.slice(0, 8) };
}

/* ----------------------------------------------- made step by step */

/*
 * A program made from the answers to the steps (Glenn, 20 Oct 2026: "based
 * on those information, we can create a workout program automatically, based
 * on the information given and the previous programs we've made for this
 * client. The trainer can still add/modify/remove the autogenerated
 * program"). Coach IQ builds it, here in code, from what it already suggests
 * (Glenn chose Coach IQ over Billy): each day filled with what suggestNext
 * would offer next, in turn, so the place, the level, the limitations and
 * the steps on from earlier programs and 1RMs all count as they do there;
 * then the muscle groups asked for that day; then, where a day's own
 * movements run out before the session is full, more for what that kind of
 * day works. A warm-up and a cool-down are their own parts of each day
 * (designing.md: "Warm up and cool down every session").
 */

/** What makes the steps' answers enough to build from, or the reason not. */
export function checkSteps(body = {}) {
  if (!AIMS[body.aim]) return "Choose what the program is to focus on.";
  if (body.focus !== undefined && (!Array.isArray(body.focus) || body.focus.some(f => !FOCUS[f]))) return "Choose what else to work on from the list.";
  if (!Array.isArray(body.days) || body.days.length < 1 || body.days.length > 7) return "Choose 1 to 7 days a week.";
  for (const d of body.days) {
    if (!DAY_KINDS[d?.kind]) return "Choose what each day works.";
    if (d.muscles !== undefined && (!Array.isArray(d.muscles) || d.muscles.some(m => !GROUPS[m]))) return "Choose the muscle groups from the list.";
    if (!MINUTES[d.minutes]) return "Choose how long each session is.";
  }
  if (!LEVELS.includes(body.level)) return "Choose the client's level.";
  if (!text(body.name, 120)) return "Give the program a name.";
  return null;
}

/* A share of the 1RM the top of a range of reps can be done at with about
   two to spare (one-rm.js, maxRepsAt), to the 5% below: 8 reps 75%, 12
   reps 60%. Only where the client has a 1RM for it, and never over 90%. */
function percentFor(reps) {
  const top = topReps(reps);
  if (!top) return null;
  const pct = Math.floor(((37 - (top + 2)) / 0.36) / 5) * 5;
  return pct >= 40 ? Math.min(pct, 90) : null;
}

/* Static stretches by their names: held at the end, where moving drills
   warm up at the start. */
const STATIC = /stretch|pose|child's|cobra|foam/i;

/* A warm-up, a cool-down and stretching for a day, from the library's
   versions marked for them, passing the place, the level and the
   limitations: the warm-up a few easy minutes to raise the pulse, then
   moving drills for what the day works; the cool-down an easy walk or
   breathing; stretching, held, for the muscles the day worked most. None
   of a family already in the session (`onDay`, their movement ids). */
function partsFor(ctx, program, worked, onDay, { warmup, cooldown, stretching, minutes }) {
  const pool = candidates(ctx, program.level);
  const roles = (x) => library.familyOf(x)?.roles || [];
  const patt = (x) => library.familyOf(x)?.pattern;
  const easy = (x) => (ctx.place && Array.isArray(library.placeCheck(x, ctx.place)) ? 1 : 0) + LEVELS.indexOf(x.level)
    + (Array.isArray(library.limitsCheck(x, ctx.rules)) && library.limitsCheck(x, ctx.rules).length ? 2 : 0);
  const overlap = (x) => [...(x.primary || []), ...(x.secondary || [])].filter(m => worked.has(m)).length;
  /* Never one the session itself has. */
  const taken = new Set(onDay);
  const pick = (list, n, score) => {
    const out = [];
    for (const x of [...list].sort((a, b) => score(b) - score(a) || easy(a) - easy(b))) {
      if (out.length >= n) break;
      if (taken.has(x.movement)) continue;
      taken.add(x.movement); out.push(x);
    }
    return out;
  };
  const out = { warmup: [], cooldown: [] };
  if (warmup) {
    const pulse = pick(pool.filter(x => roles(x).includes("warm-up") && patt(x) === "conditioning"), 1, (x) => -easy(x));
    const drills = pick(pool.filter(x => roles(x).includes("warm-up") && ["mobility", "hinge", "balance"].includes(patt(x)) && !STATIC.test(x.name)),
      minutes >= 60 ? 2 : 1, (x) => overlap(x));
    out.warmup = [...pulse, ...drills].map(x => ({ x, dose: partDose(x, "warmup", minutes) }));
  }
  if (cooldown) {
    const easyOut = pick(pool.filter(x => roles(x).includes("cool-down") && ["conditioning", "breathing"].includes(patt(x))), 1,
      (x) => (patt(x) === "conditioning" ? 1 : 0) - easy(x));
    out.cooldown.push(...easyOut.map(x => ({ x, dose: partDose(x, "cooldown", minutes) })));
  }
  if (stretching) {
    const holds = pick(pool.filter(x => roles(x).includes("cool-down") && patt(x) === "mobility"), minutes >= 60 ? 3 : 2,
      (x) => overlap(x) * 2 + (STATIC.test(x.name) ? 2 : 0));
    out.cooldown.push(...holds.map(x => ({ x, dose: partDose(x, "cooldown", minutes) })));
  }
  return out;
}

/* A warm-up's or a cool-down's dose: a few easy minutes of something
   steady (three in a short session), a short while of breathing, a moving
   drill counted or timed, a stretch held. No rest: one goes straight on. */
/* In a session of 45 minutes or less, three easy minutes, not five. */
export function partDose(x, part, minutes = 60) {
  const p = library.familyOf(x)?.pattern;
  if (p === "conditioning") return { sets: "1", reps: minutes <= 45 ? "3 min" : "5 min", rest: null };
  if (p === "breathing") return { sets: "1", reps: "2 min", rest: null };
  if (part === "cooldown" || STATIC.test(x.name)) return { sets: "1–2", reps: "30 s", rest: null };
  return { sets: "1", reps: ["time", "distance"].includes(firstMeasure(x)) ? "30 s" : "8–10", rest: null };
}

/**
 * What could go in a day's warm-up or cool-down, for the add dialog: the
 * library's versions marked for it, passing the place, the level and the
 * limitations, not already on the day; the ones reaching what the day's
 * session works first, moving drills first in a warm-up and held stretches
 * in a cool-down. Each with its dose.
 */
export async function suggestPart(trainerId, program, dayId, part) {
  const ctx = await context(trainerId, program);
  const rows = await all(`SELECT exercise_id, part FROM coach_program_exercises WHERE day_id = ?`, [dayId]);
  const there = new Set(rows.map(r => library.exerciseById(r.exercise_id)?.movement).filter(Boolean));
  const worked = new Set(rows.filter(r => !partOf(r.part)).flatMap(r => library.exerciseById(r.exercise_id)?.primary || []));
  const role = part === "warmup" ? "warm-up" : "cool-down";
  const fam = (x) => library.familyOf(x);
  const reach = (x) => [...(x.primary || []), ...(x.secondary || [])].filter(m => worked.has(m));
  const fits = (x) => (part === "warmup" ? !STATIC.test(x.name) : STATIC.test(x.name) || fam(x)?.pattern !== "mobility");
  const list = candidates(ctx, program.level).filter(x => (fam(x)?.roles || []).includes(role) && !there.has(x.movement))
    .sort((a, b) => (fits(b) - fits(a)) || (reach(b).length - reach(a).length) || (LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level)));
  const seen = new Set();
  const out = list.filter(x => (seen.has(x.movement) ? false : seen.add(x.movement))).slice(0, 6).map(x => {
    const p = fam(x)?.pattern;
    const hit = reach(x);
    const why = p === "conditioning" ? (part === "warmup" ? "Raises the pulse, a few easy minutes." : "Brings the heart rate down.")
      : p === "breathing" ? "Slows the breathing and settles the body."
      : hit.length ? `${part === "warmup" ? "Moves" : "Stretches"} the ${andWords(hit.slice(0, 3))}, which the day works.`
      : part === "warmup" ? "A moving drill to loosen up." : "A stretch to finish.";
    return suggestion(x, ctx, why, partDose(x, part));
  });
  return { suggestions: out, ...(ctx.place ? { place: ctx.place.name } : {}), part: PARTS[part] };
}
const andWords = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0]);

/* What Coach IQ offers for a day, put on it: its dose, and a weight from
   the client's 1RM where they have one for it. */
/*
 * A warm-up set of the same exercise before the working sets
 * (coach-iq/principles/warm-up-sets.md; Glenn, 20 Oct 2026: "suggest a warm
 * up set of the same exercise with a low weight, specially if it's an
 * advanced compound exercise"): a loaded compound main lift (a squat, a
 * hinge, a press, a row or a pull with a barbell, dumbbells, kettlebells, a
 * machine …) above beginner level. Heavy working sets get a second.
 */
const COMPOUND = new Set(["squat", "hinge", "push-horizontal", "push-vertical", "pull-horizontal", "pull-vertical"]);
const LOADED = new Set(["Barbell", "Trap Bar", "Smith Machine", "Landmine", "Dumbbell", "Kettlebell", "Machine", "Cable"]);
/* An inverted row hangs from a barbell or a Smith machine, but its load is
   the body's own weight: no lighter set to do. */
export const needsWarmupSet = (x) => !!x && x.level !== "beginner" && COMPOUND.has(library.familyOf(x)?.pattern)
  && (library.familyOf(x)?.roles || []).includes("main") && LOADED.has(x.attributes?.implement) && !/inverted/i.test(x.name);
export const hasWarmupSet = (e) => /warm[- ]?up set/i.test(e?.note || "");
function warmupSetNote(dose, pct) {
  const top = topReps(dose.reps);
  const heavy = (pct && pct >= 80) || (top && top <= 6);
  return heavy ? "Warm-up sets first: 8–10 easy reps at about half the working weight, then 3–5 at about 70%."
    : "Warm-up set first: 8–10 easy reps at about half the working weight.";
}

/* What Coach IQ puts on a day, as it will be written: its dose (the
   trainer's usual rest where they have one, on a day dosed as the
   program is), a weight from the client's 1RM where they have one, and a
   warm-up set where the lift needs one. */
function planDose(program, s, ctx, part, dayKind) {
  const dose = { sets: s.dose.sets || "", reps: s.dose.reps || "" };
  if (s.dose.rest != null) dose.rest = s.dose.rest;
  if (part) return dose;
  const usual = ctx.taste?.usualRest(program.goal);
  const dayGoal = goalOfDay(dayKind, program.goal);
  if (dose.rest != null && usual && dayGoal === program.goal) dose.rest = usual;
  /* A strength day rests the low end of the principle's 2–5 minutes, more
     being up to the client (Glenn, 20 Oct 2026: "on an autogenerated workout
     program this should be on the lower end (2 minutes), more than that
     should be up to the client"); the program's notes tell them so. */
  if (dose.rest != null && dayGoal === "strength") dose.rest = BUILT_STRENGTH_REST;
  const pct = ctx.oneRms.get(s.id) && program.goal !== "mobility" ? percentFor(dose.reps) : null;
  if (pct) dose.load = `${pct}%`;
  /* Not in a circuit or on a mobility day: light work done straight through. */
  if (needsWarmupSet(library.exerciseById(s.id)) && !["fat-loss", "mobility"].includes(dayGoal)) dose.note = warmupSetNote(dose, pct);
  return dose;
}

const BUILT_STRENGTH_REST = 120;
const STRENGTH_NOTE = "Rest about 2 minutes between sets. Take longer if you need it.";

/** The program made from the steps' answers (checkSteps first); its id. */
export async function build(trainerId, client, placeId, body) {
  const aim = AIMS[body.aim];
  const kinds = body.days.map(d => d.kind);
  const names = namedDays(kinds);
  const id = await create(trainerId, client, placeId, {
    name: body.name, goal: aim.goal, level: body.level, notes: body.notes || (aim.goal === "strength" ? STRENGTH_NOTE : ""),
    kind: kindOfDays(kinds), minutes: body.days[0].minutes,
    focus: [...new Set([...(body.focus || []), ...(aim.focus ? [aim.focus] : [])])],
    days: body.days.map((d, i) => ({ name: names[i], kind: d.kind, minutes: d.minutes, muscles: d.muscles || [] })),
  });
  const program = await get(`SELECT * FROM coach_programs WHERE id = ?`, [id]);
  /* Its world read once, for every day. Built, it never steps back to what
     the client has moved past, which the check would only point out; and it
     leans to lifts with a 1RM, whose weight it can write. */
  const ctx = await context(trainerId, program);
  ctx.avoid = new Set(ctx.outgrown?.keys() || []);
  ctx.prefer = new Set(ctx.oneRms.keys());
  const days = await all(`SELECT * FROM coach_program_days WHERE program_id = ? ORDER BY pos, id`, [id]);
  const workOn = aim.goal === "mobility" ? "mobility" : aim.goal === "power" ? "power" : aim.goal === "fat-loss" ? "cardio" : "strength";
  const wants = { warmup: !!body.warmup, cooldown: !!body.cooldown, stretching: !!body.stretching };
  /* How long a day takes (src/lib/session-time.js), with the trainer's usual rest where nothing is written. */
  const restDefault = ctx.taste?.usualRest(program.goal) ?? REST_DEFAULT;
  const time = (list) => sessionSeconds(list, { restDefault, warmupSet: hasWarmupSet });
  for (const [i, day] of days.entries()) {
    const step = body.days[i];
    const minutes = Number(step.minutes);
    /*
     * The session's length is all of it (Glenn, 20 Oct 2026: "make sure the
     * amount of exercises/set corresponds with the length of the session
     * they selected"): the warm-up and cool-down are timed first, as Coach
     * IQ would choose them for a day of this kind, and the exercises fill
     * what is left, each timed by its sets, reps, tempo and rest.
     */
    const guess = partsFor(ctx, program, new Set(DAY_MUSCLES[day.kind] || []), new Set(), { ...wants, minutes });
    const budget = minutes * 60 - partSeconds([...guess.warmup, ...guess.cooldown].map(p => p.dose));
    const onDay = new Set(), families = new Set();
    const planned = [];
    /* Never past the sets a session of this length holds (setsHeld), by the
       top of each range, so the check has nothing to say about the build. */
    const held = setsHeld(minutes);
    let sets = 0;
    /* Full when what is left is shorter than a short exercise. */
    const full = (limit) => time(planned) >= limit - 150;
    const take = async (s, limit) => {
      const x = library.exerciseById(s?.id);
      if (!x || onDay.has(x.id) || families.has(x.movement)) return false;
      const top = range(s.dose?.sets)?.[1] || 0;
      if (sets + top > held) return false;
      const dose = planDose(program, s, ctx, "", day.kind);
      if (time([...planned, dose]) > limit + 60) return false;
      await addExercise(program, day.id, s.id, dose, "", { byIq: true });
      planned.push(dose); onDay.add(x.id); families.add(x.movement); sets += top;
      return true;
    };
    /* The muscle groups asked for get the last third of the session, after its main movements. */
    const muscles = musclesOf(step.muscles).flatMap(g => GROUPS[g].muscles);
    const mainLimit = muscles.length ? Math.round(budget * 2 / 3) : budget;
    /* Two of the day's own movements come first whatever is kept back,
       so long strength rests can't leave a day with one main lift. */
    while (onDay.size < 2 ? !full(budget) : !full(mainLimit)) {
      const { suggestions } = await suggestNext(trainerId, program, day.id, 1, ctx, { inOrder: true });
      if (!suggestions.length || !await take(suggestions[0], onDay.size < 2 ? budget : mainLimit)) break;
    }
    const fillFrom = async (opts, { single = false } = {}) => {
      if (full(budget)) return;
      const { suggestions } = await suggestFor(trainerId, program, day.id, opts, 12, ctx);
      /* More for a muscle group is single-muscle work first: the big lifts
         that also reach it are what the day's own movements already gave. */
      const isolated = (s) => library.familyOf(library.exerciseById(s.id))?.pattern === "isolation";
      const order = single ? [...suggestions.filter(isolated), ...suggestions.filter(s => !isolated(s))] : suggestions;
      for (const s of order) { if (full(budget)) break; await take(s, budget); }
    };
    if (muscles.length) await fillFrom({ workOn, muscles }, { single: true });
    const dk = day.kind;
    await fillFrom(dk === "circuit" ? { workOn: "cardio" } : dk === "mobility" ? { workOn: "mobility" } : { workOn, muscles: DAY_MUSCLES[dk] || [] });
    if (wants.warmup || wants.cooldown || wants.stretching) {
      const worked = new Set([...onDay].flatMap(xid => library.exerciseById(xid)?.primary || []));
      const parts = partsFor(ctx, program, worked, families, { ...wants, minutes });
      for (const part of ["warmup", "cooldown"]) {
        for (const { x, dose } of parts[part]) await addExercise(program, day.id, x.id, dose, part, { byIq: true });
      }
    }
  }
  return id;
}

/* ----------------------------------------------------------- for Billy */

/** A program as Billy reads it: its days in words, the check, and what could come next on each day. */
export async function forBilly(trainerId, program, units) {
  /* Its world read once, for the program and every day's suggestions; it
     was read again for each (Run 1, O-10). */
  const ctx = await context(trainerId, program);
  const p = await full(trainerId, program, { ctx });
  const next = {};
  for (const d of p.days) next[d.name] = (await suggestNext(trainerId, program, d.id, 3, ctx)).suggestions.map(s => ({ name: s.name, id: s.id, why: s.why, dose: s.dose, ...(s.askFirst ? { askFirst: s.askFirst } : {}), ...(s.modifyFor ? { modifyFor: s.modifyFor } : {}) }));
  return {
    id: p.id, name: p.name, client: p.clientName, place: p.placeName, goal: p.goalLabel, level: p.level, notes: p.notes,
    kind: p.kindLabel, ...(p.focusLabels.length ? { focus: p.focusLabels } : {}), ...(p.minutes ? { sessionMinutes: p.minutes } : {}),
    days: p.days.map(d => ({
      name: d.name, notes: d.notes, trains: d.kindLabel,
      ...(d.minutes ? { sessionMinutes: d.minutes } : {}),
      ...(d.plannedSeconds ? { plannedMinutes: Math.round(d.plannedSeconds / 60) } : {}),
      ...(d.muscleLabels.length ? { worksMore: d.muscleLabels } : {}),
      ...(d.warmup.length ? { warmUp: d.warmup.map(e => [e.name, doseWords(e)].filter(Boolean).join(": ")) } : {}),
      ...(d.cooldown.length ? { coolDown: d.cooldown.map(e => [e.name, doseWords(e)].filter(Boolean).join(": ")) } : {}),
      exercises: d.exercises.map(e => {
        const out = { name: e.name };
        for (const k of ["sets", "reps", "load", "effort", "tempo", "note"]) if (e[k]) out[k] = e[k];
        /* A percentage load worked out, and the 1RM it is of, in the
           trainer's units, as the page shows them: given in kg, Billy said
           kg to a trainer who works in pounds (Run 1, B-13). */
        if (e.loadKg) out.loadWorkedOut = weightText(e.loadKg, units);
        if (e.oneRm) out.clientsOneRm = { weight: oneRmText(e.oneRm.kg, units), takenOn: e.oneRm.takenOn };
        if (e.restText) out.rest = e.restText;
        if (e.superset) out.withThePrevious = true;
        if (e.technique) out.technique = techniqueText(e);
        if (e.own) out.theirOwnExercise = true;
        return out;
      }),
    })),
    check: p.check.map(c => ({ level: c.level, text: c.text, from: c.from })),
    couldComeNext: next,
    dayIds: Object.fromEntries(p.days.map(d => [d.name, d.id])),
  };
}

/* "1 × 5 min": a warm-up's or a cool-down's dose, for Billy. */
const doseWords = (e) => [e.sets && e.reps ? `${e.sets} × ${e.reps}` : e.sets || e.reps, e.note].filter(Boolean).join(", ");

/** The facts a check point can name, for the screen. */
export const FROM = {
  equipment: "the place's equipment", limitations: "the client's limitations", library: "Coach IQ's library",
  reps: "Reps", sets: "Sets", rest: "Rest", tempo: "Tempo", "starting-out": "Starting out", "frequency-and-variety": "How often, and keeping it varied",
  technique: "Advanced sets", "warm-up-sets": "Warm-up sets", "session-time": "The session's length",
};
