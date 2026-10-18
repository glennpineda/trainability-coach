import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { PIECES, pieceFor } from "./coach-iq.js";

/**
 * The equipment a trainer has: the first part of their personal memory
 * (coach-iq/README.md, "Equipment: asked little, learned as it goes").
 *
 * It is the trainer's own (Glenn: equipment belongs to the trainer), kept per
 * place inside it (ideas audit, 18): the studio, a client's home, the park.
 * Each place has a short checklist of kinds, yes or no, and particular pieces
 * asked about only when a program needs one ("a low row machine"), kept so
 * the question is never asked twice. A piece Coach knows by name (PIECES in
 * coach-iq.js) is matched whatever the trainer calls it, and keeps their
 * wording too. Every change is kept in a history (ideas audit, 20).
 */

/* The checklist, in the order it is asked. Keys are kept forever: an answer
   is stored against its key. Labels may change, and kinds may be added
   (ideas audit, 19). */
export const CATEGORIES = [
  { key: "dumbbells", label: "Dumbbells" },
  { key: "barbells", label: "Barbells and a rack" },
  { key: "kettlebells", label: "Kettlebells" },
  { key: "machines", label: "Weight machines" },
  { key: "cables", label: "Cables" },
  { key: "bench", label: "A flat bench" },
  { key: "benchadjustable", label: "An adjustable bench (incline and decline)" },
  { key: "stations", label: "Gym stations: a dip station, back extension or preacher bench" },
  { key: "pullup", label: "A pull-up bar" },
  { key: "bands", label: "Resistance bands" },
  { key: "suspension", label: "A suspension trainer (TRX)" },
  { key: "medball", label: "Medicine balls" },
  { key: "stabilityball", label: "A stability ball" },
  { key: "box", label: "A plyo box or step" },
  { key: "sled", label: "A sled or turf" },
  { key: "ropes", label: "Battle ropes" },
  { key: "loaded", label: "A weighted vest or sandbag" },
  { key: "smalltools", label: "Small tools: an ab wheel, sliders, a jump rope, a foam roller" },
  { key: "cardio", label: "Cardio machines" },
  { key: "mat", label: "Mats" },
  { key: "space", label: "Room to move: walking lunges, sprints" },
];
const KEYS = new Set(CATEGORIES.map(c => c.key));
export const isCategory = (key) => KEYS.has(key);

/* A yes to one kind is a yes to another: an adjustable bench lies flat. */
export const IMPLIES = { benchadjustable: ["bench"] };

/* The place every trainer starts with, to rename as they like. */
export const FIRST_PLACE = "Where I usually train";

const keyOf = (name) => String(name).trim().toLowerCase().replace(/\s+/g, " ");
const now = () => new Date().toISOString();

const shapeItem = (r) => ({
  id: r.id, name: r.name, category: r.category, piece: r.piece_key || null, has: Number(r.has) === 1,
  note: r.note || "", source: r.source, updatedAt: r.updated_at,
});

/* ---------------------------------------------------------------- places */

const shapePlace = (r) => ({ id: r.id, name: r.name, ...(Number(r.from_studio) ? { fromStudio: true } : {}) });
const PLACES = `SELECT * FROM coach_places WHERE trainer_id = ? AND archived = 0 ORDER BY from_studio DESC, created_at, id`;

/** This trainer's places, their place in Studio first, then oldest first; the first one is made if they have none. */
export async function placesOf(trainerId) {
  let rows = await all(PLACES, [trainerId]);
  if (!rows.length) {
    await insertWithNewId("place", (id) => run(
      `INSERT INTO coach_places (id, trainer_id, name, archived, created_at) VALUES (?, ?, ?, 0, ?)`, [id, trainerId, FIRST_PLACE, now()]));
    rows = await all(PLACES, [trainerId]);
  }
  return rows.map(shapePlace);
}

/** One of this trainer's own places, or null. Never another trainer's. */
export async function placeOf(trainerId, placeId) {
  const r = await get(`SELECT * FROM coach_places WHERE id = ? AND trainer_id = ? AND archived = 0`, [placeId, trainerId]);
  return r ? shapePlace(r) : null;
}

