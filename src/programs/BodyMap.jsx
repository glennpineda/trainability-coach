import React from "react";

/*
 * What a day of a program works, on a drawing of a body (Glenn, 19 Oct 2026:
 * "visualize with a drawing of a body and colored spots (from lighter to
 * darker) what muscles a workout program is hitting", then, asked what makes
 * a spot darker, "Weekly sets, but show for each Day", then "So if it's
 * better with by exercises instead of weekly then let's do that"). Studio
 * has nothing like it.
 *
 * Each exercise counts one for the muscles it mainly works and a half for
 * the ones it also works (Coach IQ's library), whatever its sets, so the
 * drawing doesn't wait on sets being filled in. Every spot is the accent
 * colour, lighter to darker by that count; the scale is the program's
 * busiest muscle on any day (at least 2 exercises), so days can be compared
 * and one exercise isn't drawn as the most there is. Untouched muscles stay the
 * body's own grey. The numbers are beside the drawing, for anyone who
 * can't tell shades apart and for the pelvic floor, which can't be drawn.
 */

/** Exercises per muscle for a list of exercises: { muscle: count }. */
export function setsByMuscle(exercises) {
  const out = {};
  for (const e of exercises) {
    for (const m of e.primary || []) out[m] = (out[m] || 0) + 1;
    for (const m of e.secondary || []) if (!(e.primary || []).includes(m)) out[m] = (out[m] || 0) + 0.5;
  }
  return out;
}

/* The left half of each figure, in a 120 by 260 box with the body's middle
   at x 60; the right half is the same shapes mirrored. The body is one
   outline (Glenn, 19 Oct 2026: "more like a human shape rather than
   polygons"): head, neck, sloping shoulders, arms hanging a little away,
   the waist, the hips and the legs, from the top of the head down the left
   side to the foot and back up the inside of the leg to the middle. Each
   muscle is a curved shape lying on it where it is. */
