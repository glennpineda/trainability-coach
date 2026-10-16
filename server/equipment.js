import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";

/**
 * The equipment a trainer has: the first part of their personal memory
 * (coach-iq/README.md, "Equipment: asked little, learned as it goes").
 *
 * A short checklist of categories first, yes or no. Then particular pieces,
 * asked about only when a program needs one ("a low row machine") and kept so
 * the question is never asked twice. Every piece belongs to a category, which
 * is what an exercise falls back to when the piece is missing.
 *
 * It is the trainer's own, not a place's; where they have something (the
 * studio, a client's home) is a note on it.
 */

/* The checklist, in the order it is asked. Keys are kept forever: an answer
   is stored against its key. */
export const CATEGORIES = [
  { key: "dumbbells", label: "Dumbbells" },
  { key: "barbells", label: "Barbells and a rack" },
  { key: "kettlebells", label: "Kettlebells" },
  { key: "machines", label: "Weight machines" },
  { key: "cables", label: "Cables" },
  { key: "bench", label: "A bench" },
  { key: "pullup", label: "A pull-up bar" },
  { key: "bands", label: "Resistance bands" },
  { key: "suspension", label: "A suspension trainer (TRX)" },
  { key: "medball", label: "Medicine balls" },
  { key: "stabilityball", label: "A stability ball" },
  { key: "box", label: "A plyo box or step" },
  { key: "sled", label: "A sled or turf" },
  { key: "cardio", label: "Cardio machines" },
  { key: "mat", label: "Mats and foam rollers" },
];
const KEYS = new Set(CATEGORIES.map(c => c.key));
export const isCategory = (key) => KEYS.has(key);

const keyOf = (name) => String(name).trim().toLowerCase().replace(/\s+/g, " ");
const now = () => new Date().toISOString();

const shape = (r) => ({
  id: r.id, name: r.name, category: r.category, has: Number(r.has) === 1,
  where: r.where_note || "", source: r.source, updatedAt: r.updated_at,
});

/** Everything this trainer has told Coach: the checklist and the pieces. */
export async function equipmentOf(trainerId) {
  const rows = await all(`SELECT * FROM coach_equipment WHERE trainer_id = ? ORDER BY kind, name`, [trainerId]);
  const answers = new Map(rows.filter(r => r.kind === "category").map(r => [r.name_key, r]));
  return {
    categories: CATEGORIES.map(c => {
      const a = answers.get(c.key);
      return { key: c.key, label: c.label, has: a ? Number(a.has) === 1 : null, source: a?.source || null };
    }),
    items: rows.filter(r => r.kind === "item").map(shape),
  };
}

/* One row, made or changed. `has` null takes a checklist answer back. */
async function save(trainerId, kind, name, fields) {
  const nameKey = keyOf(name);
  const had = await get(`SELECT id FROM coach_equipment WHERE trainer_id = ? AND kind = ? AND name_key = ?`, [trainerId, kind, nameKey]);
  if (fields.has === null) {
    if (had) await run(`DELETE FROM coach_equipment WHERE id = ?`, [had.id]);
    return null;
  }
  const row = [String(name).trim(), fields.category, fields.has ? 1 : 0, fields.where || "", fields.source, now()];
  if (had) {
    await run(`UPDATE coach_equipment SET name = ?, category = ?, has = ?, where_note = ?, source = ?, updated_at = ? WHERE id = ?`, [...row, had.id]);
    return had.id;
  }
  /* Studio's kind of id, with Glenn's tag (ids.js). Rows made before it,
     with an "eq_" id, keep theirs: an id is never changed. */
  return insertWithNewId("equipment", (id) => run(
    `INSERT INTO coach_equipment (id, trainer_id, kind, name_key, name, category, has, where_note, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, trainerId, kind, nameKey, ...row]));
}

/** A checklist answer: true, false, or null to take it back. */
export const setCategory = (trainerId, key, has, source = "trainer") =>
  save(trainerId, "category", key, { category: key, has, source });

/** A particular piece: whether they have it, its category, and where. */
export const setItem = (trainerId, { name, category, has, where = "" }, source = "trainer") =>
  save(trainerId, "item", name, { category, has: !!has, where: String(where).slice(0, 200), source });

/** A piece taken off their list. Only their own. */
export async function removeItem(trainerId, id) {
  await run(`DELETE FROM coach_equipment WHERE trainer_id = ? AND kind = 'item' AND id = ?`, [trainerId, id]);
}

/** What makes a piece worth keeping, or the reason it is not. */
export function checkItem({ name, category, has, where } = {}) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return "Give the equipment a name.";
  if (!isCategory(category)) return "Choose the kind of equipment it is.";
  if (typeof has !== "boolean") return "Say whether it's there.";
  if (where !== undefined && (typeof where !== "string" || where.length > 200)) return "Keep where it is to a short note.";
  return null;
}
