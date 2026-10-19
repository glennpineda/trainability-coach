import React, { useState } from "react";
import { ANGLES } from "../lib/progress-photos";

/*
 * Two days' progress photos of one angle, to compare ("Compare afterwards"):
 * side by side, or one over the other with a slider wiping between them.
 * Earlier on the left, as time reads. Used on the client's details and on a
 * sent message's page. `a` and `b` are sets, `{ takenOn, photos: { angle:
 * url } }`; only angles both have are offered.
 */

const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export function PhotoCompare({ a, b, light = false }) {
  const shared = ANGLES.filter(x => a.photos[x.key] && b.photos[x.key]);
  const [angle, setAngle] = useState(shared[0]?.key);
  const [mode, setMode] = useState("side");
  const [at, setAt] = useState(50);
  const ink = light ? { color: "#5b6b78" } : { color: "var(--iron)" };
  if (!shared.length) return <p className="text-sm" style={ink}>These two days have no angle in common.</p>;
  const chip = (on) => (on ? { background: "var(--fill-cerulean, #007BA7)", color: "#fff", borderColor: "var(--fill-cerulean, #007BA7)" }
    : { background: light ? "#fff" : "var(--chalk)", color: light ? "#172A3A" : "var(--ink)", borderColor: light ? "#d5dde3" : "var(--iron-line)" });
  const pic = (set, label) => (
    <figure className="min-w-0">
      <img src={set.photos[angle]} alt={`${ANGLES.find(x => x.key === angle).label}, ${dateText(set.takenOn)}`} className="w-full rounded-lg object-cover" style={{ aspectRatio: "3 / 4" }} />
      <figcaption className="text-xs mt-1 text-center" style={ink}>{label}</figcaption>
    </figure>
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2 cx-noprint">
        {shared.map(x => (
          <button key={x.key} type="button" aria-pressed={angle === x.key} onClick={() => setAngle(x.key)} className="text-xs px-2.5 py-1 rounded-full border" style={chip(angle === x.key)}>{x.label}</button>
        ))}
        <span className="flex-1" />
        <span className="inline-flex rounded-full border overflow-hidden text-xs" style={{ borderColor: light ? "#d5dde3" : "var(--iron-line)" }} role="group" aria-label="How to compare">
          {[["side", "Side by side"], ["slider", "Slider"]].map(([k, t]) => (
            <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)} className="px-2.5 py-1" style={chip(mode === k)}>{t}</button>
          ))}
        </span>
      </div>
      {mode === "side" ? (
        <div className="grid grid-cols-2 gap-2" style={{ maxWidth: 560 }}>
          {pic(a, dateText(a.takenOn))}
          {pic(b, dateText(b.takenOn))}
        </div>
      ) : (
        <div style={{ maxWidth: 360 }}>
          <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "3 / 4" }}>
            <img src={b.photos[angle]} alt={`${dateText(b.takenOn)}`} className="absolute inset-0 w-full h-full object-cover" />
            <img src={a.photos[angle]} alt={`${dateText(a.takenOn)}`} className="absolute inset-0 w-full h-full object-cover" style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }} />
            <div className="absolute inset-y-0 w-0.5" style={{ left: `${at}%`, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }} aria-hidden="true" />
          </div>
          <div className="flex justify-between text-xs mt-1" style={ink}><span>{dateText(a.takenOn)}</span><span>{dateText(b.takenOn)}</span></div>
          <input type="range" min="0" max="100" value={at} onChange={e => setAt(Number(e.target.value))} className="w-full" aria-label={`Slide between ${dateText(a.takenOn)} and ${dateText(b.takenOn)}`} />
        </div>
      )}
    </div>
  );
}
