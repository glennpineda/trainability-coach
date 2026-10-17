import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES } from "../server/equipment.js";
import { PATTERNS, PIECES, PURPOSES, ROLES, FLAGS, STATUSES, equipmentFor, measureOf, perSideOf, factsOf } from "../server/coach-iq.js";
import { checkLibrary } from "../server/iq-check.js";
import { readPrinciples, writePrinciples } from "../server/principles-files.js";

/**
 * Coach IQ's exercise library: checked, and written out for reading.
 *
 *   npm run iq         checks coach-iq/exercises.json and writes EXERCISES.md
 *   npm run check-iq   checks it, and fails if EXERCISES.md is behind
 *                      (npm run check-docs runs it too)
 *   npm run iq -- --import <file>
 *                      writes a library exported from the app (Review Coach
 *                      IQ → Export) into exercises.json, conditions.json and
 *                      principles/, then checks and writes the pages as usual
 *
 * Since build 1.0.12 the library lives in the app's database (server/
 * iq-store.js), loaded from these files once; the files are its starting copy
 * and a backup, refreshed from an export when wanted (Glenn, 17 Oct 2026:
 * "Is there another way so it's app controlled?"). exercises.json holds its
 * families (`movements`, keyed by their exf… ids) and their versions
 * (`exercises`, each with a permanent exr… id). EXERCISES.md is the same list
 * as tables, for reading; never edit it by hand. The rules are
 * server/iq-check.js, the same ones the app runs on every change. Master names, equipment and how an exercise is counted are worked out
 * here from the attributes (server/coach-iq.js), so they are never typed.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "coach-iq", "exercises.json");
const PAGE = path.join(ROOT, "coach-iq", "EXERCISES.md");
const CONDITIONS = path.join(ROOT, "coach-iq", "conditions.json");
const CONDITIONS_PAGE = path.join(ROOT, "coach-iq", "CONDITIONS.md");

const KIND_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label.replace(/^(A|An) /, "").replace(/^./, ch => ch.toUpperCase())]));

/* conditions.json in its own layout, one line to a field, so a row reads
   at a glance and an import changes only what changed. */
function conditionsText(about, conditions) {
  const list = (a) => `[${a.map(v => JSON.stringify(v)).join(", ")}]`;
  const value = (v) => (v && typeof v === "object" && !Array.isArray(v) && "facts" in v
    ? `{ "facts": ${list(v.facts || [])}, "joints": ${list(v.joints || [])} }` : JSON.stringify(v));
  const row = (c) => {
    const lines = Object.entries(c).filter(([k]) => k !== "status" && k !== "reviewed").map(([k, v]) => `   ${JSON.stringify(k)}: ${value(v)}`);
    lines.push(`   "status": ${JSON.stringify(c.status)}, "reviewed": ${JSON.stringify(c.reviewed ?? null)}`);
    return `  {\n${lines.join(",\n")}\n  }`;
  };
  return `{\n "about": ${JSON.stringify(about)},\n "conditions": [\n${conditions.map(row).join(",\n")}\n ]\n}\n`;
}

/* A library exported from the app, written into the files. */
const importAt = process.argv.indexOf("--import");
if (importAt !== -1) {
  const out = JSON.parse(readFileSync(process.argv[importAt + 1], "utf8"));
  if (!out.movements || !Array.isArray(out.exercises) || !Array.isArray(out.conditions)) {
    console.error("That isn't a library exported from Coach (Review Coach IQ → Export).");
    process.exit(1);
  }
  const { about } = JSON.parse(readFileSync(CONDITIONS, "utf8"));
  writeFileSync(SOURCE, JSON.stringify({ movements: out.movements, exercises: out.exercises }, null, 1) + "\n");
  writeFileSync(CONDITIONS, conditionsText(about, out.conditions));
  /* An export made before the principles joined the app has none. */
  if (Array.isArray(out.principles)) writePrinciples(out.principles);
  console.log(`Imported the library exported ${out.exported || "from the app"}: ${Object.keys(out.movements).length} families, ${out.exercises.length} versions, ${out.conditions.length} conditions${Array.isArray(out.principles) ? `, ${out.principles.length} principles` : ""}.`);
}

