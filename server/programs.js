import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { LEVELS } from "./coach-iq.js";
import * as library from "./library.js";
import * as equipment from "./equipment.js";
import * as limitations from "./limitations.js";

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

/* The movement patterns a balanced program covers, in the order they are
   offered: the big ones first. Mobility has its own. */
const PATTERNS_FOR = {
  default: ["squat", "hinge", "push-horizontal", "pull-horizontal", "lunge", "push-vertical", "pull-vertical", "carry", "core-anti-extension", "core-anti-rotation"],
  mobility: ["mobility", "breathing", "balance", "core-anti-extension"],
};

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
    out.push({ id: r.id, name: r.name, clientId: r.client_id, clientName: r.client_name, goal: r.goal, goalLabel: GOALS[r.goal]?.label || r.goal,
      level: r.level, days: Number(days.n), exercises: Number(ex.n), updatedAt: r.updated_at });
  }
  return out;
}

/** What makes a program's details worth keeping, or the reason not. */
export function checkDetails(body = {}, { creating = false } = {}) {
  if ((creating || body.name !== undefined) && !text(body.name, 120)) return "Give the program a name.";
  if ((creating || body.goal !== undefined) && !GOALS[body.goal]) return "Choose what it is for.";
  if ((creating || body.level !== undefined) && !LEVELS.includes(body.level)) return "Choose the client's level.";
  if (body.notes !== undefined && (typeof body.notes !== "string" || body.notes.length > 2000)) return "Keep the notes under 2,000 characters.";
  return null;
}

