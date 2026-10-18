import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { MEASURES, MEASURE_KEYS, fromShown } from "../src/lib/measures.js";

/**
 * A client's body measurements (Glenn, 18 Oct 2026): weight, body fat, and
 * girths with arm, thigh and calf left and right ("Usual set, left and
 * right"), one set per day they were taken, ids `msr` (Glenn's tag). Studio
 * has none to copy, so this follows Coach's limitations (limitations.js):
 * every trainer of the client sees them, with who took each set ("All the
 * client's trainers"), and only that trainer may change or delete one.
 *
 * Kept in metric; the page sends what the trainer typed in their own units
 * with `units`, and reads metric back (src/lib/measures.js).
 */

const COLUMN = Object.fromEntries(MEASURE_KEYS.map(k => [k, k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)]));
const now = () => new Date().toISOString();

function shape(r, trainerId) {
  const values = {};
  for (const k of MEASURE_KEYS) values[k] = r[COLUMN[k]] == null ? null : Number(r[COLUMN[k]]);
  return { id: r.id, clientId: r.client_id, takenOn: r.taken_on, values, note: r.note || "",
    takenBy: r.trainer_name, mine: r.trainer_id === trainerId, createdAt: r.created_at, updatedAt: r.updated_at };
}

/** Newest first. */
export async function measurementsOf(clientId, trainerId) {
  const rows = await all(`SELECT * FROM coach_measurements WHERE client_id = ? ORDER BY taken_on DESC, created_at DESC`, [clientId]);
  return rows.map(r => shape(r, trainerId));
}

export const measurementById = (id) => get(`SELECT * FROM coach_measurements WHERE id = ?`, [id]);
export const shapeOf = shape;

const today = () => new Date().toISOString().slice(0, 10);

/**
 * What the page sent, checked and turned into metric: `{ values, takenOn,
 * note }` or `{ error }`. A number outside a person's range is refused in the
 * trainer's own words and units, as a slip of the finger is likely.
 */
export function check(body = {}) {
  const units = body.units === "metric" ? "metric" : "imperial";
  const takenOn = String(body.takenOn || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn) || Number.isNaN(Date.parse(`${takenOn}T00:00:00Z`))) return { error: "Choose the day they were taken." };
  if (takenOn > today() || takenOn < "1990-01-01") return { error: "Choose a day that has been, not one still to come." };
  const values = {};
  let any = false;
  for (const m of MEASURES) {
    const raw = body.values?.[m.key];
    if (raw === undefined || raw === null || raw === "") { values[m.key] = null; continue; }
    const n = Number(String(raw).replace(",", "."));
    if (!Number.isFinite(n)) return { error: `${m.label}: write a number.` };
    const metric = fromShown(m, n, units);
    if (metric < m.min || metric > m.max) return { error: `${m.label} of ${n}${m.kind === "percent" ? "%" : ""} doesn't look right. Check it and try again.` };
    values[m.key] = metric;
    any = true;
  }
  if (!any) return { error: "Fill in at least one measurement." };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  return { values, takenOn, note };
}

export async function add(clientId, trainer, { values, takenOn, note }) {
  const cols = MEASURE_KEYS.map(k => COLUMN[k]);
  const at = now();
  return insertWithNewId("measurement", (id) => run(
    `INSERT INTO coach_measurements (id, client_id, trainer_id, trainer_name, taken_on, note, created_at, updated_at, ${cols.join(", ")})
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${cols.map(() => "?").join(", ")})`,
    [id, clientId, trainer.id, String(trainer.name || "").slice(0, 120), takenOn, note, at, at, ...MEASURE_KEYS.map(k => values[k])]));
}

/** Changed by the trainer who took it; anyone else is told so. */
export async function update(id, trainerId, { values, takenOn, note }) {
  const r = await measurementById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await run(`UPDATE coach_measurements SET taken_on = ?, note = ?, updated_at = ?, ${MEASURE_KEYS.map(k => `${COLUMN[k]} = ?`).join(", ")} WHERE id = ?`,
    [takenOn, note, now(), ...MEASURE_KEYS.map(k => values[k]), id]);
  return "done";
}

export async function remove(id, trainerId) {
  const r = await measurementById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await run(`DELETE FROM coach_measurements WHERE id = ?`, [id]);
  return "done";
}

/** The SQL columns, for the schema. */
export const MEASURE_COLUMNS = MEASURE_KEYS.map(k => COLUMN[k]);
