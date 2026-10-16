import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The manual's copy at the bottom of NEURALBRAIN.md, and the checks on it.
 *
 *   npm run manual       copy MANUAL.md into NEURALBRAIN.md's # User Manual
 *   npm run check-docs   fail if the copy is behind, or a picture is missing
 *
 * Studio's `npm run trainer-manual` and `check-docs`, for Coach's one manual.
 * Every heading in the copy goes down a level, so the manual's own # sits
 * under NEURALBRAIN's # User Manual. Edit MANUAL.md, never the copy.
 */

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANUAL = path.join(ROOT, "MANUAL.md");
const BRAIN = path.join(ROOT, "NEURALBRAIN.md");
const BRAIN_START = "\n---\n\n# User Manual\n";

export function brainWithManual(brain, source) {
  const at = brain.indexOf(BRAIN_START);
  const above = at < 0 ? brain.trimEnd() + "\n" : brain.slice(0, at);
  const manual = source.replace(/^(#{1,5}) /gm, "#$1 ").trim();
  return `${above}${BRAIN_START}\n${manual}\n`;
}

const source = await readFile(MANUAL, "utf8");
const brain = await readFile(BRAIN, "utf8");

if (process.argv.includes("--check")) {
  const problems = [];
  if (brain !== brainWithManual(brain, source)) {
    problems.push('the manual at the bottom of NEURALBRAIN.md is behind MANUAL.md — run "npm run manual"');
  }
  const images = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
  for (const img of images) {
    if (!existsSync(path.join(ROOT, img))) problems.push(`MANUAL.md shows ${img}, which is missing — run "npm run screenshots"`);
  }
  if (problems.length) {
    for (const p of problems) console.error("✗", p);
    process.exit(1);
  }
  console.log(`MANUAL.md: ${images.length} images; NEURALBRAIN copy current — all consistent.`);
} else {
  const next = brainWithManual(brain, source);
  if (next === brain) console.log("NEURALBRAIN.md already has the current manual.");
  else { await writeFile(BRAIN, next); console.log("Copied MANUAL.md to the bottom of NEURALBRAIN.md."); }
}
