import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import { PDFDocument } from "pdf-lib";
import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { anthropic, configured } from "./billy.js";
import { filePath } from "./durable-home.js";
import * as store from "./iq-store.js";
import { conditionKey } from "./iq-edit.js";

/**
 * Reading a book into Coach IQ, in the app (asked 16 Oct 2026: "can we can
 * that in-app? Have a functionality for the primary master?"; built 17 Oct
 * 2026: "Do all 3"). The Primary Master uploads a PDF on Review Coach IQ →
 * Books, and Coach reads it the way the first book was read in a Claude
 * session:
 *
 *   1. The PDF is cut into parts of PART_PAGES pages (a book is longer than
 *      one request takes), and each part is read for notes, in our own
 *      words: nothing of the book's text, tables or named systems is kept.
 *   2. From all the notes and the principles as they stand, the topics the
 *      book has something for are chosen, existing or new.
 *   3. Each topic is written again with what the book adds. Where the book
 *      is dated, one coach's view, or disagrees with what is there, nothing
 *      is decided: an open point is raised, with options and a recommended
 *      answer, as Glenn asked for the first book ("Ask me one by one and
 *      recommend answers").
 *
 * That is the background work, one book at a time, each step saved as it is
 * done, so a restart carries on where it stopped. The PDF waits in the files
 * folder (durable-home.js, books/) while it is read and is thrown away once
 * it has been.
 *
 * Then the Primary Master goes through the proposals: answers the open
 * points one by one, has the topic written up with the answers in their
 * words (in the background too), reads it, edits it if they like, and
 * accepts or rejects it. Nothing reaches the principles, or Billy, until it
 * is accepted; an accepted topic is saved as reviewed through iq-store.js,
 * checked and kept in the library's history like any other change, with the
 * book named among its sources.
 *
 * The model: BOOK_MODEL, else Opus 5.5 (Glenn, 17 Oct 2026: "Opus 5.5": a
 * book is read once, and what it becomes is Coach IQ). The key is Billy's.
 */

export const model = () => process.env.BOOK_MODEL || "claude-opus-5-5";
export const MAX_BYTES = 100 * 1024 * 1024;
const PART_PAGES = 40;
/* Well under Claude's 32 MB for one request once it is base64. */
const PART_BYTES = 18 * 1024 * 1024;

const now = () => new Date().toISOString();
const pdfPath = (id) => filePath(path.join("books", `${id}.pdf`));
const parse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

/* ------------------------------------------------------------ the record */

function shape(r, { full = false } = {}) {
  const about = parse(r.about, {});
  const proposals = parse(r.proposals, []);
  const book = {
    id: r.id, fileName: r.file_name, bytes: Number(r.bytes), pages: Number(r.pages),
    parts: Number(r.parts), partsDone: Number(r.parts_done),
    status: r.status, step: r.step, error: r.error,
    title: about.title || "", author: about.author || "", year: about.year || "", edition: about.edition || "",
    model: r.model, tokensIn: Number(r.tokens_in), tokensOut: Number(r.tokens_out),
    by: r.uploaded_by_name, at: r.created_at, finishedAt: r.finished_at,
    counts: {
      proposals: proposals.length,
      decided: proposals.filter(p => p.state === "accepted" || p.state === "rejected").length,
      accepted: proposals.filter(p => p.state === "accepted").length,
    },
    busy: proposals.some(p => p.state === "writing"),
  };
  if (full) {
    book.summary = about.summary || "";
    book.proposals = proposals.map((p, n) => ({ n, ...p }));
  }
  return book;
}

const row = (id) => get(`SELECT * FROM coach_iq_books WHERE id = ?`, [id]);

