import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { filePath } from "./durable-home.js";
import { sendEmail } from "./email.js";
import { emailShell, esc, para, cta, MAIL, SIGNER, signedBy } from "./email-template.js";

/**
 * Messages between a trainer and their client (Glenn, 18 Oct 2026: "Let's do
 * messages now, apart from basic messaging, we should be able to attach
 * pictures, videos, workout programs, and even measurements").
 *
 * Kept in Coach: "messages sent from Coach should be stored on Coach,
 * messages sent from Studio in the future is stored on Studio. But /me will
 * enable viewing them all in one inbox." So the trainer writes here, and the
 * client reads and answers on Studio's client page, which asks Coach through
 * the client link (`/api/client-link/…`, server to server, see index.js).
 *
 * Studio has no messaging to copy. What is copied from it: the video upload
 * in pieces, its 100 MB limit and its MP4 check (Studio's ads-media.js), the
 * picture shrunk in the browser before it is sent (as its photos are), the
 * email template, and its one email at a time for a run of changes.
 *
 * A picture or a video is a file in the files folder (`messages/<att id>`);
 * a program is sent as a copy of it as it stood, so what the client reads
 * doesn't change under them when the trainer edits it later.
 */

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;   // Studio's, for its ad videos
export const PICTURE_MAX_BYTES = 15 * 1024 * 1024;  // a picture is shrunk before it is sent
export const TEXT_MAX = 4000;
/* One email to a client per conversation in this long, however many messages. */
export const NOTICE_EVERY_MS = 15 * 60 * 1000;

const now = () => new Date().toISOString();
const dir = () => filePath("messages");
const incomingDir = () => filePath(path.join("messages", "incoming"));

/* An upload's name is ours, never the caller's: 32 hex characters, checked
   before it touches a path (Studio's ads-media.js). */
const UPLOAD = /^[0-9a-f]{32}$/;
const ATT = /^att\d{3}[a-z]{3}\d{3}$/;
const incomingPath = (upload) => {
  if (!UPLOAD.test(String(upload))) throw Object.assign(new Error("That upload has expired. Try again."), { status: 404, code: "no_such_upload" });
  return path.join(incomingDir(), `${upload}.part`);
};
export const attachmentPath = (id) => {
  if (!ATT.test(String(id))) throw new Error("Bad attachment id");
  return path.join(dir(), id);
};

/* ------------------------------------------------------------ uploads */

const failure = (status, code, error) => Object.assign(new Error(error), { status, code });

/** A new upload of `bytes`: an empty file to append to, and its name. */
export async function beginUpload({ kind, bytes }) {
  const max = kind === "video" ? VIDEO_MAX_BYTES : kind === "picture" ? PICTURE_MAX_BYTES : 0;
  if (!max) throw failure(400, "invalid", "Choose a picture or a video.");
  if (!(Number(bytes) > 0)) throw failure(400, "empty", "That file is empty.");
  if (Number(bytes) > max) throw failure(413, "too_large", kind === "video" ? "That video is too large. Keep it under 100 MB." : "That picture is too large.");
  await fs.mkdir(incomingDir(), { recursive: true });
  const upload = crypto.randomBytes(16).toString("hex");
  await fs.writeFile(incomingPath(upload), Buffer.alloc(0));
  sweepIncoming().catch(() => {});
  return { upload };
}

/** One piece on the end. Refused once the whole would pass the video limit. */
export async function appendUpload(upload, bytes) {
  const file = incomingPath(upload);
  const stat = await fs.stat(file).catch(() => null);
  if (!stat) throw failure(404, "no_such_upload", "That upload has expired. Try again.");
  if (stat.size + bytes.length > VIDEO_MAX_BYTES) {
    await fs.rm(file, { force: true });
    throw failure(413, "too_large", "That video is too large. Keep it under 100 MB.");
  }
  await fs.appendFile(file, bytes);
  return { bytes: stat.size + bytes.length };
}

/* What the file's first bytes say it is, or null: the pictures a phone or
   a browser makes, and an MP4 or QuickTime video (`ftyp` four bytes in, as
   Studio checks). Never what the uploader says it is. */
