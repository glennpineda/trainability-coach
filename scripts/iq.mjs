import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../server/equipment.js";
import { isId } from "../server/ids.js";
import {
  ORDER, WORDS, PATTERNS, PIECES, PURPOSES, ROLES, MUSCLES, JOINTS, FLAGS, LEVELS, MEASURES, ORIGINS, STATUSES,
  masterName, bodyweightFamilies, equipmentFor, measureOf, perSideOf, nameKey,
} from "../server/coach-iq.js";

/**
 * Coach IQ's exercise library: checked, and written out for reading.
 *
 *   npm run iq         checks coach-iq/exercises.json and writes EXERCISES.md
 *   npm run check-iq   checks it, and fails if EXERCISES.md is behind
 *                      (npm run check-docs runs it too)
 *
 * exercises.json is the library itself: its families (`movements`, keyed by
 * their exf… ids) and their versions (`exercises`, each with a permanent exr…
 * id). EXERCISES.md is the same list as tables, for reading; never edit it by
 * hand. Master names, equipment and how an exercise is counted are worked out
 * here from the attributes (server/coach-iq.js), so they are never typed.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "coach-iq", "exercises.json");
const PAGE = path.join(ROOT, "coach-iq", "EXERCISES.md");

const KINDS = new Set(CATEGORIES.map(c => c.key));
const KIND_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label.replace(/^(A|An) /, "").replace(/^./, ch => ch.toUpperCase())]));
const DISCIPLINES = ["yoga", "pilates"];

const { movements, exercises: list } = JSON.parse(readFileSync(SOURCE, "utf8"));
const problems = [];

for (const [id, f] of Object.entries(movements)) {
  const wrong = (why) => problems.push(`family ${f.label || id}: ${why}`);
  if (!isId("family", id)) wrong(`its id "${id}" is not an exf… id`);
  if (!f.label) wrong("it has no label");
  if (!PATTERNS[f.pattern]) wrong(`unknown pattern "${f.pattern}"`);
  for (const m of f.measure || []) if (!MEASURES.includes(m)) wrong(`unknown measure "${m}"`);
  for (const k of f.needs || []) if (!KINDS.has(k)) wrong(`unknown equipment "${k}"`);
  if (f.discipline && !DISCIPLINES.includes(f.discipline)) wrong(`unknown discipline "${f.discipline}"`);
  if (!f.purposes?.length) wrong("it says nothing of what it is for");
  for (const x of f.purposes || []) if (!PURPOSES[x]) wrong(`unknown purpose "${x}"`);
  if (!f.roles?.length) wrong("it has no usual place in a session");
  for (const x of f.roles || []) if (!ROLES[x]) wrong(`unknown role "${x}"`);
}

const bwOnly = bodyweightFamilies(list);
const ids = new Map();
const masters = new Map();
const names = new Map();
for (const x of list) {
  const at = x.name || x.id;
  const wrong = (why) => problems.push(`${at}: ${why}`);
  if (!isId("exercise", x.id)) wrong(`its id "${x.id}" is not an exr… id`);
  if (ids.has(x.id)) wrong("its id is used twice");
  ids.set(x.id, x);
  const family = movements[x.movement];
  if (!family) { wrong(`unknown family "${x.movement}"`); continue; }
  for (const [key, word] of Object.entries(x.attributes || {})) {
    if (!ORDER.includes(key)) wrong(`unknown attribute "${key}"`);
    else if (!WORDS[key].includes(word)) wrong(`"${word}" is not one of the words for ${key}`);
  }
  if (!x.attributes?.implement) wrong("it names no equipment");
  x.master = masterName(x, movements, bwOnly);
  if (masters.has(x.master)) wrong(`same master name as ${masters.get(x.master)}: "${x.master}"`);
  masters.set(x.master, at);
  /* No two exercises may answer to the same name (ideas audit, 13). */
  for (const n of new Set([x.name, ...(x.aliases || []), ...(x.formerNames || [])].map(nameKey))) {
    if (names.has(n) && names.get(n) !== x.id) wrong(`"${n}" is also a name of ${ids.get(names.get(n))?.name || names.get(n)}`);
    names.set(n, x.id);
  }
  if (!x.name) wrong("it has no common name");
  if (!x.primary?.length) wrong("it works no main muscle");
  for (const m of [...(x.primary || []), ...(x.secondary || [])]) if (!MUSCLES.includes(m)) wrong(`unknown muscle "${m}"`);
  if ((x.secondary || []).some(m => x.primary.includes(m))) wrong("a muscle is both main and other");
  if (!LEVELS.includes(x.level)) wrong(`unknown level "${x.level}"`);
  for (const m of x.measure || []) if (!MEASURES.includes(m)) wrong(`unknown measure "${m}"`);
  for (const j of x.cautions?.joints || []) if (!JOINTS.includes(j)) wrong(`unknown joint "${j}"`);
  for (const f of x.cautions?.flags || []) if (!FLAGS[f]) wrong(`unknown flag "${f}"`);
  if (x.piece) {
    const piece = PIECES[x.piece];
    const e = equipmentFor(x, family);
    if (!piece) wrong(`unknown piece "${x.piece}"`);
    else if (![...e.needs, ...e.oneOf].includes(piece.kind)) wrong(`its piece (${piece.label}) is ${piece.kind}, which it doesn't need`);
  }
  if (!ORIGINS.includes(x.origin)) wrong(`unknown origin "${x.origin}"`);
  if (!STATUSES.includes(x.status)) wrong(`unknown status "${x.status}"`);
  if (x.status === "reviewed" && !/^\d{4}-\d{2}-\d{2}$/.test(x.reviewed || "")) wrong("reviewed, but with no date");
  if (x.status === "retired" && x.replacedBy && !list.some(y => y.id === x.replacedBy)) wrong("replaced by an exercise that is not in the library");
}
for (const key of Object.keys(movements)) if (!list.some(x => x.movement === key)) problems.push(`family ${movements[key].label}: has no versions`);

