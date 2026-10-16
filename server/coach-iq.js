/**
 * Coach IQ's exercise library: its words, its names, and what each exercise
 * needs (coach-iq/README.md, "Exercise names").
 *
 * Every exercise belongs to a family: a movement, such as Squat, Lunge or
 * Romanian Deadlift. A version is that movement with attributes, and its
 * master name is made from them, never typed: the movement first, then the
 * attributes in a fixed order (Glenn, 16 Oct 2026: "I'd go with C"; the
 * direction first and the attachment after the equipment, his answers in the
 * ideas audit):
 *
 *   Movement — direction, position, support, limbs, equipment, attachment,
 *              load, grip, velocity, plane
 *
 *   Lunge — Reverse, Dumbbell
 *   Pull-Up — Bodyweight, Supinated-Grip        (common name: Chin-up)
 *   Triceps Pushdown — Cable, Rope
 *
 * An attribute at its usual setting is left out: standing, both sides, a
 * straight bar, controlled. Velocity is named only where it differs from the
 * movement's usual ("name the velocity only when it differs from the
 * exercise's usual"), and the plane only where the movement does not already
 * say it. Equipment is always named, except Bodyweight in a family that is
 * only ever bodyweight, and where the movement's own name already says it
 * (Leg Press, Box Jump).
 *
 * How a set is done (a tempo, a pause, slow lowering, a partial range, the
 * weight) is the program's to say, not the exercise's name.
 *
 * Every id is permanent (ids.js): exr… for a version, exf… for a family.
 * Names may change; ids never do.
 */

export const ORDER = ["direction", "position", "support", "limbs", "implement", "attachment", "load", "grip", "velocity", "plane"];

/* The words each attribute may use. Adding one is fine; renaming one renames
   every exercise that uses it (the ids stay). */
export const WORDS = {
  direction: ["Forward", "Reverse", "Walking", "Lateral", "Curtsy", "Diagonal"],
  position: ["Seated", "Half-Kneeling", "Tall-Kneeling", "Kneeling", "Supine", "Prone", "Side-Lying", "Quadruped",
    "Hanging", "Bent-Over", "Split Stance", "Staggered Stance", "Narrow Stance", "Wide Stance", "Sumo Stance"],
  support: ["Bench", "Incline Bench", "Decline Bench", "Preacher Bench", "Box", "Wall", "Incline", "Feet-Elevated",
    "Rear-Foot-Elevated", "Deficit", "Parallel Bars", "Stability Ball"],
  limbs: ["Single-Arm", "Single-Leg", "Alternating"],
  implement: ["Bodyweight", "Dumbbell", "Kettlebell", "Barbell", "Trap Bar", "Landmine", "Smith Machine", "Machine",
    "Cable", "Band", "Suspension Trainer", "Medicine Ball", "Stability Ball", "Ab Wheel", "Sled", "Foam Roller",
    "Treadmill", "Stationary Bike", "Air Bike", "Elliptical", "Rowing Machine", "Stair Climber", "Ski Erg", "Plyo Box"],
  attachment: ["Rope", "V-Handle", "Single Handle", "Straight Bar", "EZ Bar", "Wide Bar", "Ankle Strap"],
  load: ["Goblet", "Front-Rack", "Overhead", "At Sides", "Farmer", "Suitcase", "Contralateral", "Assisted"],
  grip: ["Neutral-Grip", "Pronated-Grip", "Supinated-Grip", "Wide-Grip", "Close-Grip"],
  velocity: ["Explosive", "Ballistic", "Isometric", "Jumping"],
  plane: ["Sagittal", "Frontal", "Transverse"],
};

/* The movement patterns families belong to, in the order the review page lists
   them. Alternatives look in the family first, then in the pattern. */
export const PATTERNS = {
  "squat": "Squat", "hinge": "Hinge", "lunge": "Lunge and single leg",
  "push-horizontal": "Push, horizontal", "push-vertical": "Push, overhead",
  "pull-horizontal": "Pull, horizontal", "pull-vertical": "Pull, vertical",
  "carry": "Carry", "core-anti-extension": "Core: resisting arching", "core-anti-rotation": "Core: resisting twisting",
  "core-lateral": "Core: resisting bending sideways", "core-flexion": "Core: bending", "rotation": "Rotation",
  "isolation": "Single muscle", "plyometric": "Jumping and throwing", "conditioning": "Conditioning", "mobility": "Mobility",
};

/* Muscles, finer than before (ideas audit, 17): no "shoulders" (it is a
   joint); the delts by head; obliques, traps, abductors, rotator cuff,
   tibialis and pelvic floor of their own. */
export const MUSCLES = ["quads", "hamstrings", "glutes", "adductors", "abductors", "hip flexors", "calves", "tibialis",
  "chest", "front delts", "side delts", "rear delts", "rotator cuff", "lats", "upper back", "traps", "lower back",
  "biceps", "triceps", "forearms", "core", "obliques", "pelvic floor"];
