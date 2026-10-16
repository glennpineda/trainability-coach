/**
 * Coach IQ's exercise names (coach-iq/README.md, "Exercise names").
 *
 * Every exercise belongs to a family: a movement, such as Squat, Row or
 * Romanian Deadlift. A version is that movement with attributes, and its
 * master name is made from them, never typed: the movement first, then the
 * attributes in a fixed order (Glenn, 16 Oct 2026: "I'd go with C"):
 *
 *   Movement — position, support, limbs, equipment, load, grip, velocity, plane
 *
 *   Split Squat — Rear-Foot-Elevated, Dumbbell
 *   Pull-Up — Bodyweight, Supinated-Grip        (common name: Chin-up)
 *
 * An attribute at its usual setting is left out: standing, both sides,
 * controlled. Velocity is named only where it is not that movement's usual
 * (a swing is always ballistic, so it is just "Swing — Kettlebell"), and the
 * plane only where the movement does not already say it. Equipment is always
 * named, except Bodyweight in a family that is only ever bodyweight, and where
 * the movement's own name already says it (Leg Press, Box Jump).
 *
 * Trainers see their own names for an exercise, and their clients see the
 * trainer's; the master name is how Coach knows they are the same.
 */

export const ORDER = ["position", "support", "limbs", "implement", "load", "grip", "velocity", "plane"];

/* The words each attribute may use. Adding one is fine; renaming one renames
   every exercise that uses it. */
export const WORDS = {
  position: ["Seated", "Half-Kneeling", "Tall-Kneeling", "Kneeling", "Supine", "Prone", "Side-Lying", "Quadruped",
    "Hanging", "Bent-Over", "Split Stance", "Sumo Stance", "In Place"],
  support: ["Bench", "Incline Bench", "Preacher Bench", "Box", "Wall", "Incline", "Feet-Elevated", "Rear-Foot-Elevated",
    "Parallel Bars", "Stability Ball"],
  limbs: ["Single-Arm", "Single-Leg", "Alternating"],
  implement: ["Bodyweight", "Dumbbell", "Kettlebell", "Barbell", "Trap Bar", "Landmine", "Smith Machine", "Machine",
    "Cable", "Band", "Suspension Trainer", "Medicine Ball", "Stability Ball", "Ab Wheel", "Sled", "Foam Roller",
    "Treadmill", "Stationary Bike", "Air Bike", "Elliptical", "Rowing Machine", "Stair Climber", "Ski Erg", "Plyo Box"],
  load: ["Goblet", "Front-Rack", "Overhead", "Farmer", "Suitcase", "Contralateral", "Assisted"],
  grip: ["Neutral-Grip", "Pronated-Grip", "Supinated-Grip", "Wide-Grip", "Close-Grip"],
  velocity: ["Tempo", "Explosive", "Ballistic", "Isometric", "Jumping", "Eccentric", "Low-Impact"],
  plane: ["Sagittal", "Frontal", "Transverse"],
};

/**
 * The master name of one version. `movements` is the families, keyed;
 * `bodyweightOnly` the set of family keys whose every version is bodyweight.
 */
export function masterName(x, movements, bodyweightOnly) {
  const family = movements[x.movement];
  const a = x.attributes || {};
  const details = ORDER.filter(key => {
    if (!a[key]) return false;
    if (key === "implement") {
      if (family.implementInName) return false;
      if (a.implement === "Bodyweight" && bodyweightOnly.has(x.movement)) return false;
    }
    return true;
  }).map(key => a[key]);
  return details.length ? `${family.label} — ${details.join(", ")}` : family.label;
}

/** The families whose every version is bodyweight. */
export function bodyweightFamilies(exercises) {
  const seen = new Map();
  for (const x of exercises) {
    const all = seen.get(x.movement) ?? true;
    seen.set(x.movement, all && x.attributes?.implement === "Bodyweight");
  }
  return new Set([...seen].filter(([, only]) => only).map(([key]) => key));
}

/** A master name as an id: lowercase words joined by hyphens. */
export const slug = (name) => name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