/**
 * The trainer's place in Studio (their default place there) as one of their
 * places here, with its own equipment answers like any other. Made the first
 * time it is seen, named as Studio names it and renamed when Studio's name
 * changes, and brought back if it was put away. When Studio's place for them
 * changes, the old one stays, as an ordinary place of theirs, with its
 * answers. `place` is null when Studio has none for them.
 */
export async function linkStudioPlace(trainerId, place) {
  const rows = await all(`SELECT * FROM coach_places WHERE trainer_id = ? AND studio_place_id != ''`, [trainerId]);
  for (const r of rows) {
    if (Number(r.from_studio) && r.studio_place_id !== place?.id) await run(`UPDATE coach_places SET from_studio = 0 WHERE id = ?`, [r.id]);
  }
  if (!place) return;
  const name = String(place.name || "").trim().slice(0, 80) || "My studio";
  const mine = rows.find(r => r.studio_place_id === place.id);
  if (mine) {
    if (mine.name !== name || Number(mine.archived) || !Number(mine.from_studio)) {
      await run(`UPDATE coach_places SET name = ?, archived = 0, from_studio = 1 WHERE id = ?`, [name, mine.id]);
    }
    return;
  }
  await insertWithNewId("place", (id) => run(
    `INSERT INTO coach_places (id, trainer_id, name, archived, created_at, studio_place_id, from_studio) VALUES (?, ?, ?, 0, ?, ?, 1)`,
    [id, trainerId, name, now(), place.id]));
}

export async function addPlace(trainerId, name) {
  return insertWithNewId("place", (id) => run(
    `INSERT INTO coach_places (id, trainer_id, name, archived, created_at) VALUES (?, ?, ?, 0, ?)`, [id, trainerId, String(name).trim(), now()]));
}

export async function renamePlace(trainerId, placeId, name) {
  await run(`UPDATE coach_places SET name = ? WHERE id = ? AND trainer_id = ?`, [String(name).trim(), placeId, trainerId]);
}

/** Put away, never deleted: its answers stay, as everything in memory does. The last place stays. */
export async function archivePlace(trainerId, placeId) {
  const places = await placesOf(trainerId);
  if (places.length <= 1) return "last";
  if (places.find(p => p.id === placeId)?.fromStudio) return "studio";
  await run(`UPDATE coach_places SET archived = 1 WHERE id = ? AND trainer_id = ?`, [placeId, trainerId]);
  return null;
}

export const checkPlaceName = (name) =>
  typeof name !== "string" || !name.trim() || name.trim().length > 80 ? "Give the place a short name." : null;

/* ---------------------------------------------------------------- answers */

/** Everything this trainer has told Coach: each place with its checklist and pieces. */
export async function equipmentOf(trainerId) {
  const places = await placesOf(trainerId);
  const rows = await all(`SELECT * FROM coach_place_equipment WHERE trainer_id = ? ORDER BY kind, name`, [trainerId]);
  return {
    places: places.map(p => {
      const here = rows.filter(r => r.place_id === p.id);
      const answers = new Map(here.filter(r => r.kind === "category").map(r => [r.name_key, r]));
      return {
        ...p,
        categories: CATEGORIES.map(c => {
          const a = answers.get(c.key);
          return { key: c.key, label: c.label, has: a ? Number(a.has) === 1 : null, source: a?.source || null };
        }),
        items: here.filter(r => r.kind === "item").map(shapeItem),
      };
    }),
    pieces: Object.entries(PIECES).map(([key, p]) => ({ key, label: p.label, kind: p.kind })),
  };
}

/* The answer as it stands, for comparing before a change. */
const current = (placeId, kind, name) =>
  get(`SELECT * FROM coach_place_equipment WHERE place_id = ? AND kind = ? AND name_key = ?`, [placeId, kind, keyOf(name)]);

