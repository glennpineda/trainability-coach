/**
 * A hexagon's softened corners, as Studio draws them (its src/lib/hexagon.js,
 * copied as it is): the drifting hexagons behind the app use it.
 */

/* Two decimals is plenty for a path in a 100-unit box, and keeps the d
   attribute readable. Declared above their caller so nothing in this file is
   referenced before it exists. */
const round = (n) => Number(n.toFixed(2));
const fmt = ([x, y]) => `${round(x)} ${round(y)}`;

/**
 * A closed path through `points`, with every corner rounded to `r`.
 *
 * Each corner is a quadratic curve whose control point is the original vertex,
 * so the curve leaves and rejoins the edges along their own direction — the
 * join is smooth rather than a visible seam where an arc was pasted in.
 *
 * `r` is clamped per corner to just under half the shorter of the two edges
 * meeting there. Without that, a radius wider than an edge makes neighbouring
 * corners overlap and the path folds through itself.
 */
export function roundedPath(points, r) {
  const n = points.length;
  const at = (i) => points[(i + n) % n];

  /* How far along the edge from `from` towards `to` the curve should start,
     and the unit vector pointing that way. */
  const toward = (from, to, distance) => {
    const dx = to[0] - from[0], dy = to[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    const d = Math.min(distance, len / 2 - 0.001);
    return [from[0] + (dx / len) * d, from[1] + (dy / len) * d];
  };

  let d = "";
  for (let i = 0; i < n; i++) {
    const prev = at(i - 1), here = at(i), next = at(i + 1);
    const start = toward(here, prev, r);   // where the incoming edge stops
    const end = toward(here, next, r);     // where the outgoing edge resumes

    d += i === 0 ? `M ${fmt(start)}` : ` L ${fmt(start)}`;
    d += ` Q ${fmt(here)} ${fmt(end)}`;
  }
  return `${d} Z`;
}
