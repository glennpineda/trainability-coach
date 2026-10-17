/**
 * Checks the button and link levels (src/index.css, "buttons"), as Studio's
 * scripts/check-ui.mjs checks its own.
 *
 *   npm run check-ui
 *
 * It cannot judge intent: whether a control is the reason a screen exists is
 * a person's call. It catches the mechanical ways the levels drift:
 *
 *   1. A way out wearing weight it hasn't earned. Cancel, Keep it, Back to
 *      login and the like are quiet: a dismissal that looks like the thing it
 *      dismisses reads as a choice between equals.
 *   2. A control wearing two levels at once: a primary that is also a link, a
 *      quiet button that is also a row.
 *   3. An underline on a button or a link. Links are accent words after an
 *      icon, never underlined (Studio, Glenn 29 Sep 2026).
 *   4. The old look: Billy's panel icon (cx-billy-icon) outside his panel,
 *      where an icon button is cx-icon-btn.
 *
 * A real exception carries a comment on the line before the tag:
 *
 *   {/* ui-exception: why *\/}
 *
 * and its reason is printed on every run, so it keeps earning its place.
 */
import { readFile, glob } from "node:fs/promises";

const DISMISSALS = new Set(["cancel", "not now", "dismiss", "back", "close", "back to login", "keep it", "keep"]);
const LEVELS = ["cx-btn-primary", "cx-btn-ember", "cx-btn-quiet", "cx-btn-row", "cx-link", "cx-quiet", "cx-icon-btn"];
const LOUD = ["cx-btn-primary", "cx-btn-ember", "cx-btn-quiet", "cx-btn-row", "cx-link"];

/* Each <button> or <a>: where it starts, its attributes and its words. Not a
   regex: attributes hold `=>`, so the tag ends at the first ">" outside
   braces and quotes (Studio learned this the hard way). */
function* tags(src) {
  const open = /<(button|a)\b/g;
  let m;
  while ((m = open.exec(src))) {
    let i = m.index + m[0].length, depth = 0, quote = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (quote) { if (ch === quote && src[i - 1] !== "\\") quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    const attrs = src.slice(m.index, i + 1);
    const close = src.indexOf(`</${m[1]}>`, i);
    const body = close === -1 ? "" : src.slice(i + 1, close);
    const words = body.replace(/\{[^{}]*\}/g, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    yield { kind: m[1], at: m.index, attrs, words };
  }
}

const lineOf = (src, at) => src.slice(0, at).split("\n").length;
const classesOf = (attrs) => [...attrs.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map(x => x[1] ?? x[2]).join(" ");

const problems = [], exceptions = [];
for await (const file of glob("src/**/*.jsx")) {
  const src = await readFile(file, "utf8");
  for (const t of tags(src)) {
    const line = lineOf(src, t.at);
    const before = src.split("\n")[line - 2] || "";
    const why = /ui-exception:\s*(.*?)\s*\*\/\}?\s*$/.exec(before)?.[1];
    const cls = classesOf(t.attrs).split(/\s+/);
    const where = `${file}:${line}`;
    const wrong = [];
    if (DISMISSALS.has(t.words.toLowerCase()) && cls.some(c => LOUD.includes(c))) wrong.push(`"${t.words}" backs out, so it is quiet (cx-quiet), not ${cls.filter(c => LOUD.includes(c)).join(", ")}`);
    const levels = cls.filter(c => LEVELS.includes(c));
    if (levels.length > 1) wrong.push(`two levels at once: ${levels.join(" and ")}`);
    if (cls.some(c => /^(hover:)?underline$/.test(c))) wrong.push("an underline: links are accent words after an icon");
    if (cls.includes("cx-billy-icon") && !file.startsWith("src/billy/")) wrong.push("cx-billy-icon outside Billy's panel: an icon button is cx-icon-btn");
    if (!wrong.length) continue;
    if (why) exceptions.push(`${where}: ${why}`);
    else for (const w of wrong) problems.push(`${where}: ${w}`);
  }
}

for (const e of exceptions) console.log(`exception ${e}`);
if (problems.length) {
  console.error(`Buttons and links: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`Buttons and links: all on their level${exceptions.length ? `, ${exceptions.length} exception(s) above` : ""}.`);
