import {
  ORDER, WORDS, PATTERNS, PIECES, PURPOSES, ROLES, MUSCLES, JOINTS, FLAGS, LEVELS, MEASURES,
} from "./coach-iq.js";
import { CATEGORIES } from "./equipment.js";
import { DISCIPLINES } from "./iq-check.js";

/**
 * Editing Coach IQ's library on the review page (Glenn, 17 Oct 2026): what
 * the page may choose from, and a row of the library made from what it
 * sends. Only known fields are taken and lists are tidied; whether the
 * result holds together is iq-check.js's to say, when iq-store.js saves it.
 * A field the page doesn't edit is kept as it was.
 */

/** Everything the editor offers, in words. */
export function vocabulary() {
  return {
    order: ORDER, words: WORDS, patterns: PATTERNS, purposes: PURPOSES, roles: ROLES, muscles: MUSCLES,
    joints: JOINTS, facts: FLAGS, levels: LEVELS, measures: MEASURES, disciplines: DISCIPLINES,
    pieces: Object.entries(PIECES).map(([key, p]) => ({ key, label: p.label })),
    kinds: CATEGORIES.map(c => ({ key: c.key, label: c.label })),
  };
}

const text = (v, max = 120) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const list = (v, max = 40) => (Array.isArray(v) ? [...new Set(v.map(x => text(x)).filter(Boolean))].slice(0, max) : []);
const sameName = (a, b) => text(a).toLowerCase() === text(b).toLowerCase();

/**
 * A version from the page: { name, aliases, movement, attributes, primary,
 * secondary, level, harder, joints, facts, piece, measure, perSide }. A
 * renamed version keeps its old name as a former one, so a program written
 * with it is still understood.
 */
export function versionFrom(body = {}, existing = null, { id, origin = "trainer" } = {}) {
  const name = text(body.name);
  let formerNames = [...(existing?.formerNames || [])];
  if (existing && existing.name && name && !sameName(existing.name, name)) formerNames.push(existing.name);
  formerNames = formerNames.filter(n => !sameName(n, name));
  const attributes = {};
  for (const key of ORDER) {
    const word = text(body.attributes?.[key]);
    if (word) attributes[key] = word;
  }
  const doc = {
    ...(existing || {}),
    id: existing?.id || id,
    name,
    aliases: list(body.aliases).filter(n => !sameName(n, name)),
    formerNames: [...new Set(formerNames)],
    movement: text(body.movement, 40),
    attributes,
    primary: list(body.primary),
    secondary: list(body.secondary),
    level: text(body.level, 20),
    harder: list(body.harder),
    cautions: { joints: list(body.joints), flags: list(body.facts) },
    origin: existing?.origin || origin,
    status: existing?.status || "draft",
    reviewed: existing?.reviewed ?? null,
  };
  /* Optional fields: set, or left out, never empty. */
  if (text(body.piece, 40)) doc.piece = text(body.piece, 40); else delete doc.piece;
  if (list(body.measure).length) doc.measure = list(body.measure); else delete doc.measure;
  if (typeof body.perSide === "boolean") doc.perSide = body.perSide; else delete doc.perSide;
  return doc;
}

/** A family from the page: { label, pattern, purposes, roles, needs, measure, perSide, implementInName, discipline }. */
export function familyFrom(body = {}, existing = null) {
  const doc = {
    ...(existing || {}),
    label: text(body.label, 80),
    pattern: text(body.pattern, 40),
    purposes: list(body.purposes),
    roles: list(body.roles),
  };
  for (const [key, value] of [["needs", list(body.needs)], ["measure", list(body.measure)]]) {
    if (value.length) doc[key] = value; else delete doc[key];
  }
  for (const key of ["perSide", "implementInName"]) {
    if (body[key] === true) doc[key] = true; else delete doc[key];
  }
  if (text(body.discipline, 20)) doc.discipline = text(body.discipline, 20); else delete doc.discipline;
  return doc;
}

/** A condition's key, from its label: lowercase words joined by hyphens. */
export const conditionKey = (label) => text(label, 80).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** A condition from the page: { label, avoid: {facts, joints}, modify: {facts, joints}, clearance, refer }. */
export function conditionFrom(body = {}, existing = null) {
  return {
    ...(existing || {}),
    key: existing?.key || conditionKey(body.label),
    label: text(body.label, 80),
    avoid: { facts: list(body.avoid?.facts), joints: list(body.avoid?.joints) },
    modify: { facts: list(body.modify?.facts), joints: list(body.modify?.joints) },
    clearance: body.clearance === true,
    refer: text(body.refer, 400),
    status: existing?.status || "draft",
    reviewed: existing?.reviewed ?? null,
  };
}

/**
 * The other versions' rows that change when one version's easier steps are
 * chosen: easier steps are never stored (ideas audit, 11), so choosing one
 * means adding this version to its harder list, and dropping one means taking
 * it out.
 */
export function easierChanges(exercises, id, easierIds) {
  const want = new Set(list(easierIds));
  const out = [];
  for (const y of exercises) {
    if (y.id === id) continue;
    const has = (y.harder || []).includes(id);
    if (want.has(y.id) && !has) out.push({ kind: "exercise", id: y.id, after: { ...y, harder: [...(y.harder || []), id] } });
    if (!want.has(y.id) && has) out.push({ kind: "exercise", id: y.id, after: { ...y, harder: y.harder.filter(h => h !== id) } });
  }
  return out;
}
