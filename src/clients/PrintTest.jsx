import React from "react";
import { Printer } from "lucide-react";
import { TESTS, describe, changeOf, titleOf } from "../lib/fitness-tests";

/*
 * A fitness test result as it was sent in a message (MessagesTab), laid out
 * like the printed measurements: the test, the result, the rating where it
 * has one, the change since the one before, and how the test is done.
 * Black on white, whatever the screen's settings.
 */
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function PrintTest({ data }) {
  const units = data.units || "imperial";
  const d = describe(data, units);
  const c = changeOf(data, data.previous, units);
  const t = TESTS[data.kind];
  const row = (label, value) => (
    <tr style={{ borderBottom: "1px solid #d5dde3" }}>
      <td className="py-2 pr-3">{label}</td>
      <td className="py-2 text-right">{value}</td>
    </tr>
  );
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={{ color: "#5b6b78" }}>This is {data.clientName}&apos;s. Print it, or save it as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs cx-wordmark" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">{titleOf(data)}</h1>
      <div className="text-sm mt-1" style={{ color: "#5b6b78" }}>
        For {data.clientName} · {dateText(data.takenOn)}{data.takenBy ? ` · with ${data.takenBy}` : ""}
      </div>
      <table className="w-full text-sm mt-6 border-collapse">
        <tbody>
          {row("Result", <strong>{d.text}</strong>)}
          {d.rating && row("Rating", <strong>{d.rating}</strong>)}
          {d.detail && row(data.kind === "step" ? "Rated" : "Details", d.detail)}
          {c && row(`Since ${dateText(data.previous.takenOn)}`, `${c}${data.previous.rating && data.previous.rating !== data.rating ? ` (was ${data.previous.rating})` : ""}`)}
        </tbody>
      </table>
      <p className="text-sm mt-6" style={{ color: "#5b6b78" }}>{t.how}</p>
      {data.note && <p className="text-sm mt-2" style={{ color: "#5b6b78" }}>{data.note}</p>}
    </div>
  );
}
