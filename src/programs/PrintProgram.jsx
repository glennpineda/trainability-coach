import React, { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { apiRequest } from "../lib/api";
import { convertText } from "../lib/units";
import { useUnits } from "../hooks/useUnits";
import { labelsFor } from "./Designer";

/**
 * A program printed for the client (Glenn, 17 Oct 2026: "Printable for the
 * client"), at /print/program/<id>, opened from the designer in its own tab:
 * the program's name, who it is for, then each day's exercises in the
 * trainer's names for them, with whatever the trainer filled in, in their
 * units. Only the columns something was written in are printed. Nothing of
 * Coach IQ's check goes on it: that is for the trainer.
 */
export function PrintProgram({ id }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [units] = useUnits();
  useEffect(() => {
    apiRequest("GET", `/programs/${id}`).then(setP).catch(err => setError(err.status === 404 ? "That program isn't one of yours." : err.message));
  }, [id]);
  useEffect(() => { if (p) document.title = `${p.name} · ${p.clientName}`; }, [p]);

  if (!p) return <div className="cx-print p-8 text-sm">{error || "Loading…"}</div>;
  const cols = [
    ["sets", "Sets"], ["reps", "Reps"], ["load", "Load"], ["effort", "Effort"], ["tempo", "Tempo"], ["restText", "Rest"],
  ];
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={{ color: "#5b6b78" }}>This page is for {p.clientName}. Print it, or save it as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs tracking-widest font-semibold" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">{p.name}</h1>
      <div className="text-sm mt-1" style={{ color: "#5b6b78" }}>
        For {p.clientName} · {p.goalLabel} · {new Date(p.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
      </div>
      {p.notes && <p className="text-sm mt-3 whitespace-pre-wrap">{p.notes}</p>}
      {p.days.map(d => {
        const used = cols.filter(([k]) => d.exercises.some(e => e[k]));
        const labels = labelsFor(d.exercises);
        return (
          <section key={d.id} className="mt-8" style={{ breakInside: "avoid" }}>
            <h2 className="text-xl font-medium">{d.name}</h2>
            {d.notes && <p className="text-sm" style={{ color: "#5b6b78" }}>{d.notes}</p>}
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
                        {e.note && <div className="text-xs" style={{ color: "#5b6b78" }}>{e.note}</div>}
                      </td>
                      {used.map(([k]) => <td key={k} className="py-2 pr-3 align-top whitespace-nowrap">{k === "load" ? convertText(e[k], units) : e[k]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {labels.some(l => l.inPair) && <p className="text-xs mt-1" style={{ color: "#5b6b78" }}>Exercises sharing a number (3a, 3b) are done together, one after the other, before resting.</p>}
          </section>
        );
      })}
      {p.days.some(d => d.exercises.some(e => e.tempo)) && (
        <p className="text-xs mt-8" style={{ color: "#5b6b78" }}>Tempo is seconds for each part of a rep: lowering, pause, lifting, pause. X means as fast as you can.</p>
      )}
    </div>
  );
}