function sniff(head) {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { kind: "picture", mime: "image/jpeg" };
  if (head.toString("latin1", 0, 8) === "\x89PNG\r\n\x1a\n") return { kind: "picture", mime: "image/png" };
  if (head.toString("latin1", 0, 4) === "GIF8") return { kind: "picture", mime: "image/gif" };
  if (head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") return { kind: "picture", mime: "image/webp" };
  if (head.toString("latin1", 4, 8) === "ftyp") {
    const brand = head.toString("latin1", 8, 12);
    return { kind: "video", mime: brand === "qt  " ? "video/quicktime" : "video/mp4" };
  }
  return null;
}

/* A still is a small JPEG data URI the browser took from the video's first
   frame (Studio's ad videos do the same). */
const goodStill = (s) => typeof s === "string" && s.length <= 400_000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
const dimension = (n) => (Number.isInteger(n) && n > 0 && n < 20000 ? n : null);

/** The finished upload, checked and kept as an attachment waiting to be sent. */
export async function finishUpload(upload, owner, { kind, name, width, height, still }) {
  const file = incomingPath(upload);
  const handle = await fs.open(file, "r").catch(() => null);
  if (!handle) throw failure(404, "no_such_upload", "That upload has expired. Try again.");
  const head = Buffer.alloc(16);
  let size = 0;
  try {
    await handle.read(head, 0, 16, 0);
    size = (await handle.stat()).size;
  } finally { await handle.close(); }
  const what = size >= 64 ? sniff(head) : null;
  if (!what || what.kind !== kind) {
    await fs.rm(file, { force: true });
    throw failure(400, "unsupported", kind === "video" ? "That file is not a video Coach can send. Send an MP4 or a video from your phone's camera." : "That file is not a picture Coach can send.");
  }
  if (kind === "picture" && size > PICTURE_MAX_BYTES) {
    await fs.rm(file, { force: true });
    throw failure(413, "too_large", "That picture is too large.");
  }
  await fs.mkdir(dir(), { recursive: true });
  const id = await insertWithNewId("attachment", (newId) => run(
    `INSERT INTO coach_attachments (id, message_id, owner_id, kind, name, mime, bytes, width, height, still, data, created_at)
     VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [newId, owner, kind, String(name || "").slice(0, 200), what.mime, size, dimension(width), dimension(height), kind === "video" && goodStill(still) ? still : null, now()]));
  await fs.rename(file, attachmentPath(id));
  return shapeAttachment(await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]));
}

async function sweepIncoming() {
  const names = await fs.readdir(incomingDir()).catch(() => []);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const name of names) {
    const file = path.join(incomingDir(), name);
    const stat = await fs.stat(file).catch(() => null);
    if (stat && stat.mtimeMs < cutoff) await fs.rm(file, { force: true });
  }
}

/** A program kept as a copy, waiting to be sent: the shape programs.full gives. */
export async function programAttachment(owner, program, units) {
  const days = program.days.map(d => ({
    name: d.name, notes: d.notes || "",
    exercises: d.exercises.map(e => ({ name: e.name, superset: !!e.superset, sets: e.sets, reps: e.reps, load: e.load, ...(e.loadKg ? { loadKg: e.loadKg } : {}), effort: e.effort, tempo: e.tempo, restText: e.restText, note: e.note, primary: e.primary || [], secondary: e.secondary || [] })),
  }));
  const data = { programId: program.id, name: program.name, clientName: program.clientName, goalLabel: program.goalLabel, kindLabel: program.kindLabel, notes: program.notes || "", updatedAt: program.updatedAt, units, days };
  const id = await insertWithNewId("attachment", (newId) => run(
    `INSERT INTO coach_attachments (id, message_id, owner_id, client_id, kind, name, mime, bytes, width, height, still, data, created_at)
     VALUES (?, '', ?, ?, 'program', ?, 'application/json', 0, NULL, NULL, NULL, ?, ?)`,
    [newId, owner, program.clientId, String(program.name).slice(0, 200), JSON.stringify(data), now()]));
  return shapeAttachment(await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]));
}

/**
 * A set of measurements kept as a copy, waiting to be sent (measurements.js):
 * the day, each value in metric with the trainer's units to show it in, and
 * the set before it for how each has changed, so what the client reads stays
 * as it was sent.
 */
export async function measurementsAttachment(owner, { clientId, set, previous, clientName, units }) {
  const data = { measurementId: set.id, clientName, takenOn: set.takenOn, takenBy: set.takenBy, note: set.note, values: set.values,
    previous: previous ? { takenOn: previous.takenOn, values: previous.values } : null, units };
  const id = await insertWithNewId("attachment", (newId) => run(
    `INSERT INTO coach_attachments (id, message_id, owner_id, client_id, kind, name, mime, bytes, width, height, still, data, created_at)
     VALUES (?, '', ?, ?, 'measurements', ?, 'application/json', 0, NULL, NULL, NULL, ?, ?)`,
    [newId, owner, clientId, `Measurements, ${set.takenOn}`, JSON.stringify(data), now()]));
  return shapeAttachment(await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]));
}

/** A fitness test result kept as a copy, waiting to be sent, with the one before it of the same test. */
export async function testAttachment(owner, { clientId, test, previous, clientName, units }) {
  const data = { testId: test.id, clientName, units, kind: test.kind, takenOn: test.takenOn, takenBy: test.takenBy, age: test.age, sex: test.sex,
    data: test.data, result: test.result, rating: test.rating, ratingAges: test.ratingAges, note: test.note,
    previous: previous ? { takenOn: previous.takenOn, result: previous.result, rating: previous.rating } : null };
  const id = await insertWithNewId("attachment", (newId) => run(
    `INSERT INTO coach_attachments (id, message_id, owner_id, client_id, kind, name, mime, bytes, width, height, still, data, created_at)
     VALUES (?, '', ?, ?, 'test', ?, 'application/json', 0, NULL, NULL, NULL, ?, ?)`,
    [newId, owner, clientId, `Test, ${test.takenOn}`, JSON.stringify(data), now()]));
  return shapeAttachment(await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]));
}

/* A progress photo copied onto an attachment: `<att>.<set n>.<angle>.jpg`. */
const PHOTO_ANGLES = ["front", "left", "right", "back"];
export const attachmentPhotoPath = (id, n, angle) => {
  if (!ATT.test(String(id)) || !/^[01]$/.test(String(n)) || !PHOTO_ANGLES.includes(angle)) throw new Error("Bad attachment photo");
  return path.join(dir(), `${id}.${n}.${angle}.jpg`);
};

/**
 * Progress photos kept as a copy, waiting to be sent: one set, or two to
 * compare (the earlier first). The pictures are copied, so deleting the set
 * later doesn't take them from the message. `sets`: [{ row, files: { angle:
 * path } }].
 */
export async function photosAttachment(owner, { clientId, sets, clientName }) {
  const data = { clientName, sets: sets.map(({ row, files }) => ({ setId: row.id, takenOn: row.taken_on, takenBy: row.trainer_name, angles: Object.keys(files) })) };
  const id = await insertWithNewId("attachment", (newId) => run(
    `INSERT INTO coach_attachments (id, message_id, owner_id, client_id, kind, name, mime, bytes, width, height, still, data, created_at)
     VALUES (?, '', ?, ?, 'photos', ?, 'application/json', 0, NULL, NULL, NULL, ?, ?)`,
    [newId, owner, clientId, `Progress photos, ${sets.map(s => s.row.taken_on).join(" and ")}`, JSON.stringify(data), now()]));
  await fs.mkdir(dir(), { recursive: true });
  for (const [n, { files }] of sets.entries()) {
    for (const [angle, from] of Object.entries(files)) await fs.copyFile(from, attachmentPhotoPath(id, n, angle));
  }
  return shapeAttachment(await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]));
}

function shapeAttachment(r, { full = false } = {}) {
  const out = { id: r.id, kind: r.kind, name: r.name, mime: r.mime, bytes: Number(r.bytes) || 0,
    width: r.width == null ? null : Number(r.width), height: r.height == null ? null : Number(r.height) };
  if (r.kind === "video" && r.still) out.still = r.still;
  if (r.kind === "program") {
    const d = parse(r.data);
    out.program = full ? d : { name: d.name, goalLabel: d.goalLabel, kindLabel: d.kindLabel, days: d.days?.length || 0, programId: d.programId };
  }
  /* Small enough to come whole every time. */
  if (r.kind === "measurements") out.measurements = parse(r.data);
  if (r.kind === "test") out.test = parse(r.data);
  /* Each picture's address: the trainer's; the client's are signed (index.js). */
  if (r.kind === "photos") {
    const d = parse(r.data);
    out.photos = { ...d, sets: (d.sets || []).map((x, n) => ({ ...x, photos: Object.fromEntries((x.angles || []).map(a => [a, `/api/attachments/${r.id}/photo/${n}/${a}`])) })) };
  }
  return out;
}
const parse = (s) => { try { return JSON.parse(s || "{}"); } catch { return {}; } };

/** An attachment, if `who` may see it: one of their own still waiting, or one in their conversation. */
export async function attachmentFor(id, { trainerId = null, clientId = null } = {}) {
  if (!ATT.test(String(id))) return null;
  const r = await get(`SELECT * FROM coach_attachments WHERE id = ?`, [id]);
  if (!r) return null;
  if (!r.message_id) return trainerId && r.owner_id === trainerId ? r : null;
  const c = await get(`SELECT c.* FROM coach_conversations c JOIN coach_messages m ON m.conversation_id = c.id WHERE m.id = ?`, [r.message_id]);
  if (!c) return null;
  if (trainerId && c.trainer_id === trainerId) return r;
  if (clientId && c.client_id === clientId) return r;
  return null;
}
/** An attachment that has been sent, for a signed link (which says who may see it). */
export const sentAttachment = (id) => (ATT.test(String(id)) ? get(`SELECT * FROM coach_attachments WHERE id = ? AND message_id <> ''`, [id]) : null);
export const attachmentShape = (r) => shapeAttachment(r, { full: true });

/* ------------------------------------------------------------ conversations */

const conversationOf = (trainerId, clientId) =>
  get(`SELECT * FROM coach_conversations WHERE trainer_id = ? AND client_id = ?`, [trainerId, clientId]);

function shapeConversation(c, last, side) {
  const readAt = side === "trainer" ? c.trainer_read_at : c.client_read_at;
  return {
    id: c.id, trainerId: c.trainer_id, trainerName: c.trainer_name, clientId: c.client_id, clientName: c.client_name,
    lastAt: c.last_at,
    last: last ? { text: last.text, authorKind: last.author_kind, attachments: Number(last.attachments) || 0 } : null,
    unread: Number(c.unread) || 0,
    readAt: readAt || null,
  };
}

/* Each conversation's last message, and how many from the other side came
   after `side` last read it. */
async function withLast(rows, side) {
  const other = side === "trainer" ? "client" : "trainer";
  const out = [];
  for (const c of rows) {
    const last = await get(`SELECT m.text, m.author_kind, (SELECT COUNT(*) FROM coach_attachments a WHERE a.message_id = m.id) AS attachments
      FROM coach_messages m WHERE m.conversation_id = ? ORDER BY m.created_at DESC, m.id DESC LIMIT 1`, [c.id]);
    const readAt = side === "trainer" ? c.trainer_read_at : c.client_read_at;
    const unread = await get(`SELECT COUNT(*) AS n FROM coach_messages WHERE conversation_id = ? AND author_kind = ? AND created_at > ?`, [c.id, other, readAt || ""]);
    out.push(shapeConversation({ ...c, unread: unread.n }, last, side));
  }
  return out;
}

/** A trainer's conversations, the latest first, only with clients still on their list. */
export async function trainerConversations(trainerId, clientIds) {
  const rows = await all(`SELECT * FROM coach_conversations WHERE trainer_id = ? ORDER BY last_at DESC`, [trainerId]);
  return withLast(rows.filter(c => clientIds.has(c.client_id)), "trainer");
}

/** A client's conversations with their trainers in Coach, the latest first. */
export async function clientConversations(clientId) {
  return withLast(await all(`SELECT * FROM coach_conversations WHERE client_id = ? ORDER BY last_at DESC`, [clientId]), "client");
}

export const conversationById = (id) => get(`SELECT * FROM coach_conversations WHERE id = ?`, [id]);

/** The messages of a conversation, oldest first, each with its attachments. */
export async function messagesOf(conversationId) {
  const rows = await all(`SELECT * FROM coach_messages WHERE conversation_id = ? ORDER BY created_at, id`, [conversationId]);
  const atts = rows.length ? await all(`SELECT * FROM coach_attachments WHERE message_id IN (${rows.map(() => "?").join(", ")}) ORDER BY created_at, id`, rows.map(r => r.id)) : [];
  return rows.map(m => ({
    id: m.id, authorKind: m.author_kind, authorName: m.author_name, text: m.text, at: m.created_at,
    attachments: atts.filter(a => a.message_id === m.id).map(a => shapeAttachment(a)),
  }));
}

/** The trainer's side of one conversation, read now. Null where there is none yet. */
export async function trainerThread(trainerId, clientId) {
  const c = await conversationOf(trainerId, clientId);
  if (!c) return null;
  const messages = await messagesOf(c.id);
  await run(`UPDATE coach_conversations SET trainer_read_at = ? WHERE id = ?`, [now(), c.id]);
  return { id: c.id, clientReadAt: c.client_read_at, messages };
}

/** The client's side of one conversation, read now. */
export async function clientThread(conversation) {
  const messages = await messagesOf(conversation.id);
  await run(`UPDATE coach_conversations SET client_read_at = ? WHERE id = ?`, [now(), conversation.id]);
  return { id: conversation.id, trainerId: conversation.trainer_id, trainerName: conversation.trainer_name, trainerReadAt: conversation.trainer_read_at, messages };
}

/** What makes a message worth sending, or the reason it isn't. */
export function checkMessage({ text, attachments = [] }) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t && !attachments.length) return "Write a message or attach something.";
  if (t.length > TEXT_MAX) return `Keep a message under ${TEXT_MAX.toLocaleString("en-US")} characters.`;
  if (attachments.length > 10) return "Attach up to 10 things to one message.";
  return null;
}

/**
 * A trainer's message to a client, starting their conversation if this is
 * the first. `attachmentIds` must be this trainer's, still waiting. Returns
 * the conversation and whether the client should be emailed about it.
 */
/* The kinds of attachment that are one client's own. */
const OF_A_CLIENT = new Set(["program", "measurements", "test", "photos"]);

export async function sendFromTrainer(trainer, client, { text, attachmentIds = [] }) {
  const ids = [...new Set(attachmentIds.map(String))];
  for (const id of ids) {
    const a = await get(`SELECT owner_id, message_id, kind, client_id FROM coach_attachments WHERE id = ?`, [id]);
    if (!a || a.owner_id !== trainer.id || a.message_id) throw failure(400, "invalid", "That attachment is no longer there. Attach it again.");
    /* A client's program, measurements, test or photos go only to that
       client (Run 1, A-1): the composer offers only theirs, and this makes
       sure. One kept before attachments knew their client is attached again. */
    if (OF_A_CLIENT.has(a.kind) && a.client_id !== client.id) throw failure(400, "other_client", "That attachment is another client's. Attach it again from this conversation.");
  }
  const at = now();
  const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim();
  let c = await conversationOf(trainer.id, client.id);
  if (!c) {
    await insertWithNewId("conversation", (id) => run(
      `INSERT INTO coach_conversations (id, trainer_id, trainer_name, client_id, client_name, created_at, last_at, trainer_read_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, trainer.id, trainer.name || "", client.id, clientName, at, at, at]));
    c = await conversationOf(trainer.id, client.id);
  }
  const messageId = await insertWithNewId("message", (id) => run(
    `INSERT INTO coach_messages (id, conversation_id, author_kind, author_id, author_name, text, created_at) VALUES (?, ?, 'trainer', ?, ?, ?, ?)`,
    [id, c.id, trainer.id, trainer.name || "", String(text || "").trim(), at]));
  for (const id of ids) await run(`UPDATE coach_attachments SET message_id = ? WHERE id = ?`, [messageId, id]);
  /* Names kept fresh, for the client's inbox and the trainer's list. */
  await run(`UPDATE coach_conversations SET last_at = ?, trainer_read_at = ?, trainer_name = ?, client_name = ? WHERE id = ?`,
    [at, at, trainer.name || c.trainer_name, clientName || c.client_name, c.id]);
  const due = !c.notified_at || Date.now() - Date.parse(c.notified_at) >= NOTICE_EVERY_MS;
  return { conversationId: c.id, messageId, notify: due };
}

