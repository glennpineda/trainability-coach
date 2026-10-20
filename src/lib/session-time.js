/**
 * About how long a day of a program takes (Glenn, 20 Oct 2026: "make sure
 * the amount of exercises/set corresponds with the length of the session
 * they selected. I usually like to add 60 seconds rest in between sets, and
 * a set is roughly 30-45 seconds long (see if you can be more accurate on
 * this)"). Shared by the page and the server. Pure.
 *
 * A set is its reps at the rep's own time, plus a few seconds to set up:
 *   - a rep is its tempo where one is written (3-1-1-0 is 5 s, X counting
 *     as 1; tempo.md), else REP seconds, a controlled rep of about two
 *     seconds down and one up;
 *   - "each side" (a lunge, a one-arm row) is done twice;
 *   - a time ("30–45 s") is that time; anything else, a calorie count or a
 *     distance, about a minute.
 * So 8 reps are about 29 s and 12 about 41 s: Glenn's 30–45 seconds.
 * A range is taken at its middle (8–12 reps as 10, 3–4 sets as 4, rounded
 * up). Each set is followed by its rest, the last one's rest being the move
 * to the next exercise; with no rest written, `restDefault`. Exercises done
 * together (a superset or giant set) rest once a round, with a few seconds
 * to change between them. A drop set's drops add most of a set each, with no
 * rest; a pyramid's sets are its reps, one each.
 */

export const REP = 3;             // seconds a rep, with no tempo written
export const SET_UP = 5;          // to pick up the weight, get set and breathe
export const CHANGE = 15;         // between exercises done together, or warm-up drills
export const REST_DEFAULT = 60;   // Glenn: "I usually like to add 60 seconds rest"

const mid = (lo, hi) => Math.ceil((lo + hi) / 2);
const span = (text) => {
  const m = /(\d+(?:\.\d+)?)\s*(?:(?:–|-|to)\s*(\d+(?:\.\d+)?))?/.exec(String(text || ""));
  return m ? mid(Number(m[1]), Number(m[2] ?? m[1])) : null;
};

/** Seconds of one rep at a tempo, or REP. */
export function repSeconds(tempo) {
  const t = String(tempo || "").replace(/\s+/g, "").replace(/[–—]/g, "-");
  if (!/^[0-9xX](?:-[0-9xX]){2,3}$/.test(t)) return REP;
  return Math.max(1, t.split("-").reduce((n, p) => n + (/x/i.test(p) ? 1 : Number(p)), 0));
}

/** Seconds of one set as written: reps at the tempo, or the time. */
export function setSeconds(e) {
  const reps = String(e?.reps || "").trim().toLowerCase();
  const sides = /each|per side|per leg|per arm|\/\s*side|a side/.test(reps) ? 2 : 1;
  if (/\b(min|mins|minutes?)\b/.test(reps)) return Math.round((span(reps) || 1) * 60) * sides;
  if (/\d\s*(s|sec|secs|seconds?)\b/.test(reps)) return (span(reps) || 30) * sides + SET_UP;
  if (/cal|m\b|metres?|meters?|km|yd|yards?/.test(reps)) return 60;
  const list = reps.split(/\s*,\s*/);
  const n = list.length > 1 && list.every(x => /^\d+$/.test(x)) ? mid(...[Math.min(...list.map(Number)), Math.max(...list.map(Number))]) : span(reps);
  if (!n) return 30 + SET_UP;   // AMRAP, or nothing written: about half a minute
  return n * repSeconds(e?.tempo) * sides + SET_UP;
}

/** How many sets: the middle of the range, a pyramid's reps one each, 1 when none is written. */
export function setCount(e) {
  const list = String(e?.reps || "").split(/\s*,\s*/);
  if (String(e?.technique || "").startsWith("pyramid") && list.length > 1) return list.length;
  return span(e?.sets) || 1;
}

/** The rest after each set, in seconds. */
const restOf = (e, restDefault) => (e?.rest != null ? Number(e.rest) : restDefault);

/**
 * Seconds a day's session takes: its exercises in order, a group done
 * together as one. `warmupSet(e)` says whether an exercise starts with a
 * warm-up set of its own (warm-up-sets.md), which adds a set and a short rest.
 */
export function sessionSeconds(exercises, { restDefault = REST_DEFAULT, warmupSet = () => false } = {}) {
  let total = 0;
  for (let i = 0; i < exercises.length;) {
    let j = i + 1;
    while (j < exercises.length && exercises[j].superset) j++;
    const group = exercises.slice(i, j);
    const rounds = Math.max(...group.map(setCount));
    const work = group.reduce((n, e) => n + setSeconds(e) * (1 + (e.technique === "drop" ? 0.7 * (Number(e.drops) || 1) : 0)), 0);
    const change = (group.length - 1) * CHANGE;
    total += rounds * (work + change + restOf(group[group.length - 1], restDefault));
    for (const e of group) if (warmupSet(e)) total += setSeconds(e) + Math.min(restOf(e, restDefault), 60);
    i = j;
  }
  return Math.round(total);
}

/** Seconds of a warm-up or a cool-down: each item's sets back to back, then on to the next. */
export function partSeconds(list) {
  return Math.round((list || []).reduce((n, e) => n + setCount(e) * setSeconds(e) + CHANGE, 0));
}

/** "About 55 min" from seconds, to the nearest five minutes. */
export const minutesWords = (s) => `about ${Math.max(5, Math.round(s / 300) * 5)} min`;
