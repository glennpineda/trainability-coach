import { roundTo, convertText } from "./units.js";

/**
 * A load written as a share of the client's 1RM (Glenn, 19 Oct 2026: "Use the
 * 1RM in programs"): "75%", "75% 1RM" or "75% of 1RM" in a program's Load,
 * worked out from the client's latest 1RM for that exercise (Fitness tests).
 * Shared by the page and the server. Pure.
 */

const PERCENT = /^\s*(\d{1,3}(?:\.\d+)?)\s*%\s*(?:(?:of\s+)?(?:their\s+|the\s+)?1\s*-?\s*RM)?\s*$/i;

/** The percentage a load is written as, or null when it isn't one. */
export function percentOf(load) {
  const m = PERCENT.exec(String(load || ""));
  if (!m) return null;
  const p = Number(m[1]);
  return p > 0 ? p : null;
}

/** A load with a % in it that isn't one plain share ("75-80%", "~75%",
    "3x75%", "0%", "1000%"): it can't be worked out, and is said so rather
    than passed over (Run 1, B-9). */
export const unreadPercent = (load) => /%/.test(String(load || "")) && percentOf(load) == null;

/** The most reps a set asks for, read loosely enough for the 1RM check:
    "12", "10-12", "8–12 reps", "12 each side"; null for a time or AMRAP,
    which a share of 1RM doesn't limit (Run 1, B-8). */
export function topReps(text) {
  /* A pyramid's reps, set by set ("12, 10, 8, 6"): the most of them. */
  const list = String(text || "").trim().split(/\s*,\s*/);
  if (list.length > 1 && list.every(x => /^\d+$/.test(x))) return Math.max(...list.map(Number));
  const m = /^(\d+)(?:\s*(?:–|-|to)\s*(\d+))?\s*(?:reps?)?\s*(?:(?:each|per|a)\s+(?:side|leg|arm)|\/\s*side)?\s*$/i.exec(String(text || "").trim());
  return m ? Number(m[2] ?? m[1]) : null;
}

/** The weight that share of a 1RM is, in kg, unrounded. */
export const kgAt = (oneRmKg, percent) => (oneRmKg * percent) / 100;

/** About how many reps can be done at a share of 1RM: Brzycki's formula
    (the one the 1RM is worked out with) the other way round, never under 1. */
export const maxRepsAt = (percent) => Math.max(1, Math.floor(37 - (36 * percent) / 100));

/** A weight in kg as the trainer reads it, rounded to a gym's step: "190 lb", "85 kg". */
export function weightText(kg, units = "imperial") {
  if (units === "metric") return `${roundTo("kg", kg)} kg`;
  return `${roundTo("lb", kg * 2.20462262)} lb`;
}

/** A 1RM as Fitness tests shows it, to a tenth: "253.1 lb". */
export function oneRmText(kg, units = "imperial") {
  return units === "metric" ? `${Math.round(kg * 10) / 10} kg` : `${Math.round(kg * 2.20462262 * 10) / 10} lb`;
}

/** A program's load as written, in the trainer's units, with the weight a
    percentage comes to beside it: "75% (190 lb)". */
export function loadLine(e, units = "imperial") {
  const text = convertText(e.load, units);
  return e.loadKg ? `${text} (${weightText(e.loadKg, units)})` : text;
}
