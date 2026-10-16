import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../server/equipment.js";

/**
 * Coach IQ's exercise library: checked, and written out for reading.
 *
 *   npm run iq         checks coach-iq/exercises.json and writes EXERCISES.md
 *   npm run check-iq   checks it, and fails if EXERCISES.md is behind
 *
 * exercises.json is the library itself, the one Billy will read. EXERCISES.md
 * is the same list as tables, for Glenn to review; never edit it by hand.
 *
 * Every word in the library comes from a list below, so "lower-back" and
 * "lower back" can never both turn up, and a condition can be matched to the
 * exercises it rules out by their flags (coach-iq/README.md).
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "coach-iq", "exercises.json");
const PAGE = path.join(ROOT, "coach-iq", "EXERCISES.md");

/* The movement each exercise trains, in the order the page lists them. */
const PATTERNS = {
  "squat": "Squat", "hinge": "Hinge", "lunge": "Lunge and single leg",
  "push-horizontal": "Push, horizontal", "push-vertical": "Push, overhead",
  "pull-horizontal": "Pull, horizontal", "pull-vertical": "Pull, vertical",
  "carry": "Carry", "core-anti-extension": "Core: resisting arching", "core-anti-rotation": "Core: resisting twisting",
  "core-lateral": "Core: resisting bending sideways", "core-flexion": "Core: bending", "rotation": "Rotation",
  "isolation": "Single muscle", "plyometric": "Jumping and throwing", "conditioning": "Conditioning", "mobility": "Mobility",
};
const MUSCLES = ["quads", "hamstrings", "glutes", "adductors", "hip flexors", "calves", "chest", "front delts", "side delts",
  "rear delts", "shoulders", "lats", "upper back", "lower back", "biceps", "triceps", "forearms", "core"];
const MODALITIES = ["bodyweight", "free weights", "kettlebell", "machine", "cable", "band", "suspension", "plyometric",
  "conditioning", "cardio", "mobility", "yoga", "pilates"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const JOINTS = ["neck", "shoulders", "elbows", "wrists", "lower-back", "hips", "knees", "ankles"];
/* Plain facts about an exercise. Which conditions call for care with which is
   Coach IQ's principles' to say, not this list's. */
const FLAGS = {
  "high-impact": "jumping or running",
  "spinal-load": "a heavy load on the spine",
  "spinal-flexion": "rounding the spine",
  "spinal-rotation": "twisting the spine",
  "overhead": "arms overhead",
  "lying-on-back": "lying on the back",
  "lying-face-down": "lying face down",
  "inverted": "head below the heart",
  "balance": "a balance challenge",
  "breath-hold": "heavy bracing that tempts holding the breath",
  "floor-transfer": "getting down to the floor and up",
  "grip": "a hard grip",
};
const KINDS = new Set(CATEGORIES.map(c => c.key));
const KIND_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label.replace(/^(A|An) /, "").replace(/^./, ch => ch.toUpperCase())]));

const list = JSON.parse(readFileSync(SOURCE, "utf8"));
const problems = [];
const ids = new Map();
for (const x of list) {
  const at = x.id || `(no id: ${x.name})`;
  const wrong = (why) => problems.push(`${at}: ${why}`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.id || "")) wrong("its id must be lowercase words joined by hyphens");
  if (ids.has(x.id)) wrong("its id is used twice");
  ids.set(x.id, x);
  if (!x.name) wrong("it has no name");
  if (!PATTERNS[x.pattern]) wrong(`unknown pattern "${x.pattern}"`);
  if (!x.primary?.length) wrong("it works no main muscle");
  for (const m of [...(x.primary || []), ...(x.secondary || [])]) if (!MUSCLES.includes(m)) wrong(`unknown muscle "${m}"`);
  if (!MODALITIES.includes(x.modality)) wrong(`unknown modality "${x.modality}"`);
  if (!LEVELS.includes(x.level)) wrong(`unknown level "${x.level}"`);
  for (const k of [...(x.equipment?.needs || []), ...(x.equipment?.oneOf || [])]) if (!KINDS.has(k)) wrong(`unknown equipment "${k}"`);
  if (x.equipment?.piece && !(x.equipment.needs?.length || x.equipment.oneOf?.length)) wrong("a piece needs the kind it belongs to");
  for (const j of x.cautions?.joints || []) if (!JOINTS.includes(j)) wrong(`unknown joint "${j}"`);
  for (const f of x.cautions?.flags || []) if (!FLAGS[f]) wrong(`unknown flag "${f}"`);
}
for (const x of list) {
  for (const way of ["easier", "harder"]) {
    for (const ref of x[way] || []) {
      if (ref === x.id) problems.push(`${x.id}: lists itself as ${way}`);
      else if (!ids.has(ref)) problems.push(`${x.id}: ${way} "${ref}" is not in the library`);
    }
  }
}

const words = (a) => a.join(", ");
const equipmentOf = (e) => {
  const needs = (e.needs || []).map(k => KIND_LABEL[k]);
  const one = (e.oneOf || []).map(k => KIND_LABEL[k]);
  const parts = [];
  if (e.piece) parts.push(e.piece);
  if (needs.length) parts.push(needs.join(" + "));
  if (one.length) parts.push((needs.length || e.piece ? "with " : "") + one.join(" or "));
  return parts.join(", ") || "None";
};
const nameOf = (id) => ids.get(id)?.name || id;
const lines = [
  "# Coach IQ: exercise library",
  "",
  "Written by `npm run iq` from `exercises.json`. Do not edit this page: change",
  "`exercises.json` and run it again.",
  "",
  `${list.length} exercises. **Care with** lists the joints an exercise loads and plain facts about it;`,
  "which conditions call for care with which is in Coach IQ's principles.",
  "",
  "Facts used under Care with: " + Object.entries(FLAGS).map(([k, v]) => `**${k}** (${v})`).join(", ") + ".",
  "",
];
for (const [key, title] of Object.entries(PATTERNS)) {
  const here = list.filter(x => x.pattern === key);
  if (!here.length) continue;
  lines.push(`## ${title}`, "", "| Exercise | Works | Equipment | Level | Easier | Harder | Care with |", "|---|---|---|---|---|---|---|");
  for (const x of here) {
    const name = x.aliases?.length ? `**${x.name}** (${x.aliases.join(", ")})` : `**${x.name}**`;
    const works = words(x.primary) + (x.secondary?.length ? `; also ${words(x.secondary)}` : "");
    const care = [...(x.cautions?.joints || []), ...(x.cautions?.flags || [])].join(", ");
    lines.push(`| ${name} | ${works} | ${equipmentOf(x.equipment || {})} | ${x.level} | ${(x.easier || []).map(nameOf).join(", ")} | ${(x.harder || []).map(nameOf).join(", ")} | ${care} |`);
  }
  lines.push("");
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
  console.log(`Coach IQ: ${list.length} exercises, all consistent.`);
} else {
  writeFileSync(PAGE, page);
  console.log(`Coach IQ: ${list.length} exercises checked; EXERCISES.md written.`);
}
