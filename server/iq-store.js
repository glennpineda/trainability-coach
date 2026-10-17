import { readFileSync } from "node:fs";
import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { checkLibrary } from "./iq-check.js";

/**
 * Coach IQ's library, kept in the app (Glenn, 17 Oct 2026: "Is there another
 * way so it's app controlled?" … "Yes, use LIH").
 *
 * Its families, versions and conditions are rows in `coach_iq_docs`, each the
 * same JSON as in coach-iq/exercises.json and conditions.json. Those files
 * load it the first time the app starts with an empty table, and stay in the
 * code as its starting copy and a backup (an export from the app can be
 * written back into them: `npm run iq -- --import <file>`).
 *
 * Every change goes through `change()`: the whole library as it would be is
 * checked with Coach IQ's rules (iq-check.js, the same ones `npm run
 * check-iq` runs) and refused, with the reasons, if it would break; saved
 * otherwise, with a history record (lih…) holding each touched row before and
 * after, so any change can be undone.
 *
 * The library is held in memory, read at start, and replaced on each change;
 * whoever needs it asks `current()` and may listen with `onChange`. Until the
 * database has answered (or if it never does), the files are the library, so
 * Billy and the screens work either way.
 */

const read = (name) => JSON.parse(readFileSync(new URL(`../coach-iq/${name}`, import.meta.url), "utf8"));

function fromFiles() {
  const { movements, exercises } = read("exercises.json");
  const { conditions } = read("conditions.json");
  return { movements, exercises, conditions };
}

let state = fromFiles();
let fromDatabase = false;
const listeners = new Set();

/** The library as it stands: { movements, exercises, conditions }. Never change it in place. */
export const current = () => state;
/** Whether the library is the database's (true) or still the files' (false). */
export const isLive = () => fromDatabase;
export const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

function replace(next) {
  state = next;
  for (const fn of listeners) {
    try { fn(state); } catch (err) { console.error(`A listener on the library failed: ${err.message}`); }
  }
}

/* Rows into a library, in their order. */
function assemble(rows) {
  const sorted = [...rows].sort((a, b) => Number(a.pos) - Number(b.pos));
  const of = (kind) => sorted.filter(r => r.kind === kind).map(r => [r.id, JSON.parse(r.data)]);
  return {
    movements: Object.fromEntries(of("family")),
    exercises: of("exercise").map(([, x]) => x),
    conditions: of("condition").map(([, c]) => c),
  };
}

const now = () => new Date().toISOString();

/**
 * Read the library from the database, loading it from the files the first
 * time. Marks the Primary Master made before the library moved (reviews.js,
 * "App now, file later") are written into it then, so an approval is not lost
 * in the move.
 */
