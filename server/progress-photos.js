import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { all, get, run } from "./db.js";
import { insertWithNewId, isId } from "./ids.js";
import { filePath } from "./durable-home.js";
import { ANGLE_KEYS, PHOTO_MAX_BYTES } from "../src/lib/progress-photos.js";

/**
 * A client's progress photos (Glenn, 19 Oct 2026): front, left side, right
 * side and back, one set per day, ids `pph` (Glenn's tag). Every trainer of
 * the client sees them with who took each set, once one of them has recorded
 * that the client agreed ("Trainers, with a client opt-in"); only the trainer
 * who took a set may delete it. If the client stops agreeing, any of their
 * trainers can say so, and every set goes, by whoever it was taken.
 *
 * The pictures are files (progress/<id>-<angle>.jpg in the files folder),
 * never in the database. They are shown through links signed for an hour
 * (`photoUrl`), handed out with the list, which is only given to the
 * client's trainers: so a picture isn't one more question to Studio about
 * who the client's trainers are.
 */

const now = () => new Date().toISOString();
/* The latest day a trainer may pick: tomorrow by UTC, since the server can't
   know the trainer's clock and somewhere it is already tomorrow (UTC+14). The
   page caps the date box at the device's own today (Run 1, A-2). */
const latestDay = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const dir = () => filePath("progress");
const fileOf = (id, angle) => {
  if (!isId("progressPhotos", id) || !ANGLE_KEYS.includes(angle)) throw new Error("Bad progress photo");
  return path.join(dir(), `${id}-${angle}.jpg`);
};
export const pathOf = fileOf;

/* The signing key for the links: from the client link's secret where it is
   set, else one made when the app starts (links then last until a restart). */
const STARTED_KEY = crypto.randomBytes(32).toString("hex");
const key = () => process.env.COACH_LINK_SECRET || STARTED_KEY;
const HOUR = 60 * 60 * 1000;
const sign = (what, exp) => crypto.createHmac("sha256", key()).update(`photo:${what}.${exp}`).digest("base64url");
/** A link to one picture, good for an hour or more. `what` is `<id>-<angle>`, or an attachment's `<att>.<n>.<angle>`. */
export function signedUrl(base, what) {
  /* On the hour, an hour or two ahead, so a picture's link stays the same
     for a while and the browser's cached copy is used. */
  const exp = (Math.floor(Date.now() / HOUR) + 2) * HOUR;
  return `${base}/${encodeURIComponent(what)}?exp=${exp}&sig=${sign(what, exp)}`;
}
export function signedOk(what, exp, sig) {
  if (!(Number(exp) > Date.now())) return false;
  const a = Buffer.from(String(sig || "")), b = Buffer.from(sign(what, Number(exp)));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function shape(r, trainerId) {
  const angles = String(r.angles || "").split(",").filter(a => ANGLE_KEYS.includes(a));
  return {
    id: r.id, clientId: r.client_id, takenOn: r.taken_on, note: r.note || "", takenBy: r.trainer_name, mine: r.trainer_id === trainerId,
    photos: Object.fromEntries(angles.map(a => [a, signedUrl("/api/progress-photo", `${r.id}-${a}`)])),
    createdAt: r.created_at,
  };
}

/** Newest first. */
export async function setsOf(clientId, trainerId) {
  return (await all(`SELECT * FROM coach_progress_photos WHERE client_id = ? ORDER BY taken_on DESC, created_at DESC`, [clientId])).map(r => shape(r, trainerId));
}
export const setById = (id) => (isId("progressPhotos", id) ? get(`SELECT * FROM coach_progress_photos WHERE id = ?`, [id]) : null);

export async function consentOf(clientId, trainerId) {
  const r = await get(`SELECT * FROM coach_photo_consent WHERE client_id = ?`, [clientId]);
  return r ? { agreedAt: r.agreed_at, recordedBy: r.trainer_name, mine: r.trainer_id === trainerId } : null;
}
export async function agree(clientId, trainer) {
  if (await get(`SELECT 1 AS x FROM coach_photo_consent WHERE client_id = ?`, [clientId])) return;
  await run(`INSERT INTO coach_photo_consent (client_id, trainer_id, trainer_name, agreed_at) VALUES (?, ?, ?, ?)`,
    [clientId, trainer.id, String(trainer.name || "").slice(0, 120), now()]);
}

/* A picture as sent: a JPEG data URI, small enough, and a JPEG inside. */
function pictureOf(dataUri) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUri || ""));
  if (!m) return null;
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length < 100 || bytes.length > PHOTO_MAX_BYTES || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
  return bytes;
}

/** What the page sent, checked: `{ takenOn, note, pictures }` or `{ error }`. */
export function check(body = {}) {
  const takenOn = String(body.takenOn || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn) || Number.isNaN(Date.parse(`${takenOn}T00:00:00Z`))) return { error: "Choose the day the photos were taken." };
  if (takenOn > latestDay() || takenOn < "1990-01-01") return { error: "Choose a day that has been, not one still to come." };
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 1000) : "";
  const pictures = {};
  for (const a of ANGLE_KEYS) {
    if (body.photos?.[a] == null) continue;
    const bytes = pictureOf(body.photos[a]);
    if (!bytes) return { error: "One of the photos couldn't be read. Take it again." };
    pictures[a] = bytes;
  }
  if (!Object.keys(pictures).length) return { error: "Take at least one photo." };
  return { takenOn, note, pictures };
}

export async function add(clientId, trainer, { takenOn, note, pictures }) {
  await fs.mkdir(dir(), { recursive: true });
  const at = now();
  const angles = ANGLE_KEYS.filter(a => pictures[a]);
  return insertWithNewId("progressPhotos", async (id) => {
    try {
      for (const a of angles) await fs.writeFile(fileOf(id, a), pictures[a]);
    } catch (err) {
      for (const a of angles) await fs.rm(fileOf(id, a), { force: true });
      throw err;
    }
    await run(`INSERT INTO coach_progress_photos (id, client_id, trainer_id, trainer_name, taken_on, angles, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clientId, trainer.id, String(trainer.name || "").slice(0, 120), takenOn, angles.join(","), note, at, at]);
  });
}

async function removeRow(r) {
  for (const a of ANGLE_KEYS) await fs.rm(fileOf(r.id, a), { force: true });
  await run(`DELETE FROM coach_progress_photos WHERE id = ?`, [r.id]);
}
export async function remove(id, trainerId) {
  const r = await setById(id);
  if (!r) return "not_found";
  if (r.trainer_id !== trainerId) return "not_yours";
  await removeRow(r);
  return "done";
}
/** The client no longer agrees: every set goes, and the agreement. */
export async function withdraw(clientId) {
  for (const r of await all(`SELECT * FROM coach_progress_photos WHERE client_id = ?`, [clientId])) await removeRow(r);
  await run(`DELETE FROM coach_photo_consent WHERE client_id = ?`, [clientId]);
}