/* One answer made, changed or taken back (`has` null), with its history kept. */
async function save(trainerId, placeId, kind, name, fields) {
  const had = await current(placeId, kind, name);
  const stamp = now();
  if (fields.has === null) {
    if (had) {
      await run(`DELETE FROM coach_place_equipment WHERE id = ?`, [had.id]);
      await run(`INSERT INTO coach_equipment_history (equipment_id, changed_at, has, source) VALUES (?, ?, ?, ?)`, [had.id, stamp, -1, fields.source]);
    }
    return null;
  }
  const row = [String(name).trim(), fields.category, fields.piece || "", fields.has ? 1 : 0, fields.note || "", fields.source, stamp];
  let id = had?.id;
  if (had) {
    await run(`UPDATE coach_place_equipment SET name = ?, category = ?, piece_key = ?, has = ?, note = ?, source = ?, updated_at = ? WHERE id = ?`, [...row, id]);
  } else {
    id = await insertWithNewId("equipment", (newId) => run(
      `INSERT INTO coach_place_equipment (id, trainer_id, place_id, kind, name_key, name, category, piece_key, has, note, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [newId, trainerId, placeId, kind, keyOf(name), ...row]));
  }
  await run(`INSERT INTO coach_equipment_history (equipment_id, changed_at, has, source) VALUES (?, ?, ?, ?)`, [id, stamp, fields.has ? 1 : 0, fields.source]);
  return id;
}

/** A checklist answer at a place: true, false, or null to take it back. */
export const setCategory = (trainerId, placeId, key, has, source = "trainer") =>
  save(trainerId, placeId, "category", key, { category: key, has, source });

/** A particular piece at a place. A piece Coach knows takes its kind from the list. */
export function setItem(trainerId, placeId, { name, category, has, note = "" }, source = "trainer") {
  const piece = pieceFor(name);
  return save(trainerId, placeId, "item", name, {
    category: piece ? PIECES[piece].kind : category, piece, has: !!has, note: String(note).slice(0, 200), source,
  });
}

/** What is there now for a checklist kind or a piece, to compare before a change. */
export async function answerFor(placeId, kind, name) {
  const r = await current(placeId, kind, name);
  return r ? { has: Number(r.has) === 1, source: r.source } : null;
}

/** A piece taken off a place's list. Only this trainer's own. */
export async function removeItem(trainerId, id) {
  const had = await get(`SELECT id FROM coach_place_equipment WHERE trainer_id = ? AND kind = 'item' AND id = ?`, [trainerId, id]);
  if (!had) return;
  await run(`DELETE FROM coach_place_equipment WHERE id = ?`, [id]);
  await run(`INSERT INTO coach_equipment_history (equipment_id, changed_at, has, source) VALUES (?, ?, ?, ?)`, [id, now(), -1, "trainer"]);
}

/** What makes a piece worth keeping, or the reason it is not. */
export function checkItem({ name, category, has, note } = {}) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 120) return "Give the equipment a name.";
  if (!pieceFor(name) && !isCategory(category)) return "Choose the kind of equipment it is.";
  if (typeof has !== "boolean") return "Say whether it's there.";
  if (note !== undefined && (typeof note !== "string" || note.length > 200)) return "Keep the note short.";
  return null;
}

/**
 * Answers kept before places existed (`coach_equipment`, build 1.0.1 to
 * 1.0.4) moved into each trainer's first place, once, keeping their ids. The
 * old table is left as it was.
 */
export async function adoptOldAnswers() {
  const old = await all(`SELECT * FROM coach_equipment`);
  const moved = new Set((await all(`SELECT id FROM coach_place_equipment`)).map(r => r.id));
  for (const r of old.filter(r => !moved.has(r.id))) {
    const [place] = await placesOf(r.trainer_id);
    await run(`INSERT INTO coach_place_equipment (id, trainer_id, place_id, kind, name_key, name, category, piece_key, has, note, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.id, r.trainer_id, place.id, r.kind, r.name_key, r.name, r.category, r.kind === "item" ? (pieceFor(r.name) || "") : "", r.has, r.where_note || "", r.source, r.updated_at]);
  }
}