const BODY = [
  "M60 4 C53 4 48.5 9 48.5 17 C48.5 24 51 29 54 31.5 L54 36",
  "C50 38.5 44 40 38 41.5 C31 43 27 47 26 54",
  "C25 62 24 70 24 78 C24 86 22 92 21.5 98 C20 108 19 120 19.5 132",
  "C19.6 138 18 142 17.5 147 C17 154 19 160 23 160 C27 160 28 155 27.5 150",
  "C27.5 144 28 138 29 132 C31 120 32 108 33 99 C34 92 35 84 36 76 C36.5 70 37.5 65 39 62",
  "C39.5 72 40 82 41 92 C41.5 102 40 110 39.5 118 C39 126 37 134 37 142",
  "C37 156 38.5 172 40 186 C41 194 41.5 200 41 206 C40 214 39.5 222 41 232",
  "C42 240 43 246 43.5 250 C41 252 38.5 254 39.5 257 L55 257",
  "C56 252 55.5 248 55 246 C55.5 238 56.5 226 56 216 C55.5 210 56 204 57 198 C58.5 184 59 166 60 148",
].join(" ");
const p = (d) => ({ el: "path", d });
const FRONT = {
  traps: [p("M54 36 C50 38.5 44 40 40 41.5 C43 43.5 47 43.5 50 42.5 C52.5 41.5 54 40 55 38.5 Z")],
  "front delts": [p("M39 42 C32 43 27.5 47 27 53 C27.5 58 29 61 31 63.5 C32.5 57 35.5 50 41 45 Z")],
  "side delts": [p("M30 44.5 C27 47.5 25.6 52 25.8 58 C26.3 61 27.3 62.5 28.3 62.5 C27.8 56 28.6 50 31.5 46 Z")],
  chest: [p("M59.5 45.5 C52 44.5 45 45 41.5 48 C39 54 39.5 61 42.5 66 C47 69.5 54 70 59.5 68 Z")],
  biceps: [p("M27.5 64 C25.8 71 25.8 81 27.2 89 C29 92.5 32 92.5 33.5 88.5 C35 80 35.6 72 34.2 66 C32.5 63 29.5 62 27.5 64 Z")],
  forearms: [p("M22.3 100 C20.8 110 20.6 122 21.2 131 C23.5 132.5 26.5 132.5 28.6 131 C30 121 31.4 110 32.2 100.5 C29 98.5 25.2 98.5 22.3 100 Z")],
  core: [p("M59.5 72 L53 73 C52.4 88 52.4 104 53.8 119 C55.6 123 57.8 125.5 59.5 126.5 Z")],
  obliques: [p("M42.3 76 C41.2 88 41.6 101 41 111 C43.8 115.5 47.8 117.5 51 117.5 C50.5 104 50.5 88 51.2 75 C48.2 73 44.6 73.8 42.3 76 Z")],
  "hip flexors": [p("M44.5 122 C46.5 128 49.5 134 53.5 140 L57.5 136.5 C55.5 130 52.5 125 48.5 121 Z")],
  abductors: [p("M38.6 128 C37.6 134 37.6 142 38.3 150 L41.6 146 C41.6 138 41.2 132 40.6 127 Z")],
  quads: [p("M40.6 150 C40 166 41 182 44 196 C47 199.5 52 199.5 54.3 196 C56.3 180 56.6 164 55.2 148 C51 144 45 144 40.6 150 Z")],
  adductors: [p("M55.6 146 C55.2 156 55.6 168 56.6 178 C57.9 170 58.8 158 59.5 147.5 Z")],
  tibialis: [p("M42.6 210 C42 220 42.6 232 44.2 242 L46.6 242 C47.1 230 47.1 218 46.1 208 Z")],
  calves: [p("M52.3 210 C54.8 218 55.2 228 53.7 238 C52.2 230 51.2 220 50.7 212 Z")],
};
const BACK = {
  traps: [p("M60 32 C56 36 50 39 43 42 C48 46 54 56 60 68 Z")],
  "rear delts": [p("M38 42.5 C31.5 43.5 27.5 47.5 27 53.5 C27.8 58 29.3 61 31.3 63 C33.2 56.5 36.2 50.5 41 46 Z")],
  "side delts": [p("M30 44.5 C27 47.5 25.6 52 25.8 58 C26.3 61 27.3 62.5 28.3 62.5 C27.8 56 28.6 50 31.5 46 Z")],
  "rotator cuff": [p("M44 49.5 C41.8 53.5 42.4 58 45 60 C48 61.2 51 59.3 52 56 C51 52 48 49.5 44 49.5 Z")],
  "upper back": [p("M53.5 54 C51.3 60 51.2 68 53.2 74 L59.5 76.5 L59.5 58 Z")],
  lats: [p("M42 62 C39 74 40 90 45 104 C49 108 54 106.5 56 100 C54 92 52 82 50 70 C47 64 44.2 61 42 62 Z")],
  "lower back": [p("M53.6 104 C53 112 53.6 120 55.2 126 L59.5 128 L59.5 104 Z")],
  triceps: [p("M26.8 62 C25.2 70 25.2 80 26.6 89 C28.6 92.5 31.6 92.5 33.1 88.5 C34.6 80 35.1 71 33.6 64 C31.2 61 28.6 60 26.8 62 Z")],
  forearms: [p("M22.3 100 C20.8 110 20.6 122 21.2 131 C23.5 132.5 26.5 132.5 28.6 131 C30 121 31.4 110 32.2 100.5 C29 98.5 25.2 98.5 22.3 100 Z")],
  abductors: [p("M39.6 124 C38.1 130 38.6 136 40.6 140 C44 136 47 131 48 126 C45 123 42 122 39.6 124 Z")],
  glutes: [p("M40 136 C38.5 146 40.5 156 46 160 C51 162.5 56 160.5 59.5 156 L59.5 132 C53 130 46 131 40 136 Z")],
  hamstrings: [p("M41 164 C40.5 178 42 190 45 198 C48 200.5 52 200.5 54.2 197 C56 186 56.6 174 56.1 162 C51 159.5 45 159.5 41 164 Z")],
  adductors: [p("M56.6 162 C56.6 172 57.6 180 58.6 186 C59.6 178 59.8 170 59.5 160 Z")],
  calves: [p("M41.6 206 C40 214 40.5 224 43 232 C45 236 49 236 51 232 C53 226 54.6 216 54.1 208 C50 204 45 204 41.6 206 Z")],
};

