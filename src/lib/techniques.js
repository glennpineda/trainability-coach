/**
 * Ways of doing an exercise's sets beyond straight sets (Glenn, 19 Oct 2026,
 * with "Difference Between Super Sets / Giant Sets / Drop Sets / Pyramid
 * Sets", SLAM Fitness: "we should be adding the other advanced techniques in
 * this pdf as well"). Supersets were already here (done together with the
 * exercise above); three or more done together are a giant set. Drop sets
 * and pyramids belong to one exercise: its `technique`, with `drops` for a
 * drop set. Shared by the page and the server. Pure.
 */
export const TECHNIQUES = [
  { key: "", label: "Straight sets", how: "The same reps and weight each set." },
  { key: "drop", label: "Drop set", how: "To failure, then straight away about 20–30% lighter and on to failure again, with no rest between drops." },
  { key: "pyramid-up", label: "Pyramid, going up", how: "Heavier each set with fewer reps, such as 12, 10, 8, 6." },
  { key: "pyramid-down", label: "Pyramid, coming down", how: "Lighter each set with more reps, such as 6, 8, 10." },
  { key: "pyramid-double", label: "Double pyramid", how: "Up, then back down, such as 12, 10, 8, 10, 12." },
];
export const TECHNIQUE_KEYS = TECHNIQUES.map(t => t.key);
export const MAX_DROPS = 3;
export const isPyramid = (key) => String(key || "").startsWith("pyramid");

/** "drop set, 2 drops", "pyramid, going up", or "" for straight sets. */
export function techniqueText(e) {
  if (!e?.technique) return "";
  if (e.technique === "drop") return e.drops ? `drop set, ${e.drops} ${e.drops === 1 ? "drop" : "drops"}` : "drop set";
  return (TECHNIQUES.find(t => t.key === e.technique)?.label || "").toLowerCase();
}

/** How many exercises are done together with each one (1 alone, 2 a superset, 3 or more a giant set). */
export function groupSizes(exercises) {
  const sizes = new Array(exercises.length).fill(1);
  let start = 0;
  for (let i = 1; i <= exercises.length; i++) {
    if (i === exercises.length || !exercises[i].superset) {
      for (let j = start; j < i; j++) sizes[j] = i - start;
      start = i;
    }
  }
  return sizes;
}
export const groupName = (size) => (size >= 3 ? "Giant set" : size === 2 ? "Superset" : "");
