import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";

/**
 * A Coach account's clients (Glenn, 18 Oct 2026, stage two of Coach
 * accounts): kept in Coach's database, because a trainer outside Trainability
 * isn't part of the business and Studio's client lists, billing and messages
 * assume a client is Trainability's. Trainability's own trainers keep theirs
 * in Studio (server/index.js, myClients). Both come out in the same shape, so
 * the Clients page, programs, limitations and Billy work alike.
 *
 * The rules are Studio's: first and last name, email and phone must be
 * there; a complete email; a phone it could text. One trainer's clients are
 * theirs alone.
 */

const now = () => new Date().toISOString();
const digits = (s) => String(s || "").replace(/\D/g, "");

/* As the Clients page and Billy are given them (myClients' shape). */
const shape = (r) => ({
  id: r.id, firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone,
  pronouns: r.pronouns || "", gender: r.gender || "", dateOfBirth: r.date_of_birth || "",
  since: String(r.created_at || "").slice(0, 10), lastSessionOn: null, latestSessionOn: null,
  archived: Number(r.archived) === 1, studioPlaceId: null, sharedWith: 0,
});

export async function clientsOf(trainerId) {
  return (await all(`SELECT * FROM coach_clients WHERE trainer_id = ? ORDER BY first_name, last_name, id`, [trainerId])).map(shape);
}

const REQUIRED = [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"]];
const andList = (l) => (l.length < 2 ? l[0] : `${l.slice(0, -1).join(", ")} and ${l.at(-1)}`);
const PHONE = "That phone number cannot receive texts. Use a 10-digit number like 415-555-0144, or + and the country code for one abroad.";

/* Studio's phone rule (its lib/people.js phoneProblem): +1 and ten digits,
   + and 8 to 15 elsewhere, or ten digits (or eleven starting 1). */
function phoneProblem(p) {
  const raw = String(p || "").normalize("NFKC").trim();
  if (!raw) return null;
  if (/[a-z]/i.test(raw)) return PHONE;
  const d = digits(raw);
  if (raw.startsWith("+")) return (d[0] === "1" ? d.length === 11 : d.length >= 8 && d.length <= 15) ? null : PHONE;
  return d.length === 10 || (d.length === 11 && d[0] === "1") ? null : PHONE;
}

/** What is wrong with a client's details, in Studio's words, or null. `partial` checks only what is given (an edit). */
export function checkClient(f, { partial = false } = {}) {
  const missing = REQUIRED.filter(([k]) => (!partial || f[k] !== undefined) && !String(f[k] ?? "").trim()).map(([, l]) => l);
  if (missing.length) return { error: `${andList(missing)} ${missing.length === 1 ? "is" : "are"} required`, code: "missing_fields" };
  if (f.email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(f.email).trim())) return { error: "That email address is not complete", code: "invalid" };
  if (f.phone !== undefined && phoneProblem(f.phone)) return { error: PHONE, code: "invalid" };
  if (f.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(f.dateOfBirth)) return { error: "That birthday isn't a date", code: "invalid" };
  return null;
}

/**
 * A new client on this trainer's list, or what is already there: the same
 * email is that client ("already", or "back" if archived); the same phone
 * alone is refused, as for Studio's (server/index.js). Returns { done, clientId }
 * or { error, code }.
 */
export async function addClient(trainerId, f) {
  const wrong = checkClient(f);
  if (wrong) return wrong;
  const mine = await all(`SELECT * FROM coach_clients WHERE trainer_id = ?`, [trainerId]);
  const sameEmail = mine.find(c => c.email.toLowerCase() === f.email.trim().toLowerCase());
  if (sameEmail) {
    if (Number(sameEmail.archived)) {
      await run(`UPDATE coach_clients SET archived = 0, updated_at = ? WHERE id = ?`, [now(), sameEmail.id]);
      return { done: "back", clientId: sameEmail.id };
    }
    return { done: "already", clientId: sameEmail.id };
  }
  const samePhone = mine.find(c => digits(c.phone) && digits(c.phone).slice(-10) === digits(f.phone).slice(-10));
  if (samePhone) {
    const name = `${samePhone.first_name} ${samePhone.last_name}`.trim();
    return { error: `${name} already has that phone number. If this is them, use the email they gave us; if it's someone else, use a different phone number.`, code: "phone_taken" };
  }
  const stamp = now();
  const id = await insertWithNewId("client", (newId) => run(
    `INSERT INTO coach_clients (id, trainer_id, first_name, last_name, email, phone, date_of_birth, gender, pronouns, archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [newId, trainerId, f.firstName.trim(), f.lastName.trim(), f.email.trim(), f.phone.trim(), f.dateOfBirth || "", f.gender || "", f.pronouns || "", stamp, stamp]));
  return { done: "added", clientId: id };
}

/** A client's details changed: only what is given, never emptied. Returns null or { error, code }. */
export async function editClient(trainerId, id, f) {
  const wrong = checkClient(f, { partial: true });
  if (wrong) return wrong;
  const cols = { firstName: "first_name", lastName: "last_name", email: "email", phone: "phone", dateOfBirth: "date_of_birth", gender: "gender", pronouns: "pronouns" };
  const keys = Object.keys(cols).filter(k => f[k] !== undefined);
  if (f.email !== undefined) {
    const other = await get(`SELECT id FROM coach_clients WHERE trainer_id = ? AND id != ? AND LOWER(email) = ?`, [trainerId, id, f.email.trim().toLowerCase()]);
    if (other) return { error: "Another of your clients already has that email.", code: "duplicate_client" };
  }
  if (keys.length) {
    await run(`UPDATE coach_clients SET ${keys.map(k => `${cols[k]} = ?`).join(", ")}, updated_at = ? WHERE id = ? AND trainer_id = ?`,
      [...keys.map(k => (f[k] == null ? "" : String(f[k]).trim())), now(), id, trainerId]);
  }
  return null;
}

export const archiveClient = (trainerId, id, archived) =>
  run(`UPDATE coach_clients SET archived = ?, updated_at = ? WHERE id = ? AND trainer_id = ?`, [archived ? 1 : 0, now(), id, trainerId]);

/** Whether this client is one kept here for this trainer. */
export const isKept = async (trainerId, id) => !!await get(`SELECT 1 AS x FROM coach_clients WHERE id = ? AND trainer_id = ?`, [id, trainerId]);

/** The client rows kept here for a trainer, as stored, for moving them into Studio. */
export const rowsOf = (trainerId) => all(`SELECT * FROM coach_clients WHERE trainer_id = ? ORDER BY created_at, id`, [trainerId]);

/** A client moved into Studio: what pointed at them here now points at Studio's id, and their row goes. */
export async function moved(trainerId, id, studioId, name) {
  await run(`UPDATE coach_programs SET client_id = ?, client_name = ? WHERE client_id = ? AND trainer_id = ?`, [studioId, name, id, trainerId]);
  await run(`UPDATE coach_limitations SET client_id = ? WHERE client_id = ?`, [studioId, id]);
  await run(`UPDATE coach_measurements SET client_id = ? WHERE client_id = ?`, [studioId, id]);
  await run(`DELETE FROM coach_clients WHERE id = ? AND trainer_id = ?`, [id, trainerId]);
}
