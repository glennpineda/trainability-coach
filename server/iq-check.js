import { CATEGORIES } from "./equipment.js";
import { isId } from "./ids.js";
import {
  ORDER, WORDS, PATTERNS, PIECES, PURPOSES, ROLES, MUSCLES, JOINTS, FLAGS, LEVELS, MEASURES, ORIGINS, STATUSES,
  masterName, bodyweightFamilies, equipmentFor, nameKey,
} from "./coach-iq.js";

/**
 * Coach IQ's rules for a library that holds together, in one place: run by
 * `npm run check-iq` over the files, and by the app over every change before
 * it is saved (iq-store.js), so a change that would break the library is
 * refused rather than written.
 *
 *   checkLibrary({ movements, exercises, conditions })
 *     → { problems: [plain sentences], masters: Map(id → master name),
 *         easier: Map(id → [ids one step easier]) }
 *
 * It never changes what it is given.
 */

export const KINDS = new Set(CATEGORIES.map(c => c.key));
export const DISCIPLINES = ["yoga", "pilates"];
export const CONDITION_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function checkLibrary({ movements, exercises: list, conditions = [] }) {
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
  const byMaster = new Map();
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
    const master = masterName(x, movements, bwOnly);
    masters.set(x.id, master);
    if (byMaster.has(master)) wrong(`same full name as ${byMaster.get(master)}: "${master}"`);
    byMaster.set(master, at);
    /* No two exercises may answer to the same name (ideas audit, 13). */
    for (const n of new Set([x.name, ...(x.aliases || []), ...(x.formerNames || [])].map(nameKey))) {
      if (names.has(n) && names.get(n) !== x.id) wrong(`"${n}" is also a name of ${ids.get(names.get(n))?.name || names.get(n)}`);
      names.set(n, x.id);
    }
    if (!x.name) wrong("it has no common name");
    if (!x.primary?.length) wrong("it works no main muscle");
    for (const m of [...(x.primary || []), ...(x.secondary || [])]) if (!MUSCLES.includes(m)) wrong(`unknown muscle "${m}"`);
    if ((x.secondary || []).some(m => (x.primary || []).includes(m))) wrong("a muscle is both main and other");
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

  /* The conditions table (ideas audit, 21). */
  const condKeys = new Set();
  for (const c of conditions) {
    const wrong = (why) => problems.push(`condition ${c.label || c.key}: ${why}`);
    if (!CONDITION_KEY.test(c.key || "")) wrong("its key must be lowercase words joined by hyphens");
    if (condKeys.has(c.key)) wrong("its key is used twice");
    condKeys.add(c.key);
    if (!c.label) wrong("it has no label");
    for (const part of ["avoid", "modify"]) {
      for (const f of c[part]?.facts || []) if (!FLAGS[f]) wrong(`unknown fact "${f}" under ${part}`);
      for (const j of c[part]?.joints || []) if (!JOINTS.includes(j)) wrong(`unknown joint "${j}" under ${part}`);
    }
    if (!c.refer) wrong("it says nothing about when to refer on");
    if (typeof c.clearance !== "boolean") wrong("it must say whether a doctor's clearance comes first");
    if (!["draft", "reviewed"].includes(c.status)) wrong(`unknown status "${c.status}"`);
    if (c.status === "reviewed" && !/^\d{4}-\d{2}-\d{2}$/.test(c.reviewed || "")) wrong("reviewed, but with no date");
  }

  return { problems, masters, easier };
}