/** A client's answer, from Studio's client page. Words only, for now. */
export async function sendFromClient(conversation, { clientName, text }) {
  const at = now();
  const messageId = await insertWithNewId("message", (id) => run(
    `INSERT INTO coach_messages (id, conversation_id, author_kind, author_id, author_name, text, created_at) VALUES (?, ?, 'client', ?, ?, ?, ?)`,
    [id, conversation.id, conversation.client_id, String(clientName || conversation.client_name).slice(0, 120), String(text || "").trim(), at]));
  await run(`UPDATE coach_conversations SET last_at = ?, client_read_at = ? WHERE id = ?`, [at, at, conversation.id]);
  return { messageId };
}

/** How many messages from clients this trainer hasn't read, for the badge. */
export async function unreadFor(trainerId, clientIds) {
  const list = await trainerConversations(trainerId, clientIds);
  return list.reduce((n, c) => n + c.unread, 0);
}

/* ------------------------------------------------------------ the email */

/**
 * The email that tells a client there is a message (Glenn: "Email notice, no
 * content"): who it is from and a button to their inbox on Studio's client
 * page, never the message itself.
 */
export function noticeEmail({ clientFirst, trainerName, inboxUrl, origin }) {
  const first = String(clientFirst || "").trim() || "there";
  const from = String(trainerName || "").trim() || "Your trainer";
  const title = `${from} sent you a message`;
  const lead = `${from} sent you a message on Trainability. Open your messages to read it and to answer.`;
  const text = signedBy(SIGNER, [`Hi ${first},`, "", lead, "", inboxUrl].join("\n"));
  const html = emailShell({
    name: "Trainability Coach", title, origin,
    body: para(`Hi ${esc(first)},`) + para(esc(lead)) + cta(inboxUrl, "Open your messages")
      + para("For your privacy, the message isn't in this email.", { size: 13, color: MAIL.inkSoft, bottom: 0 }),
    footer: [`Sent because ${esc(from)} sent you a message. You get one email however many messages they send in a few minutes.`],
  });
  return { subject: title, text, html };
}