export async function load() {
  let rows = await all(`SELECT kind, id, pos, data FROM coach_iq_docs`);
  if (!rows.length) {
    const lib = fromFiles();
    const latest = new Map();
    for (const m of await all(`SELECT kind, target, mark, created_at FROM coach_iq_reviews ORDER BY created_at`)) latest.set(`${m.kind}:${m.target}`, m);
    const marked = (kind, doc, key) => {
      const m = latest.get(`${kind}:${key}`);
      if (m?.mark === "approve") return { ...doc, status: "reviewed", reviewed: String(m.created_at).slice(0, 10) };
      if (m?.mark === "flag" && doc.status === "reviewed") return { ...doc, status: "draft", reviewed: null };
      return doc;
    };
    let pos = 0;
    const stamp = now();
    for (const [id, f] of Object.entries(lib.movements)) await insertDoc("family", id, f, pos++, stamp);
    for (const x of lib.exercises) await insertDoc("exercise", x.id, marked("exercise", x, x.id), pos++, stamp);
    for (const c of lib.conditions) await insertDoc("condition", c.key, marked("condition", c, c.key), pos++, stamp);
    await insertWithNewId("libraryHistory", (id) => run(
      `INSERT INTO coach_iq_history (id, summary, changes, changed_by, changed_by_name, changed_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, `Loaded from the files: ${Object.keys(lib.movements).length} families, ${lib.exercises.length} versions, ${lib.conditions.length} conditions`, "[]", "", "Coach", stamp]));
    rows = await all(`SELECT kind, id, pos, data FROM coach_iq_docs`);
  }
  fromDatabase = true;
  replace(assemble(rows));
}

const insertDoc = (kind, id, data, pos, stamp) =>
  run(`INSERT INTO coach_iq_docs (kind, id, pos, data, updated_at) VALUES (?, ?, ?, ?, ?)`, [kind, id, pos, JSON.stringify(data), stamp]);

/* One row of the library as it stands, or null. */
function find(lib, kind, id) {
  if (kind === "family") return lib.movements[id] ?? null;
  if (kind === "exercise") return lib.exercises.find(x => x.id === id) ?? null;
  if (kind === "condition") return lib.conditions.find(c => c.key === id) ?? null;
  return null;
}

/* The library with some rows replaced, added (at the end) or taken out (null). */
function withChanges(lib, changes) {
  const movements = { ...lib.movements };
  let exercises = [...lib.exercises];
  let conditions = [...lib.conditions];
  for (const { kind, id, after } of changes) {
    if (kind === "family") {
      if (after) movements[id] = after; else delete movements[id];
    } else if (kind === "exercise") {
      const at = exercises.findIndex(x => x.id === id);
      if (!after) exercises = exercises.filter(x => x.id !== id);
      else if (at === -1) exercises.push(after);
      else exercises[at] = after;
    } else if (kind === "condition") {
      const at = conditions.findIndex(c => c.key === id);
      if (!after) conditions = conditions.filter(c => c.key !== id);
      else if (at === -1) conditions.push(after);
      else conditions[at] = after;
    }
  }
  return { movements, exercises, conditions };
}

/** A change the library's rules refuse, with the reasons in plain words. */
export class Refused extends Error {
  constructor(problems) { super(problems.join(" ")); this.problems = problems; }
}

/**
 * Change the library: `changes` is a list of { kind, id, after }, where after
 * is the whole new row (or null to take one out, which only undoing an
 * addition does). Checked first, all or nothing; returns the history id.
 */
export async function change(changes, who, summary, { undoes = "" } = {}) {
  if (!fromDatabase) throw new Refused(["The library's database isn't ready, so nothing can be changed just now."]);
  const before = state;
  const next = withChanges(before, changes);
  const { problems } = checkLibrary(next);
  if (problems.length) throw new Refused(problems);
  const stamp = now();
  let pos = Number((await get(`SELECT MAX(pos) AS top FROM coach_iq_docs`))?.top) || 0;
  const record = [];
  for (const { kind, id, after } of changes) {
    const was = find(before, kind, id);
    record.push({ kind, id, before: was, after });
    if (!after) await run(`DELETE FROM coach_iq_docs WHERE kind = ? AND id = ?`, [kind, id]);
    else if (was) await run(`UPDATE coach_iq_docs SET data = ?, updated_at = ? WHERE kind = ? AND id = ?`, [JSON.stringify(after), stamp, kind, id]);
    else await insertDoc(kind, id, after, ++pos, stamp);
  }
  const id = await insertWithNewId("libraryHistory", (newId) => run(
    `INSERT INTO coach_iq_history (id, summary, changes, changed_by, changed_by_name, changed_at, undoes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newId, String(summary).slice(0, 300), JSON.stringify(record), who.id, who.name || "", stamp, undoes]));
  replace(next);
  return id;
}

const shape = (r) => {
  const changes = JSON.parse(r.changes || "[]");
  return {
    id: r.id, summary: r.summary, by: r.changed_by_name, at: r.changed_at,
    touches: changes.map(c => ({ kind: c.kind, id: c.id, added: !c.before, removed: !c.after })),
    undoes: r.undoes || null, undoneBy: r.undone_by || null,
  };
};

/** The latest changes, newest first, or those touching one row. */
export async function history({ kind, id, limit = 50 } = {}) {
  const rows = id
    ? await all(`SELECT * FROM coach_iq_history WHERE changes LIKE ? ORDER BY changed_at DESC`, [`%"id":${JSON.stringify(id)}%`])
    : await all(`SELECT * FROM coach_iq_history ORDER BY changed_at DESC LIMIT ?`, [limit]);
  return rows.map(shape).filter(h => !id || h.touches.some(t => t.id === id && (!kind || t.kind === kind))).slice(0, limit);
}

/**
 * Undo one change: every row it touched goes back to what it was, as a new
 * change of its own. Refused if one of those rows has changed since, so a
 * later change is never quietly lost: undo that one first.
 */
export async function undo(historyId, who) {
  const r = await get(`SELECT * FROM coach_iq_history WHERE id = ?`, [historyId]);
  if (!r) return null;
  if (r.undone_by) throw new Refused(["That change has already been undone."]);
  const changes = JSON.parse(r.changes || "[]");
  if (!changes.length) throw new Refused(["Loading the library from the files can't be undone."]);
  for (const c of changes) {
    if (JSON.stringify(find(state, c.kind, c.id)) !== JSON.stringify(c.after)) {
      throw new Refused([`${c.after?.name || c.after?.label || c.before?.name || c.before?.label || c.id} has changed since. Undo the later change first.`]);
    }
  }
  const id = await change(changes.map(c => ({ kind: c.kind, id: c.id, after: c.before })), who, `Undid: ${r.summary}`, { undoes: r.id });
  await run(`UPDATE coach_iq_history SET undone_by = ? WHERE id = ?`, [id, r.id]);
  return id;
}

/** The library as a file, in the files' own shape, for Export. */
export function exportLibrary() {
  return { exported: now(), ...state };
}
