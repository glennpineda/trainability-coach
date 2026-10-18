import React, { useEffect, useState } from "react";

/*
 * A small line chart of one number over time, for a client's measurements and
 * fitness tests (Glenn, 18 Oct 2026: "Go with 2", progress charts). Drawn the
 * way Studio's Events chart is (src/components/EventsChart.jsx there): an SVG
 * of polylines and gridlines rather than a chart library, numbers on the
 * gridlines that people count in, and a real button over every point, so
 * tapping one (or tabbing to it) reads its date and value out above the
 * chart. It opens on the latest, as Studio's opens on today.
 *
 * One line in the accent colour; a second (blood pressure's bottom number)
 * is dashed and named at its end, so colour is never what tells them apart.
 * The days are spaced by time, not evenly, since sets are taken weeks or
 * months apart. Up isn't good or bad here: a falling step-test heart rate is
 * fitter, a falling weight may or may not be.
 */

const W = 360, H = 180;
const DAY = 86400000;
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/* About four gridlines on steps of 1, 2, 2.5 or 5 times a power of ten,
   around the values rather than from zero: a weight drawn from 0 would be a
   flat line. */
export function niceRange(min, max) {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw);
  let lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  if (lo === hi) { lo -= step; hi += step; }
  return { lo, hi, step };
}

/**
 * `series`: [{ name, points: [{ date: "YYYY-MM-DD", value }] }], oldest
 * first, one value per day; a second series is dashed. `format(value)` is
 * how a value is said ("183.2 lb", "1:42"); `tick(value)` how a gridline is
 * labelled (the number alone). `label` names the chart for a screen reader.
 */
export function Trend({ series, format, tick = (v) => String(v), label }) {
  const days = [...new Set(series.flatMap(s => s.points.map(p => p.date)))].sort();
  const [picked, setPicked] = useState(days.length - 1);
  useEffect(() => { setPicked(days.length - 1); }, [days.length, days[days.length - 1]]);
  if (days.length < 2) return null;
  /* Room on the right for a second line's name. */
  const PAD = { top: 10, right: series.length > 1 ? 50 : 14, bottom: 26, left: 40 };
  const PLOT = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };

  const values = series.flatMap(s => s.points.map(p => p.value));
  const { lo, hi, step } = niceRange(Math.min(...values), Math.max(...values));
  const t0 = Date.parse(`${days[0]}T00:00:00Z`), t1 = Date.parse(`${days[days.length - 1]}T00:00:00Z`);
  const x = (d) => PAD.left + ((Date.parse(`${d}T00:00:00Z`) - t0) / Math.max(t1 - t0, DAY)) * PLOT.w;
  const y = (v) => PAD.top + PLOT.h - ((v - lo) / (hi - lo)) * PLOT.h;
  const lines = [];
  for (let v = lo; v <= hi + step / 1000; v += step) lines.push(Math.round(v * 1000) / 1000);

  const day = days[picked];
  const said = series.map(s => { const p = s.points.find(q => q.date === day); return p ? `${series.length > 1 ? `${s.name} ` : ""}${format(p.value)}` : null; }).filter(Boolean);

  /* Each point's button runs halfway to its neighbours, so close days still
     each get their own. */
  const xs = days.map(x);
  const edges = xs.map((v, i) => [i ? (xs[i - 1] + v) / 2 : v - 14, i < xs.length - 1 ? (v + xs[i + 1]) / 2 : v + 14]);

  return (
    /* No wider than a phone's: drawn to scale, a wider chart only makes its lettering bigger. */
    <div className="mt-2 rounded-lg p-2.5" style={{ background: "var(--chalk)", border: "1px solid var(--iron-line)", maxWidth: 520 }}>
      <div className="text-sm mb-1 tabular-nums" style={{ minHeight: "1.25rem" }} aria-live="polite">
        <span style={{ color: "var(--iron)" }}>{dateText(day)}: </span>{said.join(" · ")}
      </div>
      <div style={{ position: "relative" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ display: "block", overflow: "visible" }}>
          {lines.map(v => (
            <g key={v}>
              <line x1={PAD.left} x2={PAD.left + PLOT.w} y1={y(v)} y2={y(v)} stroke="var(--iron-line)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--iron)">{tick(v)}</text>
            </g>
          ))}
          <line x1={xs[picked]} x2={xs[picked]} y1={PAD.top} y2={PAD.top + PLOT.h} stroke="var(--iron-line)" strokeWidth="1" strokeDasharray="3 3" />
          {/* The first and last days, and the one being read. */}
          {[...new Set([0, days.length - 1, picked])].map(i => (
            <text key={i} x={xs[i]} y={H - 8} fontSize="11" fill={i === picked ? "var(--ink)" : "var(--iron)"}
              textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}>{shortDate(days[i])}</text>
          ))}
          {series.map((s, n) => (
            <g key={s.name} style={{ pointerEvents: "none" }}>
              <polyline fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                strokeDasharray={n ? "5 4" : undefined} points={s.points.map(p => `${x(p.date)},${y(p.value)}`).join(" ")} />
              {s.points.map(p => (
                <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={p.date === day ? 4.5 : 3}
                  fill={n ? "var(--chalk)" : "var(--accent)"} stroke="var(--accent)" strokeWidth={n ? 2 : 0} />
              ))}
              {series.length > 1 && s.points.length > 0 && (
                <text x={x(s.points[s.points.length - 1].date) + 6} y={y(s.points[s.points.length - 1].value) + 4}
                  fontSize="10" fill="var(--iron)">{s.name}</text>
              )}
            </g>
          ))}
        </svg>
        {days.map((d, i) => (
          <button key={d} type="button" aria-pressed={i === picked} onClick={() => setPicked(i)}
            aria-label={`${dateText(d)}: ${series.map(s => { const p = s.points.find(q => q.date === d); return p ? format(p.value) : null; }).filter(Boolean).join(", ")}`}
            className="absolute rounded-md cx-chart-hit"
            style={{ left: `${(edges[i][0] / W) * 100}%`, width: `${((edges[i][1] - edges[i][0]) / W) * 100}%`, top: `${(PAD.top / H) * 100}%`, height: `${(PLOT.h / H) * 100}%`, background: "transparent" }} />
        ))}
      </div>
    </div>
  );
}