/* Harder steps: each one real, never itself, never in a loop, and never a
   lower level. Easier steps are worked out from them (ideas audit, 7). */
const rank = (x) => LEVELS.indexOf(x.level);
const easier = new Map(list.map(x => [x.id, []]));
for (const x of list) {
  for (const h of x.harder || []) {
    const t = ids.get(h);
    if (h === x.id) problems.push(`${x.name}: lists itself as harder`);
    else if (!t) problems.push(`${x.name}: harder "${h}" is not in the library`);
    else {
      if (rank(t) < rank(x)) problems.push(`${x.name}: its harder step ${t.name} is a lower level (${t.level} after ${x.level})`);
      easier.get(h).push(x.id);
    }
  }
}
const seen = new Set(), stack = new Set();
const loop = (id) => {
  if (stack.has(id)) return true;
  if (seen.has(id)) return false;
  seen.add(id); stack.add(id);
  const found = (ids.get(id)?.harder || []).some(loop);
  stack.delete(id);
  return found;
};
for (const x of list) if (loop(x.id)) { problems.push(`${x.name}: its harder steps go round in a loop`); break; }
/* A way in: anything above beginner can be reached from something easier. */
for (const x of list) {
  if (x.status !== "retired" && rank(x) > 0 && !easier.get(x.id).length) problems.push(`${x.name}: ${x.level}, with no easier step leading to it`);
}

