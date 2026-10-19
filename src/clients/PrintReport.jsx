import React from "react";
import { Printer } from "lucide-react";
import { rowsOf } from "../lib/measures";
import { describe, changeOf, titleOf } from "../lib/fitness-tests";
import { ANGLES } from "../lib/progress-photos";

/*
 * A progress report as it was sent in a message (Run 1, I-13; Glenn, 19 Oct
 * 2026: "Progress report"): the client's measurements, each fitness test and
 * their progress photos on one page, each from the first to the latest, laid
 * out like the other printed sheets (PrintMeasurements, PrintTest,
 * PrintPhotos). Black on white, whatever the screen's settings.
 */
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function PrintReport({ data }) {
  const units = data.units || "imperial";
  const m = data.measurements;
  const rows = m ? rowsOf(m.latest.values, m.first?.values, units, { heightCm: data.heightCm, sex: data.sex }) : [];
  const sets = data.photos?.sets || [];
  const shown = ANGLES.filter(a => sets.length && sets.every(s => s.photos?.[a.key]));
  const muted = { color: "#5b6b78" };
  const line = { borderBottom: "1px solid #d5dde3" };
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={muted}>This is {data.clientName}&apos;s. Print it, or save it as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs cx-wordmark" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">Progress report</h1>
      <div className="text-sm mt-1" style={muted}>For {data.clientName} · {dateText(data.madeOn)}</div>

      {m && (
        <section className="mt-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-xl font-medium">Measurements</h2>
          <table className="w-full text-sm mt-2 border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #172A3A" }}>
                <th className="text-left py-1.5 pr-3"></th>
                <th className="text-right py-1.5 pr-3">{dateText(m.latest.takenOn)}</th>
                {m.first && <th className="text-right py-1.5">Since {dateText(m.first.takenOn)}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} style={line}>
                  <td className="py-2 pr-3">{r.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.text}</td>
                  {m.first && <td className="py-2 text-right tabular-nums" style={muted}>{r.change || ""}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.tests?.length > 0 && (
        <section className="mt-8" style={{ breakInside: "avoid" }}>
          <h2 className="text-xl font-medium">Fitness tests</h2>
          <table className="w-full text-sm mt-2 border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #172A3A" }}>
                <th className="text-left py-1.5 pr-3">Test</th>
                <th className="text-right py-1.5 pr-3">Latest</th>
                <th className="text-right py-1.5">Since the first</th>
              </tr>
            </thead>
            <tbody>
              {data.tests.map((t, i) => {
                const d = describe(t, units);
                const c = t.first ? changeOf(t, t.first, units) : null;
                return (
                  <tr key={i} style={line}>
                    <td className="py-2 pr-3">{titleOf(t)}<div className="text-xs" style={muted}>{dateText(t.takenOn)}</div></td>
                    <td className="py-2 pr-3 text-right"><strong>{d.text}</strong>{d.rating && <div className="text-xs">{d.rating}</div>}</td>
                    <td className="py-2 text-right tabular-nums" style={muted}>{c ? `${c}, since ${dateText(t.first.takenOn)}` : "Only one so far"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {data.photos?.hidden && (
        <section className="mt-8">
          <h2 className="text-xl font-medium">Progress photos</h2>
          <p className="text-sm mt-1" style={muted}>Hidden: {String(data.clientName || "the client").split(" ")[0]} no longer agrees to progress photos.</p>
        </section>
      )}
      {shown.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-medium">Progress photos</h2>
          <div className="text-sm" style={muted}>{sets.map(s => dateText(s.takenOn)).join(" and ")}</div>
          <div className="mt-3 grid gap-6">
            {shown.map(a => (
              <section key={a.key} style={{ breakInside: "avoid" }}>
                <h3 className="text-base font-medium mb-2">{a.label}</h3>
                <div className={`grid gap-3 ${sets.length > 1 ? "grid-cols-2" : "grid-cols-2 max-w-sm"}`}>
                  {sets.map(s => (
                    <figure key={s.takenOn}>
                      <img src={s.photos[a.key]} alt={`${a.label}, ${dateText(s.takenOn)}`} className="w-full rounded-lg object-cover" style={{ aspectRatio: "3 / 4" }} />
                      <figcaption className="text-xs mt-1 text-center" style={muted}>{dateText(s.takenOn)}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
