import { readFileSync, writeFileSync } from "node:fs";

/**
 * Coach IQ's principles as files: coach-iq/principles/, one Markdown file a
 * topic, listed in that folder's README. Since build 1.0.16 the principles
 * live in the app's database with the rest of Coach IQ (iq-store.js); these
 * files load it the first time and stay as its starting copy and a backup,
 * as exercises.json does for the library (`npm run iq -- --import <file>`
 * writes an export from the app back into them).
 *
 * A principle, as the app holds it:
 *
 *   { key: "rest", title: "Rest", covers: "Rest between sets: …",
 *     body: "## By goal\n\n…", status: "reviewed" | "draft",
 *     reviewed: "2026-10-17" | null, sources: ["Program Design (Paul Chek, 2011)"] }
 *
 * and as a file: `# Title`, then the status line, then the body.
 *
 *   _Status: reviewed, 17 Oct 2026. From: Program Design (Paul Chek, 2011)._
 *
 * Several sources are joined with "; ". `covers` is the topic's line in the
 * README's table, which is written again on import.
 */

const DIR = new URL("../coach-iq/principles/", import.meta.url);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS = /^_Status: (reviewed|draft)(?:, (\d{1,2}) ([A-Z][a-z]{2}) (\d{4}))?\.(?: From: (.+?)\.)?_$/;

/* "17 Oct 2026" ↔ "2026-10-17". */
const dayOf = (d, mon, y) => `${y}-${String(MONTHS.indexOf(mon) + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const wordsOf = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };

/* The README's table: [key, covers], in its order. */
function table(readme) {
  const rows = [];
  for (const line of readme.split("\n")) {
    const m = /^\| \[([a-z0-9-]+)\.md\]\([a-z0-9-]+\.md\) \| (.+) \|$/.exec(line);
    if (m) rows.push([m[1], m[2]]);
  }
  return rows;
}

/** One file's text as a principle, or throws saying what is wrong with it. */
export function parsePrinciple(key, text, covers = "") {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const title = /^# (.+)$/.exec(lines[0] || "")?.[1];
  if (!title) throw new Error(`${key}.md doesn't start with "# Title"`);
  const at = lines.findIndex(l => l.startsWith("_Status:"));
  const m = at === -1 ? null : STATUS.exec(lines[at]);
  if (!m) throw new Error(`${key}.md has no status line in the usual form`);
  return {
    key, title, covers,
    body: lines.slice(at + 1).join("\n").trim(),
    status: m[1],
    reviewed: m[1] === "reviewed" && m[2] ? dayOf(m[2], m[3], m[4]) : null,
    sources: m[5] ? m[5].split("; ").map(s => s.trim()).filter(Boolean) : [],
  };
}

/** A principle as its file's text. */
export function principleText(p) {
  const when = p.status === "reviewed" && p.reviewed ? `, ${wordsOf(p.reviewed)}` : "";
  const from = p.sources?.length ? ` From: ${p.sources.join("; ")}.` : "";
  return `# ${p.title}\n\n_Status: ${p.status}${when}.${from}_\n\n${p.body.trim()}\n`;
}

/** Every principle in the folder, in the README's order. */
export function readPrinciples() {
  const readme = readFileSync(new URL("README.md", DIR), "utf8");
  return table(readme).map(([key, covers]) => parsePrinciple(key, readFileSync(new URL(`${key}.md`, DIR), "utf8"), covers));
}

/** Write principles from an export into the folder, and the README's table to match. */
export function writePrinciples(principles) {
  for (const p of principles) writeFileSync(new URL(`${p.key}.md`, DIR), principleText(p));
  const readme = readFileSync(new URL("README.md", DIR), "utf8").split("\n");
  const head = readme.findIndex(l => l.startsWith("| File |"));
  const end = readme.findIndex((l, i) => i > head + 1 && !l.startsWith("|"));
  const rows = principles.map(p => `| [${p.key}.md](${p.key}.md) | ${p.covers.replace(/\|/g, "/")} |`);
  readme.splice(head + 2, (end === -1 ? readme.length : end) - head - 2, ...rows);
  writeFileSync(new URL("README.md", DIR), readme.join("\n"));
}