/** The email, sent if one is due, and the time noted so the next waits. */
export async function notifyClient(conversationId, { email, clientFirst, trainerName, inboxUrl, origin }) {
  await run(`UPDATE coach_conversations SET notified_at = ? WHERE id = ?`, [now(), conversationId]);
  const result = await sendEmail({ to: email, ...noticeEmail({ clientFirst, trainerName, inboxUrl, origin }) });
  if (!result.sent) console.log(`Message notice to ${email || "a client with no email"} not sent: ${result.reason}`);
  return result;
}

/* ------------------------------------------------------------ the client link */

/**
 * A link to an attachment's file that Studio's client page can put in an
 * <img> or <video>: signed with the client link's secret, and good for an
 * hour, so it can be handed to a browser without a Coach session.
 */
export function signedFileUrl(origin, id, secret, ttlMs = 60 * 60 * 1000) {
  const exp = Date.now() + ttlMs;
  const sig = crypto.createHmac("sha256", secret).update(`${id}.${exp}`).digest("base64url");
  return `${String(origin || "").replace(/\/$/, "")}/api/files/${id}?exp=${exp}&sig=${sig}`;
}
export function checkSignature(id, exp, sig, secret) {
  if (!secret || !(Number(exp) > Date.now())) return false;
  const want = crypto.createHmac("sha256", secret).update(`${id}.${Number(exp)}`).digest("base64url");
  const a = Buffer.from(String(sig || "")), b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
