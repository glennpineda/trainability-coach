import { all, run } from "./db.js";
import { insertWithNewId } from "./ids.js";

/**
 * The Primary Master's review of Coach IQ (ideas audit, 24): Approve or Flag,
 * with a comment, on each exercise version, each condition and (since build
 * 1.0.16) each principle.
 *
 * A mark counts in the app at once (Glenn, 17 Oct 2026: "App now, file
 * later"): an approved exercise or condition stops being a draft for Billy
 * and on every screen. Since the library moved into the app (build 1.0.12,
 * iq-store.js) the mark is also written into the library itself, so the
 * download and `--apply` step that used to carry it into the files is gone;
 * these rows keep the marks and their comments.
 *
 * The latest mark for each target is held in memory, read once on start and
 * kept up to date as marks are made, so asking whether something is a draft
 * costs nothing. Every mark stays in the table as its history.
 */

export const KINDS = ["exercise", "condition", "principle"];
export const MARKS = ["approve", "flag", "clear"];

let latest = new Map();
const key = (kind, target) => `${kind}:${target}`;

/** The latest marks, read from the database. Run on start, after migrate. */
export async function load() {
  const rows = await all(`SELECT * FROM coach_iq_reviews ORDER BY created_at`);
  const next = new Map();
  for (const r of rows) next.set(key(r.kind, r.target), shape(r));
  latest = next;
}

const shape = (r) => ({ kind: r.kind, target: r.target, mark: r.mark, comment: r.comment || "", by: r.reviewer_name, at: r.created_at });

/** The mark that counts for one target, or null if none (or taken back). */
export function markOf(kind, target) {
  const m = latest.get(key(kind, target));
  return m && m.mark !== "clear" ? m : null;
}

/** A file's status ("draft" …) as it stands once the review is counted. */
export function statusOf(kind, target, fileStatus) {
  const m = markOf(kind, target);
  return m?.mark === "approve" ? "reviewed" : fileStatus === "reviewed" && m?.mark === "flag" ? "draft" : fileStatus;
}

export async function setMark(kind, target, { mark, comment = "" }, reviewer) {
  const row = { kind, target, mark, comment: String(comment).trim().slice(0, 1000), reviewer_id: reviewer.id, reviewer_name: reviewer.name || "", created_at: new Date().toISOString() };
  await insertWithNewId("review", (id) => run(
    `INSERT INTO coach_iq_reviews (id, kind, target, mark, comment, reviewer_id, reviewer_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, row.kind, row.target, row.mark, row.comment, row.reviewer_id, row.reviewer_name, row.created_at]));
  latest.set(key(kind, target), shape(row));
}