export const JOINTS = ["neck", "shoulders", "elbows", "wrists", "upper-back", "lower-back", "hips", "knees", "ankles", "feet"];

/* Plain facts about an exercise. Which conditions call for care with which
   is Coach IQ's principles' to say, not this list's. */
export const FLAGS = {
  "high-impact": "jumping or running",
  "spinal-load": "a heavy load on the spine",
  "spinal-flexion": "rounding the spine",
  "spinal-rotation": "twisting the spine",
  "overhead": "arms overhead",
  "lying-on-back": "lying on the back",
  "lying-face-down": "lying face down",
  "inverted": "head below the heart",
  "balance": "a balance challenge",
  "breath-hold": "heavy bracing that tempts holding the breath",
  "floor-transfer": "getting down to the floor and up",
  "grip": "a hard grip",
};

/* Level is the skill and strength an exercise needs, whatever the weight
   (Glenn: "Skill and strength"). How hard it is on the body is told by its
   facts (high-impact and so on), not by its level. */
export const LEVELS = ["beginner", "intermediate", "advanced"];

/* How an exercise is counted; a version may take several, the first being
   the usual. A weight is in pounds unless written otherwise (Glenn: "Pounds
   (lb)"), and dumbbells and kettlebells are counted per hand. */
export const MEASURES = ["reps", "time", "distance", "calories"];

export const ORIGINS = ["starter", "book", "trainer"];
export const STATUSES = ["draft", "reviewed", "retired"];

/* The equipment checklist kind (server/equipment.js) each piece of equipment
   and each support needs. Worked out, never typed (ideas audit, 5). */
const IMPLEMENT_KIND = {
  "Dumbbell": "dumbbells", "Kettlebell": "kettlebells", "Barbell": "barbells", "Trap Bar": "barbells", "Landmine": "barbells",
  "Smith Machine": "machines", "Machine": "machines", "Cable": "cables", "Band": "bands", "Suspension Trainer": "suspension",
  "Medicine Ball": "medball", "Stability Ball": "stabilityball", "Ab Wheel": "mat", "Sled": "sled", "Foam Roller": "mat",
  "Treadmill": "cardio", "Stationary Bike": "cardio", "Air Bike": "cardio", "Elliptical": "cardio", "Rowing Machine": "cardio",
  "Stair Climber": "cardio", "Ski Erg": "cardio", "Plyo Box": "box",
};
const SUPPORT_NEEDS = {
  "Bench": ["bench"], "Incline Bench": ["bench"], "Decline Bench": ["bench"], "Preacher Bench": ["machines"],
  "Box": ["box"], "Deficit": ["box"], "Parallel Bars": ["machines"], "Stability Ball": ["stabilityball"],
};
const SUPPORT_ONE_OF = { "Incline": ["bench", "box"], "Feet-Elevated": ["bench", "box"], "Rear-Foot-Elevated": ["bench", "box"] };
const FREE = new Set(["Dumbbell", "Kettlebell", "Barbell", "Band", "Medicine Ball"]);

/**
 * What a version needs, from its attributes and its family: `needs` all of
 * these checklist kinds, and any one of `oneOf`.
 */
export function equipmentFor(x, family) {
  const a = x.attributes || {};
  const needs = new Set();
  const kind = IMPLEMENT_KIND[a.implement];
  if (kind) needs.add(kind);
  for (const k of SUPPORT_NEEDS[a.support] || []) needs.add(k);
  if (a.position === "Hanging") needs.add("pullup");
  /* Seated with a free weight wants something to sit on. */
  if (a.position === "Seated" && FREE.has(a.implement) && !a.support) needs.add("bench");
  /* What the family itself always needs, such as a pull-up bar, unless a
     machine does the job instead. */
  if (a.implement !== "Machine") for (const k of family.needs || []) needs.add(k);
  return { needs: [...needs], oneOf: SUPPORT_ONE_OF[a.support] || [] };
}

/** How a version is counted: its own list, or its family's, or reps. */
export const measureOf = (x, family) => x.measure || family.measure || ["reps"];

/** Whether its numbers are per side: one arm or leg, alternating, or a family that always is. */
export const perSideOf = (x, family) =>
  x.perSide ?? (["Single-Arm", "Single-Leg", "Alternating"].includes(x.attributes?.limbs) || !!family.perSide);

/** The families whose every version is bodyweight. */
export function bodyweightFamilies(exercises) {
  const seen = new Map();
  for (const x of exercises) {
    const all = seen.get(x.movement) ?? true;
    seen.set(x.movement, all && x.attributes?.implement === "Bodyweight");
  }
  return new Set([...seen].filter(([, only]) => only).map(([key]) => key));
}

/** The master name of one version. */
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

/**
 * A name as it is compared: lowercase, no hyphens or punctuation, plurals
 * made singular, so "Band-assisted pull-ups" and "band assisted pull up"
 * are the same name (ideas audit, 13).
 */
export const nameKey = (name) => String(name).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
  .split(" ").map(w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).join(" ");
