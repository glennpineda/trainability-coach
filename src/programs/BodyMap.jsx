import React from "react";

/*
 * What a day of a program works, on a drawing of a body (Glenn, 19 Oct 2026:
 * "visualize with a drawing of a body and colored spots (from lighter to
 * darker) what muscles a workout program is hitting", then, asked what makes
 * a spot darker, "Weekly sets, but show for each Day"). Studio has nothing
 * like it.
 *
 * Each exercise's sets count fully for the muscles it mainly works and half
 * for the ones it also works (Coach IQ's library); with no sets filled in it
 * counts as one. A range counts its top ("2–3" is 3). Every spot is the
 * accent colour, lighter to darker by sets; the scale is the program's
 * busiest muscle on any day (at least 6 sets), so days can be compared and
 * one exercise isn't drawn as the most there is. Untouched muscles stay the
 * body's own grey. The numbers are beside the drawing, for anyone who
 * can't tell shades apart and for the pelvic floor, which can't be drawn.
 */

/** Sets per muscle for a list of exercises: { muscle: sets }. */
export function setsByMuscle(exercises) {
  const out = {};
  for (const e of exercises) {
    const nums = String(e.sets || "").match(/\d+(?:\.\d+)?/g);
    const sets = nums ? Math.max(...nums.map(Number)) : 1;
    for (const m of e.primary || []) out[m] = (out[m] || 0) + sets;
    for (const m of e.secondary || []) if (!(e.primary || []).includes(m)) out[m] = (out[m] || 0) + sets / 2;
  }
  return out;
}

/* The left half of each figure, in a 120 by 260 box with the body's middle
   at x 60; the right half is the same shapes mirrored. */
const SKIN = [
  { el: "ellipse", cx: 60, cy: 18, rx: 11, ry: 13, whole: true },
  { el: "rect", x: 55, y: 29, width: 10, height: 10, whole: true },
  { el: "path", d: "M60 38 L44 40 Q36 42 34 50 L36 108 Q38 124 38 140 L60 142 Z" },
  { el: "ellipse", cx: 35, cy: 51, rx: 9, ry: 10 },
  { el: "rect", x: 22, y: 54, width: 14, height: 46, rx: 7 },
  { el: "rect", x: 18, y: 96, width: 14, height: 48, rx: 6 },
  { el: "ellipse", cx: 24, cy: 151, rx: 6, ry: 8 },
  { el: "rect", x: 38, y: 132, width: 21, height: 76, rx: 10 },
  { el: "rect", x: 40, y: 200, width: 17, height: 50, rx: 8 },
  { el: "ellipse", cx: 47, cy: 253, rx: 8, ry: 4 },
];
const FRONT = {
  traps: [{ el: "ellipse", cx: 50, cy: 41, rx: 7, ry: 3 }],
  "front delts": [{ el: "ellipse", cx: 38, cy: 51, rx: 6, ry: 8 }],
  "side delts": [{ el: "ellipse", cx: 30, cy: 52, rx: 4, ry: 8 }],
  chest: [{ el: "path", d: "M59 47 L44 47 Q38 60 44 72 L59 74 Z" }],
  biceps: [{ el: "ellipse", cx: 29, cy: 75, rx: 5, ry: 16 }],
  forearms: [{ el: "ellipse", cx: 25, cy: 118, rx: 5, ry: 18 }],
  core: [{ el: "rect", x: 52.5, y: 78, width: 7.5, height: 42, rx: 3 }],
  obliques: [{ el: "ellipse", cx: 45, cy: 99, rx: 5, ry: 16 }],
  "hip flexors": [{ el: "ellipse", cx: 51, cy: 132, rx: 5, ry: 6 }],
  abductors: [{ el: "ellipse", cx: 40.5, cy: 145, rx: 2.5, ry: 9 }],
  quads: [{ el: "ellipse", cx: 47, cy: 170, rx: 7.5, ry: 25 }],
  adductors: [{ el: "ellipse", cx: 56, cy: 160, rx: 2.8, ry: 16 }],
  tibialis: [{ el: "ellipse", cx: 45, cy: 226, rx: 3.5, ry: 17 }],
  calves: [{ el: "ellipse", cx: 53, cy: 222, rx: 3, ry: 12 }],
};
const BACK = {
  traps: [{ el: "path", d: "M60 34 L45 43 L60 66 Z" }],
  "rear delts": [{ el: "ellipse", cx: 38, cy: 51, rx: 6, ry: 8 }],
  "side delts": [{ el: "ellipse", cx: 30, cy: 52, rx: 4, ry: 8 }],
  "rotator cuff": [{ el: "ellipse", cx: 47, cy: 56, rx: 5.5, ry: 5 }],
  "upper back": [{ el: "ellipse", cx: 55, cy: 64, rx: 4.5, ry: 9 }],
  lats: [{ el: "path", d: "M44 63 Q38 90 50 110 L57 104 L54 72 Z" }],
  "lower back": [{ el: "ellipse", cx: 56, cy: 118, rx: 3.5, ry: 12 }],
  triceps: [{ el: "ellipse", cx: 29, cy: 75, rx: 5, ry: 16 }],
  forearms: [{ el: "ellipse", cx: 25, cy: 118, rx: 5, ry: 18 }],
  abductors: [{ el: "ellipse", cx: 42, cy: 133, rx: 4, ry: 6 }],
  glutes: [{ el: "ellipse", cx: 50, cy: 144, rx: 9.5, ry: 11 }],
  hamstrings: [{ el: "ellipse", cx: 48, cy: 176, rx: 7.5, ry: 22 }],
  adductors: [{ el: "ellipse", cx: 56.5, cy: 163, rx: 2.5, ry: 12 }],
  calves: [{ el: "ellipse", cx: 48, cy: 222, rx: 6, ry: 15 }],
};