const { movements, exercises: list } = JSON.parse(readFileSync(SOURCE, "utf8"));
const { conditions } = JSON.parse(readFileSync(CONDITIONS, "utf8"));
const principles = readPrinciples();
const { problems, masters, easier } = checkLibrary({ movements, exercises: list, conditions, principles });
const ids = new Map(list.map(x => [x.id, x]));

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
const masterOf = (id) => masters.get(id) || id;
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
      const care = [...(x.cautions?.joints || []), ...factsOf(x)].join(", ");
      lines.push(`| **${masters.get(x.id)}** | ${common} | ${works} | ${equipmentText(x)} | ${counted(x)} | ${x.level} | ${easier.get(x.id).map(masterOf).join("; ")} | ${(x.harder || []).map(masterOf).join("; ")} | ${care} |`);
    }
    lines.push("");
  }
}
const page = lines.join("\n");

/* The conditions table (ideas audit, 21), written out with what each
   condition does to the library, so a row can be judged. */
const hits = (part, c) => list.filter(x => factsOf(x).some(f => c[part].facts.includes(f)) || (x.cautions?.joints || []).some(j => c[part].joints.includes(j)));
const said = (part, c) => [...c[part].facts.map(f => `${f} (${FLAGS[f]})`), ...c[part].joints.map(j => `the ${j.replace("-", " ")}`)].join(", ") || "nothing";
const condLines = [
  "# Coach IQ: conditions",
  "",
  "Written by `npm run iq` from `conditions.json`. Do not edit this page.",
  "",
  `${conditions.length} conditions (${conditions.filter(c => c.status === "draft").length} drafts for Glenn to approve). For each: the facts and joints`,
  "to **avoid** (those exercises are not offered), to **modify** (an easier or supported version is offered first),",
  "whether a doctor's **clearance** comes first, and when to **refer** on. Never a diagnosis.",
  "",
];
for (const c of conditions) {
  const out = hits("avoid", c), changed = hits("modify", c).filter(x => !out.includes(x));
  condLines.push(`## ${c.label}${c.status === "draft" ? " (draft)" : ""}`, "",
    `- **Avoid:** ${said("avoid", c)}. ${out.length} of ${list.length} exercises left out.`,
    `- **Modify:** ${said("modify", c)}. ${changed.length} more offered with care.`,
    `- **Clearance first:** ${c.clearance ? "yes" : "no"}.`,
    `- **Refer:** ${c.refer}`, "");
}
const condPage = condLines.join("\n");

if (problems.length) {
  console.error(`Coach IQ: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (process.argv.includes("--check")) {
  let had = "";
  try { had = readFileSync(PAGE, "utf8"); } catch { /* missing */ }
  if (had !== page) {
    console.error("coach-iq/EXERCISES.md is behind exercises.json. Run: npm run iq");
    process.exit(1);
  }
  let hadConditions = "";
  try { hadConditions = readFileSync(CONDITIONS_PAGE, "utf8"); } catch { /* missing */ }
  if (hadConditions !== condPage) {
    console.error("coach-iq/CONDITIONS.md is behind conditions.json. Run: npm run iq");
    process.exit(1);
  }
  console.log(`Coach IQ: ${Object.keys(movements).length} families, ${list.length} versions, ${conditions.length} conditions, ${principles.length} principles, all consistent.`);
} else {
  writeFileSync(PAGE, page);
  writeFileSync(CONDITIONS_PAGE, condPage);
  console.log(`Coach IQ: ${Object.keys(movements).length} families, ${list.length} versions checked; EXERCISES.md written.`);
}
