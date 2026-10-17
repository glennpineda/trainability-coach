import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import {
  FLAGS, LEVELS, MUSCLES, PURPOSES, ROLES, bodyweightFamilies, equipmentFor, factsOf, masterName, measureOf, nameKey, perSideOf, PIECES,
} from "./coach-iq.js";
import * as reviews from "./reviews.js";
import * as store from "./iq-store.js";
import { CATEGORIES, IMPLIES, isCategory } from "./equipment.js";

/**
 * Coach IQ's exercise library as the server uses it (ideas audit, 3 and 4),
 * and the part of a trainer's memory that is about exercises:
 *
 *   - their own names (exx…): "my Bulgarians" is the library's Split Squat —
 *     Rear-Foot-Elevated. Their word wins on their screens (Glenn, 16 Oct
 *     2026: "the trainer creates the program so their word wins"). A name not
 *     tied to anything yet is "to sort out": a scan will add them, and so can
 *     the trainer or Billy, from the trainer's own words.
 *   - their private exercises (exr…, the same tag as the library's), for what
 *     the library doesn't have; each can be suggested to Glenn for the shared
 *     library.
 *
 * Finding an exercise and finding alternatives are worked out here, in code,
 * not left to Billy: only options that pass the place's equipment, the level
 * and the client's limitations ever reach him.
 */

/* ---------------------------------------------------------------- library */

/* The library from iq-store.js, with lookups rebuilt whenever it changes. */
let FAMILIES, BODYWEIGHT_ONLY, LIVE, ALL, BY_ID, KEYS, EASIER;
/* Searched a little looser than nameKey: every word's last s dropped, so
   "chin ups" finds Chin-up, which nameKey leaves alone as too short. */
const loose = (name) => nameKey(name).split(" ").map(w => w.replace(/s$/, "")).join(" ");
const master = (x) => masterName(x, FAMILIES, BODYWEIGHT_ONLY);

function rebuild({ movements, exercises }) {
  FAMILIES = movements;
  ALL = exercises;
  BODYWEIGHT_ONLY = bodyweightFamilies(exercises);
  LIVE = exercises.filter(x => x.status !== "retired");
  BY_ID = new Map(exercises.map(x => [x.id, x]));
  KEYS = new Map(exercises.map(x => [x.id, [master(x), x.name, ...(x.aliases || []), ...(x.formerNames || [])].map(loose)]));
  /* Easier steps are never stored (ideas audit, 11): a version is easier
     than x when it lists x as harder. */
  EASIER = new Map();
  for (const y of exercises) for (const h of y.harder || []) EASIER.set(h, [...(EASIER.get(h) || []), y.id]);
}
rebuild(store.current());
store.onChange(rebuild);

export const isExercise = (id) => BY_ID.has(id);

/** One version, as the screen and Billy are shown it. */
export function brief(x) {
  const family = FAMILIES[x.movement];
  const eq = equipmentFor(x, family);
  return {
    id: x.id, name: x.name, master: master(x), family: family.label, pattern: family.pattern, level: x.level,
    primary: x.primary, needs: eq.needs.map(labelOfKind), ...(eq.oneOf.length ? { needsOneOf: eq.oneOf.map(labelOfKind) } : {}),
    ...(x.piece ? { piece: PIECES[x.piece].label } : {}),
    ...(reviews.statusOf("exercise", x.id, x.status) === "draft" ? { draft: true } : {}),
  };
}
const labelOfKind = (key) => CATEGORIES.find(c => c.key === key)?.label || key;

/**
 * The library's versions a name means: the master name, the common name, an
 * alias or a former name, compared the way names are (nameKey). Exact first;
 * then names holding every word asked for ("goblet" finds Squat — Goblet).
 */
export function searchLibrary(query, limit = 20) {
  const want = loose(query);
  if (!want) return [];
  const words = want.split(" ");
  const exact = [], partial = [];
  for (const x of LIVE) {
    const keys = KEYS.get(x.id);
    if (keys.includes(want)) exact.push(x);
    else if (keys.some(k => words.every(w => k.split(" ").some(kw => kw.startsWith(w))))) partial.push(x);
  }
  return [...exact, ...partial].slice(0, limit);
}

/* ---------------------------------------------------------- own names */

const now = () => new Date().toISOString();

