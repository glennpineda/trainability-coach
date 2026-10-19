import React, { useEffect, useState } from "react";
import { loadLine } from "../lib/one-rm";
import { Printer } from "lucide-react";
import { apiRequest } from "../lib/api";
import { useUnits } from "../hooks/useUnits";
import { labelsFor } from "./Designer";
import { techniqueText } from "../lib/techniques";
import { BodyMap, scaleOf } from "./BodyMap";
import { PrintMeasurements } from "../clients/PrintMeasurements";
import { PrintTest } from "../clients/PrintTest";
import { PrintPhotos } from "../clients/PrintPhotos";

/**
 * A program printed for the client (Glenn, 17 Oct 2026: "Printable for the
 * client"), at /print/program/<id>, opened from the designer in its own tab:
 * the program's name, who it is for, then each day's exercises in the
 * trainer's names for them, with whatever the trainer filled in, in their
 * units. Only the columns something was written in are printed. Nothing of
 * Coach IQ's check goes on it: that is for the trainer.
 */
/* `sent`, instead of `id`: a program as it was sent in a message, the copy
   kept with it (server/messages.js), in the units it was sent in. */
export function PrintProgram({ id, sent }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [ownUnits] = useUnits();
  useEffect(() => {
    if (sent) {
      apiRequest("GET", `/attachments/${sent}`)
        /* Measurements sent in a message print as their own sheet. */
        .then(a => (a.kind === "measurements" ? setP({ measurements: a.measurements }) : a.kind === "test" ? setP({ test: a.test }) : a.kind === "photos" ? setP({ photos: a.photos }) : setP({ ...a.program, days: (a.program?.days || []).map((d, i) => ({ ...d, id: i, exercises: d.exercises.map((e, j) => ({ ...e, id: j })) })) })))
        .catch(err => setError(err.status === 404 ? "That isn't something you sent." : err.message));
      return;
    }
    apiRequest("GET", `/programs/${id}`).then(setP).catch(err => setError(err.status === 404 ? "That program isn't one of yours." : err.message));
  }, [id, sent]);
  const units = (sent && p?.units) || ownUnits;
  useEffect(() => { if (p) document.title = p.measurements ? `Measurements · ${p.measurements.clientName}` : p.test ? `Fitness test · ${p.test.clientName}` : p.photos ? `Progress photos · ${p.photos.clientName}` : `${p.name} · ${p.clientName}`; }, [p]);

  if (!p) return <div className="cx-print p-8 text-sm">{error || "Loading…"}</div>;
  if (p.measurements) return <PrintMeasurements data={p.measurements} />;
  if (p.test) return <PrintTest data={p.test} />;
  if (p.photos) return <PrintPhotos data={p.photos} />;
  /* What each day works (BodyMap), on one scale for the program, in the
     printed page's own light colours whatever the screen's, and kept in
     colour when printed. */
  const bodyScale = scaleOf(p.days);
  const PAPER = { "--accent": "#007BA7", "--chalk": "#fff", "--ghost-fill": "#E7EEF3", "--iron-line": "#D5DEE5", "--iron": "#5b6b78", "--ink": "#172A3A",
    WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };
  const cols = [
    ["sets", "Sets"], ["reps", "Reps"], ["load", "Load"], ["effort", "Effort"], ["tempo", "Tempo"], ["restText", "Rest"], ["technique", "How"],
  ];
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={{ color: "#5b6b78" }}>This page is for {p.clientName}. Print it, or save it as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs cx-wordmark" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">{p.name}</h1>
      <div className="text-sm mt-1" style={{ color: "#5b6b78" }}>
        For {p.clientName} · {p.goalLabel} · {new Date(p.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
      </div>
      {p.notes && <p className="text-sm mt-3 whitespace-pre-wrap cx-wrap">{p.notes}</p>}
      {p.days.map(d => {
        const used = cols.filter(([k]) => d.exercises.some(e => e[k]));
        const labels = labelsFor(d.exercises);
        return (
          <section key={d.id} className="mt-8" style={{ breakInside: "avoid" }}>
            <h2 className="text-xl font-medium">{d.name}</h2>
            {d.notes && <p className="text-sm cx-wrap" style={{ color: "#5b6b78" }}>{d.notes}</p>}
            {d.exercises.length === 0 ? <p className="text-sm mt-2" style={{ color: "#5b6b78" }}>Nothing yet.</p> : (
              <table className="w-full text-sm mt-2 border-collapse">
                <thead>
                  <tr style={{ borderBottom: "2px solid #172A3A" }}>
                    <th className="text-left py-1.5 pr-2 w-8"></th>
                    <th className="text-left py-1.5 pr-3">Exercise</th>
                    {used.map(([k, label]) => <th key={k} className="text-left py-1.5 pr-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.exercises.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #d5dde3" }}>
                      <td className="py-2 pr-2 align-top font-semibold" style={{ color: "#007BA7" }}>{labels[i].label}</td>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">{e.name}</div>
                        {e.note && <div className="text-xs cx-wrap" style={{ color: "#5b6b78" }}>{e.note}</div>}
                      </td>
                      {used.map(([k]) => <td key={k} className="py-2 pr-3 align-top whitespace-nowrap">{k === "load" ? loadLine(e, units) : k === "technique" ? techniqueText(e) : e[k]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {labels.some(l => l.inPair) && <p className="text-xs mt-1" style={{ color: "#5b6b78" }}>Exercises sharing a number (3a, 3b) are done together, one after the other, before resting: two are a superset, three or more a giant set.</p>}
            {d.exercises.some(e => e.technique === "drop") && <p className="text-xs mt-1" style={{ color: "#5b6b78" }}>A drop set: lift to failure, then straight away about 20–30% lighter and on to failure again, with no rest between drops.</p>}
            {d.exercises.some(e => String(e.technique || "").startsWith("pyramid")) && <p className="text-xs mt-1" style={{ color: "#5b6b78" }}>A pyramid: the reps change each set, as written, and the weight with them, heavier for fewer reps and lighter for more.</p>}
            {/* What the day works (Glenn, 19 Oct 2026: "Go with 3"). A copy
                sent before the muscles were kept with it has none, and no drawing. */}
            {d.exercises.some(e => e.primary?.length) && <div style={PAPER}><BodyMap exercises={d.exercises} top={bodyScale} /></div>}
          </section>
        );
      })}
      {p.days.some(d => d.exercises.some(e => e.tempo)) && (
        <p className="text-xs mt-8" style={{ color: "#5b6b78" }}>Tempo is seconds for each part of a rep: lowering, pause, lifting, pause. X means as fast as you can.</p>
      )}
    </div>
  );
}