async function update(id, fields) {
  const keys = Object.keys(fields);
  await run(`UPDATE coach_iq_books SET ${keys.map(k => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    [...keys.map(k => (typeof fields[k] === "object" && fields[k] !== null ? JSON.stringify(fields[k]) : fields[k])), now(), id]);
}

export async function list() {
  return (await all(`SELECT * FROM coach_iq_books ORDER BY created_at DESC`)).map(r => shape(r));
}

export async function book(id) {
  const r = await row(id);
  return r ? shape(r, { full: true }) : null;
}

/** The label a book is named by among a principle's sources. */
export function sourceLabel(about) {
  const who = [about.author, about.year].filter(Boolean).join(", ");
  return `${about.title || "A book"}${who ? ` (${who})` : ""}`.slice(0, 160);
}

/* ------------------------------------------------------------ uploading */

/**
 * A PDF from the page, streamed to the files folder as it arrives (never
 * held whole in memory), then opened to count its pages. Returns the new
 * book's id, or { error } in words.
 */
export async function upload(req, user, fileName) {
  if (!configured()) return { error: "Reading a book needs Billy's key on this server (ANTHROPIC_API_KEY). Ask whoever runs the app." };
  const name = String(fileName || "book.pdf").replace(/[\r\n"]/g, "").slice(0, 200) || "book.pdf";
  const tmp = filePath(path.join("books", `upload-${process.pid}-${Date.now()}.pdf`));
  await mkdir(path.dirname(tmp), { recursive: true });
  let bytes = 0;
  const limit = new Transform({
    transform(chunk, _enc, done) {
      bytes += chunk.length;
      done(bytes > MAX_BYTES ? Object.assign(new Error("too big"), { code: "too_big" }) : null, chunk);
    },
  });
  try {
    await pipeline(req, limit, createWriteStream(tmp));
  } catch (err) {
    await rm(tmp, { force: true });
    if (err.code === "too_big") return { error: "That PDF is over 100 MB. Split it into two and upload the parts as two books." };
    throw err;
  }
  let pages = 0;
  try {
    pages = (await PDFDocument.load(await readFile(tmp), { ignoreEncryption: true, updateMetadata: false })).getPageCount();
  } catch {
    await rm(tmp, { force: true });
    return { error: "That file couldn't be opened as a PDF. Check it opens on your computer, then try again." };
  }
  if (!pages) { await rm(tmp, { force: true }); return { error: "That PDF has no pages." }; }
  const stamp = now();
  const id = await insertWithNewId("book", (newId) => run(
    `INSERT INTO coach_iq_books (id, file_name, bytes, pages, parts, status, step, about, notes, proposals, model, uploaded_by, uploaded_by_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'waiting', 'Waiting to be read', '{}', '[]', '[]', ?, ?, ?, ?, ?)`,
    [newId, name, bytes, pages, Math.ceil(pages / PART_PAGES), model(), user.id, user.name || "", stamp, stamp]));
  await rename(tmp, pdfPath(id));
  queue.push({ id, job: "read" });
  kick();
  return { id };
}

/* -------------------------------------------------------- asking Claude */

const RULES = [
  "Coach IQ is Trainability's own guide to designing exercise programs: the principles a personal trainer, and Billy (the app's assistant), work from. It is written in Trainability's own words, from books its owner has read. A book is learned from, never copied: its owner's decision is to learn from books and write Trainability's own.",
  "So: never copy the book's sentences, tables, lists or headings, and never name its own branded systems or formulas. Facts, numbers and ranges are facts, and may be kept, in plain words.",
  "Write for a personal trainer: short sentences, plain words, British spelling as the existing text has it. Coach IQ covers adults and teenagers, never children's training.",
  "Coach IQ is guidance, never a diagnosis: on health, it says when somebody needs a doctor's go-ahead or should be referred on.",
  "Write every weight and distance as a number and a short unit, in imperial (lb, in, ft, yd, mi), whatever unit the book uses, rounded to what a gym has: loads to 5 lb (1 lb under 10 lb), distances to tidy numbers. Each trainer sees them in their own units: the app converts them. Never give both units. A percentage stays a percentage.",
].join("\n");

/* One request, streamed (they are long), its answer read as JSON in the
   shape asked for. Adds what it used to the book's count. */
async function ask(id, { system, content, schema, maxTokens = 16000, effort = "high" }) {
  const stream = anthropic().messages.stream({
    model: model(),
    max_tokens: maxTokens,
    output_config: { effort, format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content }],
  });
  const reply = await stream.finalMessage();
  await run(`UPDATE coach_iq_books SET tokens_in = tokens_in + ?, tokens_out = tokens_out + ? WHERE id = ?`,
    [reply.usage?.input_tokens || 0, reply.usage?.output_tokens || 0, id]);
  if (reply.stop_reason === "refusal") throw new Error("The model declined to read this part.");
  if (reply.stop_reason === "max_tokens") throw new Error("An answer ran longer than allowed. Try again; if it happens again, split the book.");
  const text = reply.content.filter(c => c.type === "text").map(c => c.text).join("");
  const out = parse(text, null);
  if (!out) throw new Error("The answer couldn't be read.");
  return out;
}

const NOTES_SCHEMA = {
  type: "object",
  properties: {
    book: {
      type: "object",
      description: "What the book is, if this part shows it (its title page or copyright page); empty strings if not.",
      properties: { title: { type: "string" }, author: { type: "string" }, edition: { type: "string" }, year: { type: "string" } },
      required: ["title", "author", "edition", "year"],
      additionalProperties: false,
    },
    notes: { type: "string", description: "The notes, in Markdown, under topic headings. Empty if this part has nothing for Coach IQ." },
  },
  required: ["book", "notes"],
  additionalProperties: false,
};

async function readPart(id, bytes, n, of) {
  return ask(id, {
    system: `${RULES}\n\nYou are reading one part of a book for Coach IQ and making notes for whoever writes it.`,
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") } },
      { type: "text", text: [
        `This is part ${n} of ${of} of the book.`,
        "Make notes, in your own words, of everything in it a personal trainer could use to design or adapt a program: how to choose reps, sets, load, tempo, rest, frequency and exercises; how to plan over weeks and months; assessment; warming up; beginners; women, teenagers, older adults and other groups; injuries, illness and other limitations; anything else on program design.",
        "Keep the numbers and ranges. Say where the book gives a reason, and what it is.",
        "Mark plainly, with the words DATED, ONE VIEW or DISAGREES, where a point is out of date by current evidence as you know it, is one coach's view rather than accepted practice, or contradicts what is commonly taught. Say why in a few words.",
        "Leave out the front matter, advertising, exam questions, forms and biographies, except the title and copyright page, which say what the book is.",
      ].join("\n") },
    ],
    schema: NOTES_SCHEMA,
  });
}

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    about: {
      type: "object",
      properties: {
        title: { type: "string" }, author: { type: "string" }, edition: { type: "string" }, year: { type: "string" },
        summary: { type: "string", description: "Two or three sentences, for the Primary Master: what the book is and what it adds to Coach IQ." },
      },
      required: ["title", "author", "edition", "year", "summary"],
      additionalProperties: false,
    },
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", description: "An existing topic's key, or for a new topic, lowercase words joined by hyphens." },
          title: { type: "string" },
          covers: { type: "string", description: "What the topic covers, in a line." },
          isNew: { type: "boolean" },
          why: { type: "string", description: "In a sentence, what the book adds to it." },
        },
        required: ["key", "title", "covers", "isNew", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["about", "topics"],
  additionalProperties: false,
};

const principlesText = (list) => list.map(p => `### ${p.key}: ${p.title}\n_${p.covers}_\n\n${p.body}`).join("\n\n");

async function plan(id, notes, found) {
  const principles = store.current().principles;
  return ask(id, {
    system: `${RULES}\n\nYou are deciding which topics of Coach IQ's principles a book has something to add to.`,
    content: [{ type: "text", text: [
      `What the book's pages said it is: ${JSON.stringify(found)}`,
      "", "## Coach IQ's principles as they stand", "", principlesText(principles),
      "", "## Notes on the book, part by part", "", notes.map((t, i) => `### Part ${i + 1}\n\n${t || "(nothing for Coach IQ)"}`).join("\n\n"),
      "", "Choose the topics this book adds something to, changes, or disagrees with: existing ones by their key, and a new topic only for a subject none of them covers. Leave out a topic it adds nothing to. Fill in what the book is from the notes.",
    ].join("\n") }],
    schema: PLAN_SCHEMA,
  });
}

const PROPOSAL_SCHEMA = {
  type: "object",
  properties: {
    body: { type: "string", description: "The topic's whole text, in Markdown, without its title or status line." },
    changes: { type: "array", items: { type: "string" }, description: "What changed, a short line each: what is new, what changed and why." },
    openPoints: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          why: { type: "string", description: "What the book says, what the text says or current evidence says, in two or three sentences." },
          options: { type: "array", items: { type: "string" }, description: "Two to four answers, each a short phrase." },
          recommended: { type: "integer", description: "The index of the option you recommend." },
          reason: { type: "string", description: "Why you recommend it, in a sentence." },
        },
        required: ["question", "why", "options", "recommended", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["body", "changes", "openPoints"],
  additionalProperties: false,
};

const GLENN_RULE = "Lines that record a decision, written (Name, date: \"their words\"), were settled by the Primary Master: keep them and what they decided, whatever the book says. If the book disagrees with one, raise it as an open point rather than changing it.";

async function propose(id, topic, notes, about) {
  const existing = store.current().principles.find(p => p.key === topic.key);
  const others = store.current().principles.filter(p => p.key !== topic.key).map(p => `- ${p.key}.md: ${p.title}: ${p.covers}`).join("\n");
  return ask(id, {
    system: `${RULES}\n\nYou are writing one topic of Coach IQ's principles again, with what a new book adds.\n\n${GLENN_RULE}`,
    content: [{ type: "text", text: [
      `The book: ${sourceLabel(about)}.`,
      `The topic: ${topic.title} (${topic.key}): ${topic.covers}. What the book adds: ${topic.why}`,
      "", existing ? `## The topic as it stands\n\n${existing.body}` : "## The topic as it stands\n\nIt is new: there is no text yet.",
      "", "## The other topics, to link to as [words](key.md) rather than repeat", "", others,
      "", "## Notes on the book", "", notes.map((t, i) => `### Part ${i + 1}\n\n${t || "(nothing)"}`).join("\n\n"),
      "", [
        "Write the whole topic again, keeping its headings and order where they work, and adding what the book has for it.",
        "Keep everything already there unless the book gives a good reason to change it.",
        "Where the book is dated, one coach's view, or disagrees with the text or with current evidence, don't decide: write the range or both views, and raise an open point, with two to four options and the one you recommend. Mark its place in the text with **Open for Glenn (n)**, n counting from 1 in the order of openPoints.",
        "Raise only points that matter for how a program is designed; settle small things yourself, conservatively.",
      ].join(" "),
    ].join("\n") }],
    schema: PROPOSAL_SCHEMA,
    maxTokens: 32000,
  });
}

const WRITTEN_SCHEMA = {
  type: "object",
  properties: { body: { type: "string", description: "The topic's whole text, in Markdown, without its title or status line." } },
  required: ["body"],
  additionalProperties: false,
};

async function writeUp(id, proposal, who, day) {
  const answers = proposal.openPoints.map((q, i) => {
    const a = proposal.answers?.[i] || {};
    const said = a.words?.trim() || q.options[a.choice] || q.options[q.recommended];
    return `${i + 1}. ${q.question}\n   Answer: "${said}"`;
  }).join("\n");
  return ask(id, {
    system: `${RULES}\n\nYou are writing the Primary Master's answers into a topic of Coach IQ's principles.\n\n${GLENN_RULE}`,
    content: [{ type: "text", text: [
      `## The topic: ${proposal.title}`, "", proposal.body,
      "", `## ${who}'s answers to its open points, ${day}`, "", answers,
      "", `Replace each **Open for Glenn (n)** with the text as settled by the answer, in our own words, followed by (${who}, ${day}: "the answer as they gave it"), as the existing decisions are written. Take out whatever the answer rules out. Change nothing else.`,
    ].join("\n") }],
    schema: WRITTEN_SCHEMA,
    maxTokens: 32000,
    effort: "medium",
  });
}

/* ----------------------------------------------------------- the reading */

/* The book's pages first+…+last as a PDF of their own. */
async function partBytes(doc, from, to) {
  const part = await PDFDocument.create();
  const pages = await part.copyPages(doc, Array.from({ length: to - from }, (_, i) => from + i));
  for (const p of pages) part.addPage(p);
  return part.save();
}

/* The parts to read, each small enough for one request: a part too big in
   bytes (a book of scanned pages) is halved until it fits. */
async function cut(doc) {
  const ranges = [];
  const total = doc.getPageCount();
  for (let from = 0; from < total; from += PART_PAGES) ranges.push([from, Math.min(from + PART_PAGES, total)]);
  const out = [];
  while (ranges.length) {
    const [from, to] = ranges.shift();
    const bytes = await partBytes(doc, from, to);
    if (bytes.length > PART_BYTES && to - from > 1) {
      const mid = from + Math.ceil((to - from) / 2);
      ranges.unshift([from, mid], [mid, to]);
    } else out.push({ from, to, bytes });
  }
  return out;
}

async function read(id) {
  let r = await row(id);
  if (!r || !["waiting", "reading"].includes(r.status)) return;
  await update(id, { status: "reading", step: "Opening the PDF", error: "", model: model() });
  const file = pdfPath(id);
  const notes = parse(r.notes, []);
  let proposals = parse(r.proposals, []);
  let about = parse(r.about, {});
  if (!about.topics) {
    let bytes;
    try { bytes = await readFile(file); } catch { throw new Error("The PDF is no longer in the files folder. Upload it again."); }
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const parts = await cut(doc);
    await update(id, { parts: parts.length });
    const found = about.found || { title: "", author: "", edition: "", year: "" };
    for (let n = notes.length; n < parts.length; n++) {
      const { from, to } = parts[n];
      await update(id, { step: `Reading part ${n + 1} of ${parts.length} (pages ${from + 1}–${to})`, parts_done: n });
      const out = await readPart(id, parts[n].bytes, n + 1, parts.length);
      for (const k of Object.keys(found)) if (!found[k] && out.book?.[k]) found[k] = out.book[k];
      notes.push(out.notes || "");
      await update(id, { notes, parts_done: n + 1, about: { ...about, found } });
    }
    await update(id, { step: "Choosing the topics it adds to" });
    const planned = await plan(id, notes, found);
    const known = new Set(store.current().principles.map(p => p.key));
    const topics = planned.topics
      .map(t => ({ ...t, key: known.has(t.key) ? t.key : conditionKey(t.key || t.title), isNew: !known.has(t.key) }))
      .filter((t, i, a) => t.key && a.findIndex(x => x.key === t.key) === i);
    about = { ...planned.about, found, topics };
    await update(id, { about });
  }
  for (let n = proposals.length; n < about.topics.length; n++) {
    const topic = about.topics[n];
    await update(id, { step: `Writing ${topic.title} (${n + 1} of ${about.topics.length})` });
    const out = await propose(id, topic, notes, about);
    const base = store.current().principles.find(p => p.key === topic.key);
    proposals.push({
      key: topic.key, title: base?.title || topic.title, covers: base?.covers || topic.covers, isNew: !base, why: topic.why,
      base: base?.body ?? null, body: out.body.trim(), changes: out.changes,
      openPoints: out.openPoints.map(q => ({ ...q, options: q.options.slice(0, 4), recommended: Math.min(Math.max(0, q.recommended | 0), Math.max(0, q.options.length - 1)) })),
      answers: [], state: out.openPoints.length ? "open" : "written", written: out.openPoints.length ? null : out.body.trim(),
    });
    await update(id, { proposals });
  }
  await update(id, {
    status: proposals.length ? "ready" : "done", finished_at: now(), parts_done: Number((await row(id)).parts),
    step: proposals.length ? "Read: ready for you" : "Read: nothing in it for Coach IQ",
  });
  /* Read: the PDF goes. What is kept is ours. */
  await rm(file, { force: true });
}

async function writeProposal(id, n, who, day) {
  const r = await row(id);
  const proposals = parse(r.proposals, []);
  const p = proposals[n];
  if (!p || p.state !== "writing") return;
  try {
    const out = await writeUp(id, p, who, day);
    p.written = out.body.trim();
    p.state = "written";
    p.error = "";
  } catch (err) {
    p.state = "open";
    p.error = err.message || "That couldn't be written up.";
  }
  /* Read again: an answer saved meanwhile is kept. */
  const latest = parse((await row(id)).proposals, []);
  latest[n] = { ...latest[n], written: p.written, state: p.state, error: p.error };
  await update(id, { proposals: latest });
}

/* One thing at a time, in order: a book to read, or a topic to write up. */
const queue = [];
let running = false;

async function kick() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const item = queue.shift();
      try {
        if (item.job === "read") await read(item.id);
        else await writeProposal(item.id, item.n, item.who, item.day);
      } catch (err) {
        console.error(`Reading book ${item.id} failed: ${err.status || ""} ${err.message}`);
        const status = err.status === 401 || err.status === 403 ? "This server's key was refused. Tell whoever runs the app."
          : err.status === 429 ? "Claude is busy just now. Try again in a few minutes."
          : err.status === 413 ? "A part of the book was too big to send. Split the PDF and upload the halves."
          : err.message || "Something went wrong.";
        await update(item.id, { status: "failed", error: String(status).slice(0, 500), step: "Stopped" }).catch(() => {});
      }
    }
  } finally { running = false; }
}