const shapeName = (r) => {
  const x = BY_ID.get(r.exercise_id);
  return {
    id: r.id, name: r.name, exerciseId: r.exercise_id || null, source: r.source, createdAt: r.created_at,
    ...(x ? { library: { id: x.id, name: x.name, master: master(x) } } : {}),
  };
};

const shapePrivate = (r) => ({
  id: r.id, name: r.name, family: FAMILIES[r.family_id]?.label || null, familyId: r.family_id || null,
  needs: parse(r.needs), primary: parse(r.primary_muscles), note: r.note || "",
  suggestedAt: r.suggested_at || null, suggestNote: r.suggest_note || "", createdAt: r.created_at,
});
/* One of their own exercises, as Billy is shown it. */
const briefOwn = (p, theirName) => ({
  id: p.id, name: p.name, theirOwnExercise: true, ...(p.family ? { family: p.family } : {}), primary: p.primary,
  needs: p.needs.map(labelOfKind), ...(theirName ? { theirName } : {}),
});
const parse = (s) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

/** Everything about exercises in this trainer's memory. */
export async function exercisesOf(trainerId) {
  const names = await all(`SELECT * FROM coach_own_names WHERE trainer_id = ? ORDER BY name`, [trainerId]);
  const own = await all(`SELECT * FROM coach_private_exercises WHERE trainer_id = ? AND archived = 0 ORDER BY name`, [trainerId]);
  const privates = own.map(shapePrivate);
  return {
    names: names.map(r => {
      const n = shapeName(r);
      const p = privates.find(p => p.id === r.exercise_id);
      return p ? { ...n, own: { id: p.id, name: p.name } } : n;
    }),
    exercises: privates,
    families: Object.entries(FAMILIES).map(([id, f]) => ({ id, label: f.label })).sort((a, b) => a.label.localeCompare(b.label)),
    kinds: CATEGORIES.map(c => ({ key: c.key, label: c.label })),
    muscles: MUSCLES,
  };
}

/** Whether an exercise id is the library's, or one of this trainer's own. */
async function ownsExercise(trainerId, id) {
  if (isExercise(id)) return true;
  return !!await get(`SELECT id FROM coach_private_exercises WHERE id = ? AND trainer_id = ? AND archived = 0`, [id, trainerId]);
}

export const nameOf = (trainerId, name) =>
  get(`SELECT * FROM coach_own_names WHERE trainer_id = ? AND name_key = ?`, [trainerId, nameKey(name)]);

/** What makes an own name worth keeping, or the reason it is not. */
export async function checkName(trainerId, { name, exerciseId } = {}) {
  if (typeof name !== "string" || !nameKey(name) || name.trim().length > 120) return "Give the name you use.";
  if (exerciseId && !await ownsExercise(trainerId, exerciseId)) return "That exercise isn't in the library.";
  return null;
}

/**
 * A trainer's own name, tied to an exercise or (with none) waiting to be
 * sorted out. The same name twice is the same row, retied.
 */
export async function saveName(trainerId, { name, exerciseId = null }, source = "trainer") {
  const had = await nameOf(trainerId, name);
  if (had) {
    await run(`UPDATE coach_own_names SET name = ?, exercise_id = ?, source = ? WHERE id = ?`, [name.trim(), exerciseId || "", source, had.id]);
    return had.id;
  }
  return insertWithNewId("ownName", (id) => run(
    `INSERT INTO coach_own_names (id, trainer_id, name, name_key, exercise_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, trainerId, name.trim(), nameKey(name), exerciseId || "", source, now()]));
}

export async function nameById(trainerId, id) {
  return get(`SELECT * FROM coach_own_names WHERE id = ? AND trainer_id = ?`, [id, trainerId]);
}

export async function deleteName(trainerId, id) {
  await run(`DELETE FROM coach_own_names WHERE id = ? AND trainer_id = ?`, [id, trainerId]);
}

/* ------------------------------------------------------ private exercises */

/** What makes a private exercise worth keeping, or the reason it is not. */
export function checkPrivate({ name, familyId, needs = [], primary = [], note = "" } = {}) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return "Give the exercise a name.";
  if (familyId && !FAMILIES[familyId]) return "That isn't one of the library's movements.";
  if (!Array.isArray(needs) || needs.some(k => !isCategory(k))) return "That isn't one of the kinds of equipment.";
  if (!Array.isArray(primary) || primary.some(m => !MUSCLES.includes(m))) return "That isn't a muscle Coach knows.";
  if (typeof note !== "string" || note.length > 300) return "Keep the note short.";
  return null;
}

export function addPrivate(trainerId, { name, familyId = "", needs = [], primary = [], note = "" }) {
  return insertWithNewId("exercise", (id) => run(
    `INSERT INTO coach_private_exercises (id, trainer_id, name, family_id, needs, primary_muscles, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, trainerId, name.trim(), familyId || "", JSON.stringify([...new Set(needs)]), JSON.stringify([...new Set(primary)]), note.trim(), now()]));
}

