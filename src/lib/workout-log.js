import { roundTo } from "./units.js";
import { topReps, weightText } from "./one-rm.js";

/**
 * A logged session (Run 1, I-14; Glenn, 19 Oct 2026: "Tick, open for sets"):
 * one day of a program as it was done. Each exercise starts as one line,
 * done as planned; the trainer can untick it, or open it and write each set
 * as it went. Shared by the page and the server. Pure.
 *
 * An entry: { peId, exerciseId, name, planned: { sets, reps, load, weightKg },
 * done, sets: null (as planned) or [{ reps, weightKg }], note }.
 */

export const MAX_SETS = 12;
const LB_PER_KG = 2.20462262;

/** A weight a load is written as, in kg: "135 lb", "60 kg", or one worked
    out from a 1RM (loadKg); null for anything else ("BW", "light"). */
export function weightKgOf(load, loadKg = null) {
  if (loadKg) return loadKg;
  const m = /^\s*(\d+(?:\.\d+)?)\s*(lbs?|kg)\s*$/i.exec(String(load || ""));
  if (!m) return null;
  return /kg/i.test(m[2]) ? Number(m[1]) : Number(m[1]) / LB_PER_KG;
}

/** What the program asked for, from one of its exercises (programs.full's shape). */
export function plannedOf(e) {
  return { sets: e.sets || "", reps: e.reps || "", load: e.load || "", weightKg: weightKgOf(e.load, e.loadKg) };
}

/** The sets to fill in when an exercise is opened: as many as planned (the
    first number of "3–4"), each at the top of its reps and the planned weight. */
export function setsToFill(planned) {
  const n = Math.min(MAX_SETS, Math.max(1, Number(/\d+/.exec(String(planned.sets || ""))?.[0]) || 1));
  const reps = topReps(planned.reps);
  return Array.from({ length: n }, () => ({ reps: reps ?? null, weightKg: planned.weightKg ?? null }));
}

/** A weight as typed, in the trainer's units, back to kg; null when empty. */
export const kgFrom = (typed, units) => {
  const v = Number(String(typed ?? "").replace(",", "."));
  if (String(typed ?? "").trim() === "" || !Number.isFinite(v) || v < 0) return null;
  return units === "metric" ? v : v / LB_PER_KG;
};
/** A weight in kg as a box shows it, in the trainer's units, to a gym's step. */
export const shownWeight = (kg, units) => (kg == null ? "" : String(units === "metric" ? roundTo("kg", kg) : roundTo("lb", kg * LB_PER_KG)));

/** An entry in words: "3 × 8 at 135 lb", "8, 8, 6 at 135 lb", "As planned: 3 × 8–12 at 135 lb", "Not done". */
export function entryText(entry, units = "imperial") {
  if (!entry.done) return "Not done";
  const sets = entry.sets;
  if (!sets?.length) {
    const p = entry.planned || {};
    const what = [p.sets && p.reps ? `${p.sets} × ${p.reps}` : p.sets ? `${p.sets} sets` : p.reps ? `${p.reps} reps` : "",
      p.weightKg ? `at ${weightText(p.weightKg, units)}` : p.load ? `at ${p.load}` : ""].filter(Boolean).join(" ");
    return what ? `As planned: ${what}` : "Done";
  }
  const same = (k) => sets.every(s => s[k] === sets[0][k]);
  const at = (kg) => (kg ? ` at ${weightText(kg, units)}` : "");
  if (same("reps") && same("weightKg")) return `${sets.length} × ${sets[0].reps ?? "?"}${at(sets[0].weightKg)}`;
  if (same("weightKg")) return `${sets.map(s => s.reps ?? "?").join(", ")}${at(sets[0].weightKg)}`;
  return sets.map(s => `${s.reps ?? "?"}${at(s.weightKg)}`).join(", ");
}

/** The sets an entry stands for, as numbers: its own, or the plan's when it
    was ticked as planned and the plan is plain enough to count (one number
    of reps and a weight). For estimating a 1RM and the next load. */
export function setsDone(entry) {
  if (!entry.done) return [];
  if (entry.sets?.length) return entry.sets.filter(s => s.reps != null);
  const p = entry.planned || {};
  if (!/^\s*\d+\s*$/.test(String(p.reps || "")) || !p.weightKg) return [];
  return setsToFill(p);
}

/**
 * Coach IQ's next load (the load principle's straight-line progression, "a
 * little heavier each session"): when every planned set was done, at the
 * planned weight, to the top of its reps, about 2.5% more, at least one gym
 * step (5 lb or 2.5 kg). Else null.
 */
export function nextLoadKg(entry, units = "imperial") {
  const p = entry.planned || {};
  const planned = setsToFill(p);
  const done = setsDone(entry);
  const top = topReps(p.reps);
  if (!p.weightKg || !top || done.length < planned.length) return null;
  if (!done.every(s => (s.reps ?? 0) >= top && (s.weightKg ?? 0) >= p.weightKg - 0.01)) return null;
  const step = units === "metric" ? 2.5 : 5 / LB_PER_KG;
  return Math.max(p.weightKg * 1.025, p.weightKg + step);
}
