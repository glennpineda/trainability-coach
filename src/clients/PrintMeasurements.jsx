import React from "react";
import { Printer } from "lucide-react";
import { rowsOf } from "../lib/measures";

/*
 * Measurements as they were sent in a message (MessagesTab), laid out like a
 * printed program (programs/PrintProgram.jsx): the day, each measurement in
 * the units they were sent in, and how it changed since the set before.
 * Black on white, whatever the screen's settings.
 */
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function PrintMeasurements({ data }) {
  const units = data.units || "imperial";
  const rows = rowsOf(data.values, data.previous?.values, units);
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={{ color: "#5b6b78" }}>These are {data.clientName}&apos;s. Print them, or save them as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs cx-wordmark" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">Measurements</h1>
      <div className="text-sm mt-1" style={{ color: "#5b6b78" }}>
        For {data.clientName} · {dateText(data.takenOn)}{data.takenBy ? ` · taken by ${data.takenBy}` : ""}
      </div>
      <table className="w-full text-sm mt-6 border-collapse">
        <thead>
          <tr style={{ borderBottom: "2px solid #172A3A" }}>
            <th className="text-left py-1.5 pr-3"></th>
            <th className="text-right py-1.5 pr-3">{dateText(data.takenOn)}</th>
            {data.previous && <th className="text-right py-1.5">Since {dateText(data.previous.takenOn)}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} style={{ borderBottom: "1px solid #d5dde3" }}>
              <td className="py-2 pr-3">{r.label}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.text}</td>
              {data.previous && <td className="py-2 text-right tabular-nums" style={{ color: "#5b6b78" }}>{r.change || ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {data.note && <p className="text-sm mt-4" style={{ color: "#5b6b78" }}>{data.note}</p>}
    </div>
  );
}
