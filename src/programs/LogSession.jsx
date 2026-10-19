import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { todayIso } from "../lib/date";
import { plannedOf, setsToFill, kgFrom, shownWeight, entryText, MAX_SETS } from "../lib/workout-log";

/**
 * Logging a session (Run 1, I-14; Glenn, 19 Oct 2026: "Tick, open for
 * sets"): one day of a program as it was done. Each exercise starts as one
 * ticked line, done as planned; untick it if it wasn't done, or open it to
 * write each set as it went (filled in from the plan). A note on any
 * exercise and on the session. Every trainer of the client sees it.
 *
 *   program        the program, as the designer has it (programs.full)
 *   day            one of its days, or null to ask which (from Today)
 *   existing       a logged session being changed, or null for a new one
 *   appointmentId  the Studio session it was opened from on Today, and
 *   date           that session's day (Glenn, 19 Oct 2026: "Log from Today")
 */
export function LogSession(props) {
  const { program, onClose } = props;
  const days = program.days.filter(d => d.exercises.length > 0);
  const [day, setDay] = useState(props.day || (days.length === 1 ? days[0] : null));
  if (day) return <LogForm {...props} day={day} />;
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="dialog" aria-modal="true" aria-label="Which day was it?" className="cx-card w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "92dvh", color: "var(--ink)" }}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="cx-display text-lg">Which day was it?</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close" title="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="overflow-y-auto px-4 pb-4 grid gap-2">
          <p className="text-sm" style={{ color: "var(--iron)" }}>{program.name}: choose the day of the program you trained.</p>
          {days.length === 0 ? <p className="text-sm" style={{ color: "var(--iron)" }}>This program has no exercises yet.</p>
            : days.map(d => (
              <button key={d.id} type="button" className="w-full text-left rounded-lg p-3" style={{ background: "var(--ghost-fill)" }} onClick={() => setDay(d)}>
                <span className="block text-sm font-medium">{d.name}</span>
                <span className="block text-xs" style={{ color: "var(--iron)" }}>{d.exercises.map(e => e.name).join(", ")}</span>
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LogForm({ program, day, existing = null, units = "imperial", appointmentId = null, date = null, onClose, onSaved }) {
  const first = (program.clientName || "").split(" ")[0] || "the client";
  const was = new Map((existing?.entries || []).map(e => [e.peId, e]));
  const [doneOn, setDoneOn] = useState(existing?.doneOn || date || todayIso());
  const [note, setNote] = useState(existing?.note || "");
  const [rows, setRows] = useState(() => day.exercises.map(e => {
    const old = was.get(e.id);
    const planned = old?.planned || plannedOf(e);
    return {
      e, planned, done: old ? old.done : true, note: old?.note || "", noting: !!old?.note,
      open: !!old?.sets?.length,
      sets: (old?.sets?.length ? old.sets : setsToFill(planned)).map(s => ({ reps: s.reps == null ? "" : String(s.reps), weight: shownWeight(s.weightKg, units) })),
    };
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (i, patch) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setSet = (i, k, patch) => setRows(rs => rs.map((r, j) => (j === i ? { ...r, sets: r.sets.map((s, n) => (n === k ? { ...s, ...patch } : s)) } : r)));
  const unit = units === "metric" ? "kg" : "lb";

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const entries = rows.map(r => ({
      peId: r.e.id, done: r.done, note: r.note,
      sets: r.done && r.open ? r.sets.map(s => ({ reps: s.reps === "" ? null : Number(s.reps), weightKg: kgFrom(s.weight, units) })) : null,
    }));
    try {
      const body = { programId: program.id, dayId: day.id, doneOn, note, units, entries, ...(appointmentId ? { appointmentId } : {}) };
      const out = existing ? await apiRequest("PUT", `/sessions/${existing.id}`, body) : await apiRequest("POST", `/clients/${program.clientId}/sessions`, body);
      onSaved?.(out);
    } catch (err) {
      setError(err.message || "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const muted = { color: "var(--iron)" };
  /* Sent to the page's body, as every other dialog is (ExerciseDialog). */
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <form role="dialog" aria-modal="true" aria-label={`Log ${day.name}`} onSubmit={save}
        className="cx-card w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "92dvh", color: "var(--ink)" }}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="cx-display text-lg">{existing ? "Change the session" : `Log ${day.name}`}</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close" title="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <div className="overflow-y-auto px-4 pb-2 grid gap-3">
          <p className="text-sm" style={muted}>
            {program.name} · {first}. Each exercise is ticked as done as planned; untick one that wasn&apos;t done, or tap it to write each set as it went.
          </p>
          <label className="grid gap-1 text-xs" style={muted}>Day of the session
            <input type="date" className="cx-input" style={{ color: "var(--ink)" }} max={todayIso()} value={doneOn} onChange={e => setDoneOn(e.target.value)} />
          </label>
          <ul className="grid gap-2">
            {rows.map((r, i) => (
              <li key={r.e.id} className="rounded-lg p-2.5" style={{ background: "var(--ghost-fill)" }}>
                <div className="flex items-start gap-2.5">
                  <button type="button" role="checkbox" aria-checked={r.done} aria-label={`${r.e.name}: done`} onClick={() => set(i, { done: !r.done })}
                    className="flex-none mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border"
                    style={r.done ? { background: "var(--fill-cerulean)", borderColor: "var(--fill-cerulean)" } : { background: "var(--chalk)", borderColor: "var(--iron)" }}>
                    {r.done && <Check size={15} strokeWidth={3} style={{ color: "#fff" }} aria-hidden="true" />}
                  </button>
                  <button type="button" className="flex-1 min-w-0 text-left" aria-expanded={r.open} disabled={!r.done}
                    onClick={() => set(i, { open: !r.open })}>
                    <span className="block text-sm font-medium" style={r.done ? undefined : { color: "var(--iron)", textDecoration: "line-through" }}>{r.e.name}</span>
                    <span className="block text-xs" style={muted}>
                      {!r.done ? "Not done" : r.open ? "Set by set" : entryText({ done: true, planned: r.planned, sets: null }, units)}
                    </span>
                  </button>
                  {r.done && <ChevronDown size={16} className="flex-none mt-1" style={{ ...muted, transform: r.open ? "rotate(180deg)" : undefined }} aria-hidden="true" />}
                </div>
                {r.done && r.open && (
                  <div className="mt-2 grid gap-1.5">
                    {r.sets.map((s, k) => (
                      <div key={k} className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-2 text-xs" style={muted}>
                        <span>Set {k + 1}</span>
                        <label className="relative">
                          <input type="text" inputMode="numeric" className="cx-input text-sm" style={{ color: "var(--ink)", paddingRight: "2.6rem" }}
                            value={s.reps} onChange={e => setSet(i, k, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })} aria-label={`${r.e.name}, set ${k + 1}, reps`} />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">reps</span>
                        </label>
                        <label className="relative">
                          <input type="text" inputMode="decimal" className="cx-input text-sm" style={{ color: "var(--ink)", paddingRight: "2rem" }}
                            value={s.weight} onChange={e => setSet(i, k, { weight: e.target.value.slice(0, 6) })} aria-label={`${r.e.name}, set ${k + 1}, weight in ${unit}`} />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">{unit}</span>
                        </label>
                        <button type="button" className="cx-icon-btn" aria-label={`Take off set ${k + 1}`} title="Take off" disabled={r.sets.length === 1}
                          onClick={() => set(i, { sets: r.sets.filter((_, n) => n !== k) })}><X size={14} aria-hidden="true" /></button>
                      </div>
                    ))}
                    {r.sets.length < MAX_SETS && (
                      <button type="button" className="cx-link text-xs justify-self-start" onClick={() => set(i, { sets: [...r.sets, { ...r.sets[r.sets.length - 1] }] })}>
                        <Plus size={13} aria-hidden="true" /> Another set
                      </button>
                    )}
                  </div>
                )}
                {r.noting ? (
                  <input className="cx-input text-sm mt-2" style={{ color: "var(--ink)" }} maxLength={300} value={r.note} placeholder="Such as: knee felt fine, go heavier"
                    onChange={e => set(i, { note: e.target.value })} aria-label={`${r.e.name}, note`} />
                ) : (
                  <button type="button" className="cx-link text-xs mt-1" onClick={() => set(i, { noting: true })}>Add a note</button>
                )}
              </li>
            ))}
          </ul>
          <label className="grid gap-1 text-xs" style={muted}>Note on the session (optional)
            <textarea className="cx-input text-sm" rows={2} maxLength={1000} style={{ color: "var(--ink)" }} value={note}
              placeholder="Such as: tired today, slept badly" onChange={e => setNote(e.target.value)} />
          </label>
        </div>
        <div className="px-4 pt-2 pb-4 grid gap-2 border-t" style={{ borderColor: "var(--iron-line)" }}>
          {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save the session"}</button>
            <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