export async function privateOf(trainerId, id) {
  return get(`SELECT * FROM coach_private_exercises WHERE id = ? AND trainer_id = ? AND archived = 0`, [id, trainerId]);
}

export async function updatePrivate(trainerId, id, { name, familyId = "", needs = [], primary = [], note = "" }) {
  await run(`UPDATE coach_private_exercises SET name = ?, family_id = ?, needs = ?, primary_muscles = ?, note = ? WHERE id = ? AND trainer_id = ?`,
    [name.trim(), familyId || "", JSON.stringify([...new Set(needs)]), JSON.stringify([...new Set(primary)]), note.trim(), id, trainerId]);
}

/* Archived, not deleted: a program may name it one day. Names tied to it
   go back to being sorted out. */
export async function archivePrivate(trainerId, id) {
  await run(`UPDATE coach_private_exercises SET archived = 1 WHERE id = ? AND trainer_id = ?`, [id, trainerId]);
  await run(`UPDATE coach_own_names SET exercise_id = '' WHERE exercise_id = ? AND trainer_id = ?`, [id, trainerId]);
}

/** Suggested to Glenn for the shared library, with a word on why; or taken back. */
export async function suggestPrivate(trainer, id, note) {
  await run(`UPDATE coach_private_exercises SET suggested_at = ?, suggest_note = ?, suggested_by_name = ? WHERE id = ? AND trainer_id = ?`,
    [note === null ? null : now(), note === null ? "" : String(note).trim().slice(0, 300), note === null ? "" : trainer.name || "", id, trainer.id]);
}

/** Every trainer's suggestions, for the Primary Master's review. */
export async function suggestions() {
  const rows = await all(`SELECT * FROM coach_private_exercises WHERE suggested_at IS NOT NULL AND archived = 0 ORDER BY suggested_at`);
  return rows.map(r => ({ ...shapePrivate(r), by: r.suggested_by_name || "" }));
}

/* -------------------------------------------------------- Billy's tools */

/**
 * "Find this exercise": the trainer's own names first (their word wins), then
 * their private exercises, then the library.
 */
export async function findExercise(trainerId, query) {
  const want = nameKey(query);
  if (!want) return { found: [] };
  const found = [];
  const own = await nameOf(trainerId, query);
  if (own?.exercise_id) {
    const x = BY_ID.get(own.exercise_id);
    if (x) found.push({ ...brief(x), theirName: own.name });
    else {
      const p = await privateOf(trainerId, own.exercise_id);
      if (p) found.push(briefOwn(shapePrivate(p), own.name));
    }
  }
  for (const p of (await all(`SELECT * FROM coach_private_exercises WHERE trainer_id = ? AND archived = 0`, [trainerId])).map(shapePrivate)) {
    if (nameKey(p.name) === want && !found.some(f => f.id === p.id)) {
      found.push(briefOwn(p));
    }
  }
  for (const x of searchLibrary(query, 8)) if (!found.some(f => f.id === x.id)) found.push(brief(x));
  return {
    found: found.slice(0, 8),
    ...(own && !own.exercise_id ? { note: `"${own.name}" is one of their names still to sort out.` } : {}),
  };
}

/* What a place has, as a set of checklist kinds with a yes; and what is still
   unanswered there. */
function placeKinds(place) {
  const has = new Set(), unknown = new Set();
  for (const c of place.categories) {
    if (c.has === true) { has.add(c.key); for (const k of IMPLIES[c.key] || []) has.add(k); }
    else if (c.has === null) unknown.add(c.key);
  }
  return { has, unknown, pieces: new Map(place.items.filter(i => i.piece).map(i => [i.piece, i.has])) };
}

/* Whether a version can be done at a place: "yes", "no", or the questions
   to ask first. */