const shape = ({ el, ...a }, props, key) => React.createElement(el, { key, ...a, ...props });
const MIRROR = "translate(120 0) scale(-1 1)";

function Figure({ spots, sets, top, label, x }) {
  /* A worked muscle in the accent, with a thin edge of the card's colour so
     neighbours stay apart; one that isn't, only its faint outline, so the
     body still reads as muscles on a light day. */
  const tone = (m) => {
    const v = sets[m] || 0;
    return v
      ? { fill: "var(--accent)", fillOpacity: 0.22 + 0.78 * Math.min(1, v / top), stroke: "var(--chalk)", strokeWidth: 0.9 }
      : { fill: "none", stroke: "var(--iron-line)", strokeWidth: 0.7 };
  };
  return (
    <g transform={`translate(${x} 0)`}>
      {/* The body filled from both halves, edged in its own grey so the two
          meet without a seam, then its outline drawn open, so no line runs
          down the middle. */}
      <g fill="var(--ghost-fill)" stroke="var(--ghost-fill)" strokeWidth="1.2">
        <path d={`${BODY} Z`} />
        <path d={`${BODY} Z`} transform={MIRROR} />
      </g>
      <g fill="none" stroke="var(--iron-line)" strokeWidth="1.2" strokeLinejoin="round">
        <path d={BODY} />
        <path d={BODY} transform={MIRROR} />
      </g>
      {Object.entries(spots).map(([m, list]) => (
        <g key={m} {...tone(m)}>
          {list.map((s, i) => shape(s, {}, `l${i}`))}
          <g transform={MIRROR}>{list.map((s, i) => shape(s, {}, `r${i}`))}</g>
        </g>
      ))}
      <text x="60" y="272" textAnchor="middle" fontSize="11" fill="var(--iron)">{label}</text>
    </g>
  );
}

const nice = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const cap = (m) => m[0].toUpperCase() + m.slice(1);

/** One day's drawing and its numbers. `top` is the scale (exercises for the darkest spot). */
export function BodyMap({ exercises, top }) {
  const sets = setsByMuscle(exercises);
  const list = Object.entries(sets).sort((a, b) => b[1] - a[1]);
  if (!list.length) return null;
  const said = list.map(([m, v]) => `${cap(m)} ${nice(v)}`).join(", ");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 rounded-lg p-2.5" style={{ background: "var(--chalk)", border: "1px solid var(--iron-line)" }}>
      <svg viewBox="0 0 250 280" role="img" style={{ width: "100%", maxWidth: 220, height: "auto" }} aria-label={`Exercises this day by muscle: ${said}`} className="flex-none mx-auto sm:mx-0">
        <Figure spots={FRONT} sets={sets} top={top} label="Front" x={0} />
        <Figure spots={BACK} sets={sets} top={top} label="Back" x={130} />
      </svg>
      <div className="flex-1 text-xs" style={{ color: "var(--iron)", minWidth: "14rem" }}>
        <div className="font-medium mb-1" style={{ color: "var(--ink)" }}>Exercises this day, by muscle</div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ maxWidth: 280 }}>
          {list.map(([m, v]) => (
            <li key={m} className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: "var(--accent)", opacity: 0.22 + 0.78 * Math.min(1, v / top) }} aria-hidden="true" />
              <span className="truncate" style={{ color: "var(--ink)" }}>{cap(m)}</span>
              <span className="ml-auto tabular-nums">{nice(v)}</span>
            </li>
          ))}
        </ul>
        {/* What the numbers are (Glenn, 19 Oct 2026: "Explain more what the
            numbers by the muscle groups mean"). */}
        <p className="mt-1.5" style={{ maxWidth: 300 }}>
          Each number is how many of this day&apos;s exercises work that muscle: 1 for each that mainly works it, ½ for each that also works it. Darker means a higher number.
        </p>
      </div>
    </div>
  );
}

/** The scale for a program: its busiest muscle on any day, and at least 2 exercises. */
export const scaleOf = (days) => Math.max(2, ...days.map(d => Math.max(0, ...Object.values(setsByMuscle(d.exercises)))));