const shape = ({ el, whole, ...a }, props, key) => React.createElement(el, { key, ...a, ...props });
const MIRROR = "translate(120 0) scale(-1 1)";

function Figure({ spots, sets, top, label, x }) {
  const tone = (m) => {
    const v = sets[m] || 0;
    return v ? { fill: "var(--accent)", fillOpacity: 0.22 + 0.78 * Math.min(1, v / top) } : { fill: "none" };
  };
  return (
    <g transform={`translate(${x} 0)`}>
      <g fill="var(--ghost-fill)" stroke="var(--iron-line)" strokeWidth="1">
        {SKIN.map((s, i) => shape(s, {}, `l${i}`))}
        <g transform={MIRROR}>{SKIN.filter(s => !s.whole).map((s, i) => shape(s, {}, `r${i}`))}</g>
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

/** One day's drawing and its numbers. `top` is the scale (sets for the darkest spot). */
export function BodyMap({ exercises, top }) {
  const sets = setsByMuscle(exercises);
  const list = Object.entries(sets).sort((a, b) => b[1] - a[1]);
  if (!list.length) return null;
  const said = list.map(([m, v]) => `${cap(m)} ${nice(v)}`).join(", ");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 rounded-lg p-2.5" style={{ background: "var(--chalk)", border: "1px solid var(--iron-line)" }}>
      <svg viewBox="0 0 250 280" role="img" style={{ width: "100%", maxWidth: 220, height: "auto" }} aria-label={`Sets this day by muscle: ${said}`} className="flex-none mx-auto sm:mx-0">
        <Figure spots={FRONT} sets={sets} top={top} label="Front" x={0} />
        <Figure spots={BACK} sets={sets} top={top} label="Back" x={130} />
      </svg>
      <div className="flex-1 text-xs" style={{ color: "var(--iron)", minWidth: "14rem" }}>
        <div className="font-medium mb-1" style={{ color: "var(--ink)" }}>Sets this day, by muscle</div>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ maxWidth: 280 }}>
          {list.map(([m, v]) => (
            <li key={m} className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: "var(--accent)", opacity: 0.22 + 0.78 * Math.min(1, v / top) }} aria-hidden="true" />
              <span className="truncate" style={{ color: "var(--ink)" }}>{cap(m)}</span>
              <span className="ml-auto tabular-nums">{nice(v)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-1.5">Darker is more. Also works counts half.</div>
      </div>
    </div>
  );
}

/** The scale for a program: its busiest muscle on any day, and at least 6 sets. */
export const scaleOf = (days) => Math.max(6, ...days.map(d => Math.max(0, ...Object.values(setsByMuscle(d.exercises)))));