/** On start: carry on with whatever was being read or written up. */
export async function resume() {
  for (const r of await all(`SELECT id, status, proposals FROM coach_iq_books WHERE status IN ('waiting', 'reading', 'ready')`)) {
    if (r.status !== "ready") queue.push({ id: r.id, job: "read" });
    else {
      const proposals = parse(r.proposals, []);
      proposals.forEach((p, n) => { if (p.state === "writing") queue.push({ id: r.id, job: "write", n, who: p.who || "Glenn", day: p.day || "" }); });
    }
  }
  if (configured()) kick();
}

/** Try again after a failure, from where it stopped. */
export async function retry(id) {
  const r = await row(id);
  if (!r || r.status !== "failed") return false;
  await update(id, { status: "waiting", step: "Waiting to be read", error: "" });
  queue.push({ id, job: "read" });
  kick();
  return true;
}

/** Put a book away: its PDF goes, and nothing more is read or accepted from it. */
export async function discard(id) {
  const r = await row(id);
  if (!r) return false;
  await rm(pdfPath(id), { force: true });
  await update(id, { status: "discarded", step: "Put away", finished_at: r.finished_at || now() });
  return true;
}

/* ------------------------------------------------------- the proposals */

export class Wrong extends Error {}

async function withProposal(id, n, fn) {
  const r = await row(id);
  if (!r || r.status !== "ready") throw new Wrong("That book isn't ready for this.");
  const proposals = parse(r.proposals, []);
  const p = proposals[n];
  if (!p) throw new Wrong("That proposal isn't there.");
  const out = await fn(p, proposals, r);
  await update(id, { proposals });
  return out;
}