function fitsPlace(x, kinds) {
  const eq = equipmentFor(x, FAMILIES[x.movement]);
  const ask = [];
  for (const k of eq.needs) {
    if (kinds.has.has(k)) continue;
    if (kinds.unknown.has(k)) ask.push(labelOfKind(k));
    else return "no";
  }
  if (eq.oneOf.length && !eq.oneOf.some(k => kinds.has.has(k))) {
    const open = eq.oneOf.filter(k => kinds.unknown.has(k));
    if (!open.length) return "no";
    ask.push(open.map(labelOfKind).join(" or "));
  }
  if (x.piece) {
    const said = kinds.pieces.get(x.piece);
    if (said === false) return "no";
    if (said === undefined) ask.push(PIECES[x.piece].label);
  }
  return ask.length ? ask : "yes";
}

/* Whether a version is safe for a client's limitations: "no", or what to
   modify (possibly nothing). `rules` are fact and joint keys. */
function fitsLimits(x, rules) {
  const facts = factsOf(x);
  const joints = x.cautions?.joints || [];
  if (facts.some(f => rules.avoid.facts.has(f)) || joints.some(j => rules.avoid.joints.has(j))) return "no";
  return [...facts.filter(f => rules.modify.facts.has(f)).map(f => FLAGS[f]), ...joints.filter(j => rules.modify.joints.has(j)).map(j => `the ${j.replace("-", " ")}`)];
}

const overlap = (a = [], b = []) => a.filter(v => b.includes(v)).length;

/* For the program designer (programs.js): the same checks, one version at a
   time, and the library to choose from. */
export const placeCheck = (x, place) => fitsPlace(x, placeKinds(place));
export const limitsCheck = (x, rules) => fitsLimits(x, rules);
export const liveExercises = () => LIVE;
export const familyOf = (x) => FAMILIES[x.movement];
export const masterOf = (x) => master(x);
/** One of a trainer's private exercises, shaped, or null. */
export async function privateBrief(trainerId, id) {
  const p = await privateOf(trainerId, id);
  return p ? shapePrivate(p) : null;
}
export const kindLabel = (key) => labelOfKind(key);

/**
 * "Find alternatives" (ideas audit, 4 and 14): versions that do the same job,
 * that pass the place's equipment, the level and the client's limitations.
 * The family first; when it has fewer than three that pass, wider, to other
 * movements of the same pattern that share a main muscle, those with the same
 * purposes first. What fails never comes back; what needs an unanswered piece
 * comes back marked with the question to ask first.
 *
 *   place   one of equipment.equipmentOf's places, or null for any equipment
 *   level   the most a client can do ("beginner" …), or null for any
 *   rules   from limitations.rulesOf, or null for none
 */
export function alternativesFor(exerciseId, { place = null, level = null, rules = null } = {}) {
  const x = BY_ID.get(exerciseId);
  if (!x) return { error: "That exercise isn't in the library." };
  const kinds = place ? placeKinds(place) : null;
  const top = level ? LEVELS.indexOf(level) : LEVELS.length - 1;
  const counts = { equipment: 0, level: 0, limitations: 0 };

  const judge = (y, why) => {
    if (y.id === x.id) return null;
    if (LEVELS.indexOf(y.level) > top) { counts.level++; return null; }
    const lim = rules ? fitsLimits(y, rules) : [];
    if (lim === "no") { counts.limitations++; return null; }
    const fit = kinds ? fitsPlace(y, kinds) : "yes";
    if (fit === "no") { counts.equipment++; return null; }
    return {
      ...brief(y), why,
      ...(fit !== "yes" ? { askFirst: fit } : {}),
      ...(lim.length ? { modifyFor: lim } : {}),
    };
  };
  /* Nearer the original's level first, then what needs no question. */
  const order = (list) => list.sort((a, b) =>
    (!!a.askFirst - !!b.askFirst) || Math.abs(LEVELS.indexOf(a.level) - LEVELS.indexOf(x.level)) - Math.abs(LEVELS.indexOf(b.level) - LEVELS.indexOf(x.level)));

  const family = order(LIVE.filter(y => y.movement === x.movement).map(y => judge(y, "same movement")).filter(Boolean));
  let wider = [];
  if (family.filter(f => !f.askFirst).length < 3) {
    const fam = FAMILIES[x.movement];
    const candidates = LIVE.filter(y => y.movement !== x.movement && FAMILIES[y.movement].pattern === fam.pattern && overlap(y.primary, x.primary) > 0);
    candidates.sort((a, b) =>
      overlap(FAMILIES[b.movement].purposes, fam.purposes) - overlap(FAMILIES[a.movement].purposes, fam.purposes)
      || overlap(b.primary, x.primary) - overlap(a.primary, x.primary));
    wider = order(candidates.map(y => judge(y, "same pattern and muscles")).filter(Boolean)).slice(0, 10);
  }
  return {
    for: brief(x),
    ...(rules ? { limitationsChecked: true } : {}),
    ...(place ? { place: place.name } : {}),
    alternatives: [...family.slice(0, 10), ...wider],
    leftOut: counts,
  };
}

