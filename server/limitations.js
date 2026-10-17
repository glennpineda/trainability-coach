import { readFileSync } from "node:fs";
import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { FLAGS, JOINTS } from "./coach-iq.js";

/**
 * A client's limitations, as their trainer wrote them (ideas audit, 22).
 *
 * Kept in plain everyday words ("no kneeling, new knee"), never a diagnosis,
 * and tied to what it means for exercises: conditions from Coach IQ's
 * conditions table, and any facts or joints to keep away from. Every trainer
 * of the client sees it, with who wrote it (Glenn: "Yes, all their
 * trainers"); only the trainer who wrote it may delete it, and deleting is
 * deleting: this is health information, kept no longer than wanted.
 */

/* Coach IQ's conditions table, read once. */
const CONDITIONS = JSON.parse(readFileSync(new URL("../coach-iq/conditions.json", import.meta.url), "utf8")).conditions;
export const conditionsList = () => CONDITIONS.map(c => ({ key: c.key, label: c.label, status: c.status }));
const byKey = Object.fromEntries(CONDITIONS.map(c => [c.key, c]));

const parse = (s) => { try { const v = JSON.parse(s || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };

const shape = (r, trainerId) => ({
  id: r.id, text: r.text, conditions: parse(r.conditions), facts: parse(r.facts), joints: parse(r.joints),
  writtenBy: r.written_by_name, mine: r.written_by === trainerId, createdAt: r.created_at,
});

export async function limitationsOf(clientId, trainerId) {
  const rows = await all(`SELECT * FROM coach_limitations WHERE client_id = ? ORDER BY created_at`, [clientId]);
  return rows.map(r => shape(r, trainerId));
}

/** What makes a limitation worth keeping, or the reason it is not. */
export function checkLimitation({ text, conditions = [], facts = [], joints = [] } = {}) {
  if (typeof text !== "string" || !text.trim()) return "Say what the limitation is, in plain words.";
  if (text.trim().length > 300) return "Keep it short.";
  if (!Array.isArray(conditions) || conditions.some(c => !byKey[c])) return "That isn't one of the conditions Coach knows.";
  if (!Array.isArray(facts) || facts.some(f => !FLAGS[f])) return "That isn't one of the things Coach can keep away from.";
  if (!Array.isArray(joints) || joints.some(j => !JOINTS.includes(j))) return "That isn't a joint Coach knows.";
  return null;
}

export function addLimitation(clientId, trainer, { text, conditions = [], facts = [], joints = [] }) {
  return insertWithNewId("limitation", (id) => run(
    `INSERT INTO coach_limitations (id, client_id, text, conditions, facts, joints, written_by, written_by_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, clientId, text.trim(), JSON.stringify([...new Set(conditions)]), JSON.stringify([...new Set(facts)]),
      JSON.stringify([...new Set(joints)]), trainer.id, trainer.name || "", new Date().toISOString()]));
}

/** Deleted, by the trainer who wrote it only. Returns whether it was theirs. */
export async function deleteLimitation(id, trainerId) {
  const r = await get(`SELECT written_by FROM coach_limitations WHERE id = ?`, [id]);
  if (!r) return "missing";
  if (r.written_by !== trainerId) return "not_yours";
  await run(`DELETE FROM coach_limitations WHERE id = ?`, [id]);
  return "deleted";
}

export async function clientOf(id) {
  return get(`SELECT client_id FROM coach_limitations WHERE id = ?`, [id]);
}

/**
 * What a client's limitations mean for exercises, for Billy: each in the
 * trainer's words, with its conditions spelled out (what to avoid and modify,
 * whether a doctor's clearance comes first, when to refer on), and everything
 * to avoid gathered in one place. A condition still in draft says so.
 */
export function meaningOf(limitations) {
  const rules = rulesOf(limitations);
  const notes = limitations.map(l => ({
    said: l.text, by: l.writtenBy,
    conditions: l.conditions.map(k => byKey[k]).filter(Boolean).map(c =>
      ({ condition: c.label, clearanceFirst: c.clearance, refer: c.refer, ...(c.status === "draft" ? { draft: true } : {}) })),
  }));
  const words = (set) => [...set].map(f => FLAGS[f] || f);
  return {
    limitations: notes,
    avoid: { facts: words(rules.avoid.facts), joints: [...rules.avoid.joints] },
    modify: { facts: words(rules.modify.facts), joints: [...rules.modify.joints] },
  };
}

/**
 * The same, as the library's own keys, for filtering exercises in code
 * (library.js, alternativesFor): what to avoid, and what to modify that
 * isn't already avoided.
 */
export function rulesOf(limitations) {
  const avoid = { facts: new Set(), joints: new Set() }, modify = { facts: new Set(), joints: new Set() };
  for (const l of limitations) {
    for (const f of l.facts) avoid.facts.add(f);
    for (const j of l.joints) avoid.joints.add(j);
    for (const c of l.conditions.map(k => byKey[k]).filter(Boolean)) {
      for (const f of c.avoid.facts) avoid.facts.add(f);
      for (const j of c.avoid.joints) avoid.joints.add(j);
      for (const f of c.modify.facts) modify.facts.add(f);
      for (const j of c.modify.joints) modify.joints.add(j);
    }
  }
  for (const f of avoid.facts) modify.facts.delete(f);
  for (const j of avoid.joints) modify.joints.delete(j);
  return { avoid, modify };
}