const firstName = (user) => String(user.name || "").trim().split(/\s+/)[0] || "The Primary Master";
/* The same day an approval is dated with (reviewed, below): "17 Oct 2026". */
const dayWords = () => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date()).replace(/Sept/, "Sep");

/** Answers to the open points so far: [{ choice: index, words: "" }]. */
export function saveAnswers(id, n, answers) {
  return withProposal(id, n, (p) => {
    if (!["open", "written"].includes(p.state)) throw new Wrong("This one can't be changed now.");
    p.answers = p.openPoints.map((q, i) => {
      const a = answers?.[i] || {};
      const choice = Number.isInteger(a.choice) && a.choice >= 0 && a.choice < q.options.length ? a.choice : null;
      return { choice, words: typeof a.words === "string" ? a.words.trim().slice(0, 1000) : "" };
    });
    /* Answers changed after a write-up: it is written up again. */
    if (p.state === "written" && p.openPoints.length) { p.state = "open"; p.written = null; }
  });
}

/** Write the answers in, in the background. */
export async function startWriteUp(id, n, user) {
  const who = firstName(user), day = dayWords();
  await withProposal(id, n, (p) => {
    if (p.state !== "open") throw new Wrong("This one isn't waiting for answers.");
    if (p.openPoints.some((_, i) => p.answers?.[i]?.choice == null && !p.answers?.[i]?.words)) throw new Wrong("Answer every point first.");
    p.state = "writing"; p.who = who; p.day = day; p.error = "";
  });
  queue.push({ id, job: "write", n, who, day });
  kick();
}