const words = (a) => a.join(", ");
const equipmentText = (x) => {
  const e = equipmentFor(x, movements[x.movement]);
  const parts = [];
  if (x.piece) parts.push(PIECES[x.piece]?.label || x.piece);
  if (e.needs.length) parts.push(e.needs.map(k => KIND_LABEL[k]).join(" + "));
  if (e.oneOf.length) parts.push((parts.length ? "with " : "") + e.oneOf.map(k => KIND_LABEL[k]).join(" or "));
  return parts.join(", ") || "None";
};
const counted = (x) => {
  const f = movements[x.movement];
  return measureOf(x, f).join(" or ") + (perSideOf(x, f) ? ", per side" : "");
};
const masterOf = (id) => ids.get(id)?.master || id;
const statuses = STATUSES.map(s => `${list.filter(x => x.status === s).length} ${s}`).join(", ");
const lines = [
  "# Coach IQ: exercise library",
  "",
  "Written by `npm run iq` from `exercises.json`. Do not edit this page: change",
  "`exercises.json` and run it again.",
  "",
  `${Object.keys(movements).length} families, ${list.length} versions (${statuses}). Each version's master name is the`,
  "family, then its attributes in a fixed order: direction, position, support, limbs, equipment, attachment, load,",
  "grip, velocity, plane. An attribute at its usual setting is left out (standing, both sides, controlled), and so is",
  "equipment in a family that is only ever bodyweight. The common name is what most trainers call it.",
  "",
  "**Level** is the skill and strength an exercise needs, whatever the weight. **Counted** is how a program counts it",
  "(the first is the usual); weights are in pounds, and dumbbells and kettlebells are per hand. A tempo, a pause or",
  "slow lowering is the program's to say, not the exercise's.",
  "",
  "Each family says what it is **for** (" + Object.values(PURPOSES).join(", ") + ") and where it usually sits in a session (" + Object.values(ROLES).join(", ") + ").",
  "",
  "**Care with** lists the joints an exercise loads and plain facts about it; which conditions call for care with which",
  "is in Coach IQ's principles. The facts: " + Object.entries(FLAGS).map(([k, v]) => `**${k}** (${v})`).join(", ") + ".",
  "",
];
for (const [key, title] of Object.entries(PATTERNS)) {
  const families = Object.entries(movements).filter(([, f]) => f.pattern === key);
  if (!families.length) continue;
  lines.push(`## ${title}`, "");
  for (const [fid, f] of families) {
    lines.push(`### ${f.label}${f.discipline ? ` (${f.discipline})` : ""}`, "",
      `For ${f.purposes.map(x => PURPOSES[x]).join(", ")}; usually ${f.roles.map(x => ROLES[x]).join(", ")}.`, "",
      "| Master name | Common name | Works | Equipment | Counted | Level | Easier | Harder | Care with |",
      "|---|---|---|---|---|---|---|---|---|");
    for (const x of list.filter(y => y.movement === fid)) {
      const common = x.aliases?.length ? `${x.name} (${x.aliases.join(", ")})` : x.name;
      const works = words(x.primary) + (x.secondary?.length ? `; also ${words(x.secondary)}` : "");
      const care = [...(x.cautions?.joints || []), ...(x.cautions?.flags || [])].join(", ");
      lines.push(`| **${x.master}** | ${common} | ${works} | ${equipmentText(x)} | ${counted(x)} | ${x.level} | ${easier.get(x.id).map(masterOf).join("; ")} | ${(x.harder || []).map(masterOf).join("; ")} | ${care} |`);
    }
    lines.push("");
  }
}
const page = lines.join("\n");

if (problems.length) {
  console.error(`exercises.json: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (process.argv.includes("--check")) {
  let had = "";
  try { had = readFileSync(PAGE, "utf8"); } catch { /* missing */ }
  if (had !== page) {
    console.error("coach-iq/EXERCISES.md is behind exercises.json. Run: npm run iq");
    process.exit(1);
  }
  console.log(`Coach IQ: ${Object.keys(movements).length} families, ${list.length} versions, all consistent.`);
} else {
  writeFileSync(PAGE, page);
  console.log(`Coach IQ: ${Object.keys(movements).length} families, ${list.length} versions checked; EXERCISES.md written.`);
}
