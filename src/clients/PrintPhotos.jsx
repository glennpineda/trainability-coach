import React from "react";
import { Printer } from "lucide-react";
import { ANGLES } from "../lib/progress-photos";
import { PhotoCompare } from "./PhotoCompare";

/*
 * Progress photos as they were sent in a message (MessagesTab), laid out
 * like the printed measurements: one day's four, or two days compared, the
 * earlier on the left, angle by angle, with the slider above them on screen.
 * Black on white, whatever the screen's settings.
 */
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

export function PrintPhotos({ data }) {
  const sets = data.sets || [];
  const two = sets.length > 1;
  const shown = ANGLES.filter(a => sets.every(s => s.photos?.[a.key]) || (!two && sets[0]?.photos?.[a.key]));
  return (
    <div className="cx-print mx-auto max-w-3xl p-6 sm:p-10" style={{ background: "#fff", color: "#172A3A", minHeight: "100dvh" }}>
      <div className="cx-noprint flex items-center justify-between gap-3 mb-6">
        <span className="text-sm" style={{ color: "#5b6b78" }}>These are {data.clientName}&apos;s. Print them, or save them as a PDF.</span>
        <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" onClick={() => window.print()}>
          <Printer size={16} aria-hidden="true" /> Print
        </button>
      </div>
      <div className="text-xs cx-wordmark" style={{ color: "#007BA7" }}>TRAINABILITY® COACH</div>
      <h1 className="text-3xl font-medium mt-1">Progress photos</h1>
      <div className="text-sm mt-1" style={{ color: "#5b6b78" }}>
        For {data.clientName} · {sets.map(s => dateText(s.takenOn)).join(" and ")}
      </div>
      {two && (
        <div className="cx-noprint mt-6">
          <PhotoCompare a={sets[0]} b={sets[1]} light />
        </div>
      )}
      {two && <h2 className="text-lg font-medium mt-8 cx-noprint">Every angle</h2>}
      <div className={two ? "mt-3 grid gap-6" : "mt-6 grid grid-cols-2 gap-4"}>
        {shown.map(a => (two ? (
          <section key={a.key} style={{ breakInside: "avoid" }}>
            <h2 className="text-base font-medium mb-2">{a.label}</h2>
            <div className="grid grid-cols-2 gap-3">
              {sets.map(s => (
                <figure key={s.takenOn}>
                  <img src={s.photos[a.key]} alt={`${a.label}, ${dateText(s.takenOn)}`} className="w-full rounded-lg object-cover" style={{ aspectRatio: "3 / 4" }} />
                  <figcaption className="text-xs mt-1 text-center" style={{ color: "#5b6b78" }}>{dateText(s.takenOn)}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : (
          <figure key={a.key} style={{ breakInside: "avoid" }}>
            <img src={sets[0].photos[a.key]} alt={a.label} className="w-full rounded-lg object-cover" style={{ aspectRatio: "3 / 4" }} />
            <figcaption className="text-sm mt-1 text-center">{a.label}</figcaption>
          </figure>
        )))}
      </div>
    </div>
  );
}