/* ------------------------------------------------------------- review */


const commonName = (id) => BY_ID.get(id)?.name || id;

/**
 * The review page's front (ideas audit, 24): every family with how many of
 * its versions are approved and flagged, and the totals for the progress
 * count. Retired versions are left out: there is nothing to pass.
 */
export function reviewSummary() {
  const families = Object.entries(FAMILIES).map(([id, f]) => {
    const versions = LIVE.filter(x => x.movement === id);
    const marks = versions.map(x => reviews.markOf("exercise", x.id)?.mark);
    return {
      id, label: f.label, versions: versions.length,
      approved: versions.filter(x => reviews.statusOf("exercise", x.id, x.status) === "reviewed").length,
      flagged: marks.filter(m => m === "flag").length,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
  const sum = (k) => families.reduce((n, f) => n + f[k], 0);
  return { families, total: sum("versions"), approved: sum("approved"), flagged: sum("flagged") };
}

/** One family, as cards: everything about each version there is to pass, and to edit. */
export function reviewFamily(id) {
  const f = FAMILIES[id];
  if (!f) return null;
  const words = (list, table) => (list || []).map(k => table[k] || k);
  return {
    id, label: f.label, pattern: f.pattern,
    purposes: words(f.purposes, PURPOSES), roles: words(f.roles, ROLES),
    raw: f,
    /* Retired versions too, last, so one can be brought back. */
    versions: [...LIVE, ...ALL.filter(x => x.status === "retired")].filter(x => x.movement === id).map(x => {
      const eq = equipmentFor(x, f);
      return {
        id: x.id, name: x.name, master: master(x), aliases: x.aliases || [], formerNames: x.formerNames || [],
        level: x.level, primary: x.primary || [], secondary: x.secondary || [],
        needs: eq.needs.map(labelOfKind), needsOneOf: eq.oneOf.map(labelOfKind), piece: x.piece ? PIECES[x.piece].label : null,
        measure: measureOf(x, f), perSide: perSideOf(x, f),
        facts: factsOf(x).map(k => FLAGS[k] || k), joints: x.cautions?.joints || [],
        harder: (x.harder || []).map(commonName), easier: (EASIER.get(x.id) || []).map(commonName),
        origin: x.origin, status: reviews.statusOf("exercise", x.id, x.status), mark: reviews.markOf("exercise", x.id),
        /* As stored, for the editor. */
        raw: x, easierIds: EASIER.get(x.id) || [],
        harderSteps: (x.harder || []).map(h => ({ id: h, name: commonName(h) })),
        easierSteps: (EASIER.get(x.id) || []).map(h => ({ id: h, name: commonName(h) })),
      };
    }),
  };
}

/** The library's raw rows, for the editor. */
export const exerciseById = (id) => BY_ID.get(id) || null;
export const familyById = (id) => FAMILIES[id] || null;

/**
 * A trainer's suggested exercise, now in the library as `exerciseId`: the
 * names they had tied to their own are tied to the library's, and theirs is
 * archived, so they see the library's from now on.
 */
export async function acceptSuggestion(privateId, exerciseId) {
  await run(`UPDATE coach_own_names SET exercise_id = ? WHERE exercise_id = ?`, [exerciseId, privateId]);
  await run(`UPDATE coach_private_exercises SET archived = 1, accepted_into = ? WHERE id = ?`, [exerciseId, privateId]);
}

/** One suggestion, by its id, if it is still waiting. */
export async function suggestionById(id) {
  const r = await get(`SELECT * FROM coach_private_exercises WHERE id = ? AND suggested_at IS NOT NULL AND archived = 0`, [id]);
  return r ? { ...shapePrivate(r), by: r.suggested_by_name || "" } : null;
}