/** The written text, changed by hand before accepting. */
export function editWritten(id, n, body) {
  return withProposal(id, n, (p) => {
    if (p.state !== "written") throw new Wrong("Write it up first.");
    const text = String(body?.body || "").replace(/\r\n/g, "\n").trim();
    if (!text) throw new Wrong("The text can't be empty.");
    p.written = text;
    if (typeof body.title === "string" && body.title.trim()) p.title = body.title.trim().slice(0, 80);
    if (typeof body.covers === "string" && body.covers.trim()) p.covers = body.covers.trim().slice(0, 200);
  });
}

/**
 * Into the principles, as reviewed today, with the book among its sources.
 * Refused if the topic has changed since the book was read, so a change made
 * meanwhile is never quietly lost.
 */
export async function accept(id, n, user) {
  return withProposal(id, n, async (p, proposals, r) => {
    if (p.state !== "written") throw new Wrong(p.state === "accepted" ? "That one is in already." : "Write it up first.");
    if (/\*\*Open for Glenn/.test(p.written)) throw new Wrong("The text still has an open point in it. Answer it, or take it out of the text.");
    const had = store.current().principles.find(x => x.key === p.key) || null;
    if ((had?.body ?? null) !== p.base) {
      throw new Wrong(had ? `${had.title} has changed since this book was read. Copy what you want from this text into it on Principles, and reject this one.` : "That topic has been taken out since. Reject this one.");
    }
    const about = parse(r.about, {});
    const source = sourceLabel(about);
    const after = {
      ...(had || {}), key: p.key, title: p.title, covers: p.covers, body: p.written,
      status: "reviewed", reviewed: new Date().toISOString().slice(0, 10),
      sources: [...new Set([...(had?.sources || []), source])],
    };
    const history = await store.change([{ kind: "principle", id: p.key, after }], user, `From ${about.title || "a book"}: ${had ? "changed" : "added"} the principles on ${p.title}`);
    p.state = "accepted"; p.history = history; p.decidedAt = now(); p.decidedBy = user.name || "";
    await finishIfDone(id, proposals);
  });
}

export function reject(id, n, user) {
  return withProposal(id, n, async (p, proposals) => {
    if (p.state === "accepted") throw new Wrong("That one is in already: undo it under Changes.");
    if (p.state === "writing") throw new Wrong("Wait for it to be written up.");
    p.state = "rejected"; p.decidedAt = now(); p.decidedBy = user.name || "";
    await finishIfDone(id, proposals);
  });
}

async function finishIfDone(id, proposals) {
  if (proposals.every(p => p.state === "accepted" || p.state === "rejected")) {
    await update(id, { status: "done", step: "Done" });
  }
}