export async function create(trainerId, client, placeId, body) {
  const stamp = now();
  const id = await insertWithNewId("program", (newId) => run(
    `INSERT INTO coach_programs (id, trainer_id, client_id, client_name, place_id, name, goal, level, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, trainerId, client.id, `${client.firstName} ${client.lastName}`.trim(), placeId || "", text(body.name, 120), body.goal, body.level, text(body.notes ?? "", 2000), stamp, stamp]));
  await addDay(id, "Day A");
  return id;
}

const touch = (programId) => run(`UPDATE coach_programs SET updated_at = ? WHERE id = ?`, [now(), programId]);

export async function update(program, body, { client, placeId } = {}) {
  const f = {};
  if (body.name !== undefined) f.name = text(body.name, 120);
  if (body.goal !== undefined) f.goal = body.goal;
  if (body.level !== undefined) f.level = body.level;
  if (body.notes !== undefined) f.notes = text(body.notes, 2000);
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

export async function addDay(programId, name) {
  const top = await get(`SELECT MAX(pos) AS top FROM coach_program_days WHERE program_id = ?`, [programId]);
  const id = await insertWithNewId("programDay", (newId) => run(
    `INSERT INTO coach_program_days (id, program_id, name, pos) VALUES (?, ?, ?, ?)`, [newId, programId, text(name, 80) || "A day", (Number(top?.top) || 0) + 1]));
  await touch(programId);
  return id;
}

/* The next day's name after the ones there: Day B after Day A. */
export async function nextDayName(programId) {
  const days = await all(`SELECT name FROM coach_program_days WHERE program_id = ?`, [programId]);
  for (let i = 0; i < 26; i++) {
    const name = `Day ${String.fromCharCode(65 + i)}`;
    if (!days.some(d => d.name === name)) return name;
  }
  return `Day ${days.length + 1}`;
}

export async function updateDay(dayId, programId, body) {
  if (body.name !== undefined) {
    if (!text(body.name, 80)) return "Give the day a name.";
    await run(`UPDATE coach_program_days SET name = ? WHERE id = ?`, [text(body.name, 80), dayId]);
  }
  if (body.notes !== undefined) await run(`UPDATE coach_program_days SET notes = ? WHERE id = ?`, [text(body.notes, 1000), dayId]);
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

/* What the program's checks and suggestions need to know about its world. */
async function context(trainerId, program) {
  const { places } = await equipment.equipmentOf(trainerId);
  const place = places.find(p => p.id === program.place_id) || null;
  const lims = await limitations.limitationsOf(program.client_id, trainerId);
  return { places, place, rules: limitations.rulesOf(lims), hasLimitations: lims.length > 0 };
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
      rest: r.rest_seconds == null ? null : Number(r.rest_seconds), restText: restWords(r.rest_seconds == null ? null : Number(r.rest_seconds)), note: r.note,
    };
  };
  const out = {
    id: program.id, name: program.name, clientId: program.client_id, clientName: program.client_name,
    placeId: program.place_id, placeName: ctx.place?.name || null, goal: program.goal, goalLabel: GOALS[program.goal]?.label || program.goal,
    level: program.level, notes: program.notes, createdAt: program.created_at, updatedAt: program.updated_at,
    /* With the one above means nothing for a day's first exercise. */
    days: days.map(d => ({ id: d.id, name: d.name, notes: d.notes, exercises: rows.filter(r => r.day_id === d.id).map(shape).map((e, i) => (i ? e : { ...e, superset: false })) })),
    places: ctx.places.map(p => ({ id: p.id, name: p.name })),
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
    return s;
  };
  return [...list].sort((a, b) => score(b) - score(a));
}

function suggestion(x, ctx, why, dose) {
  const fit = ctx.place ? library.placeCheck(x, ctx.place) : "yes";
  const lim = library.limitsCheck(x, ctx.rules);
  return {
    ...library.brief(x), why,
    ...(Array.isArray(fit) ? { askFirst: fit } : {}),
    ...(Array.isArray(lim) && lim.length ? { modifyFor: lim } : {}),
    dose: { ...dose, restText: restWords(dose.rest) },
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
  const patterns = PATTERNS_FOR[program.goal === "mobility" ? "mobility" : "default"];
  const order = [...patterns.filter(p => !inProgram.has(p)), ...patterns.filter(p => inProgram.has(p) && !inDay.has(p))];
  const pool = candidates(ctx, program.level).filter(x => !used.has(x.id));
  const out = [];
  for (const pattern of order) {
    if (out.length >= limit) break;
    const role = program.goal === "mobility" ? null : mainsToday + out.length < 2 ? "main" : "accessory";
    const best = rank(pool.filter(x => library.familyOf(x)?.pattern === pattern), ctx, { level: program.level, purpose: goal.purpose, role })[0];
    if (!best) continue;
    const accessory = !(library.familyOf(best).roles || []).includes("main");
    const why = !inProgram.has(pattern) ? `Nothing in this program for ${patternWords(pattern)} yet.` : `Nothing on this day for ${patternWords(pattern)} yet.`;
    out.push(suggestion(best, ctx, why, doseFor(program.goal, program.level, { accessory })));
  }
  return {
    suggestions: out,
    ...(ctx.place ? { place: ctx.place.name } : {}),
    ...(ctx.hasLimitations ? { limitationsChecked: true } : {}),
  };
}

const PATTERN_WORDS = {
  squat: "a squat", hinge: "a hinge (deadlift, hip thrust)", lunge: "single-leg work", "push-horizontal": "a horizontal push",
  "push-vertical": "an overhead push", "pull-horizontal": "a row", "pull-vertical": "a vertical pull", carry: "a carry",
  "core-anti-extension": "core work against arching", "core-anti-rotation": "core work against twisting", mobility: "mobility",
  breathing: "breathing", balance: "balance",
};
const patternWords = (p) => PATTERN_WORDS[p] || p;

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
    days: p.days.map(d => ({
      name: d.name, notes: d.notes,
      exercises: d.exercises.map(e => {
        const out = { name: e.name };
        for (const k of ["sets", "reps", "load", "effort", "tempo", "note"]) if (e[k]) out[k] = e[k];
        if (e.restText) out.rest = e.restText;
        if (e.superset) out.withThePrevious = true;
        if (e.own) out.theirOwnExercise = true;
        return out;
      }),
    })),
    check: p.check.map(c => ({ level: c.level, text: c.text, from: c.from })),
    couldComeNext: next,
  };
}

/** The facts a check point can name, for the screen. */
export const FROM = {
  equipment: "the place's equipment", limitations: "the client's limitations", library: "Coach IQ's library",
  reps: "Reps", sets: "Sets", rest: "Rest", tempo: "Tempo", "starting-out": "Starting out", "frequency-and-variety": "How often, and keeping it varied",
};
