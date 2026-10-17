import React, { useEffect, useState } from "react";
import { ChevronLeft, Info, Lightbulb, OctagonAlert, Search, TriangleAlert, X } from "lucide-react";
import { apiRequest } from "../lib/api";

/**
 * Adding an exercise to a day, or changing one, in a dialog of its own (Glenn,
 * 17 Oct 2026: "When adding a new exercise, have a dialog asking what
 * exercise, reps, sets, etc before adding it to program. Right now, the
 * exercise details is kind of hidden and not very helpful.").
 *
 *   1. Which exercise: found by any name the trainer uses, or picked from what
 *      Coach IQ suggests for the day.
 *   2. Its details: what it is (what it works, what it needs, its level),
 *      what Coach IQ says about it for this client and place before it goes
 *      in, and the sets, reps, load, effort, tempo, rest and note, started
 *      from Coach IQ's starting point; every one optional.
 *
 * `editing` is an exercise already on the day: the dialog opens at step 2
 * with what it has, and "Change exercise" swaps it.
 */

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };
const ICON = { stop: OctagonAlert, warn: TriangleAlert, note: Info };
const COLOR = { stop: "var(--ember)", warn: "#B7791F", note: "var(--iron)" };

const blank = { sets: "", reps: "", load: "", effort: "", tempo: "", rest: "", note: "", superset: false };

export function ExerciseDialog({ dayId, dayName, first, editing, suggested, onSave, onClose, busy, error }) {
  const [step, setStep] = useState(editing || suggested ? "details" : "pick");
  const [pick, setPick] = useState(editing ? { id: editing.exerciseId } : suggested ? { id: suggested.id } : null);
  const [info, setInfo] = useState(null);
  const [f, setF] = useState(() => (editing
    ? { sets: editing.sets || "", reps: editing.reps || "", load: editing.load || "", effort: editing.effort || "", tempo: editing.tempo || "", rest: editing.restText || "", note: editing.note || "", superset: !!editing.superset }
    : suggested ? { ...blank, sets: suggested.dose.sets || "", reps: suggested.dose.reps || "", rest: suggested.dose.restText || "" } : blank));
  const [touched, setTouched] = useState(!!editing || !!suggested);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* What the chosen exercise is, and what Coach IQ says about it here. A new
     pick starts from Coach IQ's starting point unless the trainer has
     already typed something. */
  useEffect(() => {
    if (!pick) { setInfo(null); return undefined; }
    let alive = true;
    setInfo(null);
    apiRequest("GET", `/program-days/${dayId}/preview?exercise=${encodeURIComponent(pick.id)}`)
      .then(o => {
        if (!alive) return;
        setInfo(o);
        if (!touched) setF(d => ({ ...d, sets: o.dose.sets || "", reps: o.dose.reps || "", rest: o.dose.restText || "" }));
      })
      .catch(() => alive && setInfo({ failed: true }));
    return () => { alive = false; };
  }, [pick, dayId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => { setTouched(true); setF(d => ({ ...d, [k]: e.target.value })); };
  const choose = (x) => { setPick({ id: x.id }); setStep("details"); };
  const save = (e) => { e.preventDefault(); onSave({ exerciseId: pick.id, ...f }); };
  const startingPoint = () => { if (info?.dose) setF(d => ({ ...d, sets: info.dose.sets || "", reps: info.dose.reps || "", rest: info.dose.restText || "" })); };

  const field = (k, label, placeholder, hint, max = 60) => (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input className="cx-input" value={f[k]} maxLength={max} placeholder={placeholder} onChange={set(k)} />
      {hint && <span className="text-xs" style={muted}>{hint}</span>}
    </label>
  );
  const x = info?.exercise;

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="dialog" aria-modal="true" aria-label={editing ? "Change an exercise" : `Add an exercise to ${dayName}`}
        className="cx-card w-full sm:max-w-lg flex flex-col" style={{ maxHeight: "92dvh", color: "var(--ink)" }}>
        <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
          <h2 className="cx-display text-lg">{editing ? "Change the exercise" : `Add an exercise to ${dayName}`}</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close" title="Close"><X size={18} aria-hidden="true" /></button>
        </div>

        {step === "pick" ? (
          <Pick dayId={dayId} onPick={choose} onBack={pick ? () => setStep("details") : null} />
        ) : (
          <form onSubmit={save} className="flex flex-col min-h-0">
            <div className="overflow-y-auto px-4 pb-3 grid gap-4" style={{ overscrollBehavior: "contain" }}>
              {/* What it is. */}
              <div className="rounded-xl p-3" style={{ background: "var(--ghost-fill)" }}>
                {!info ? <p className="text-sm" style={muted}>Loading…</p> : info.failed ? <p className="text-sm" style={{ color: "var(--ember)" }}>That exercise couldn't be loaded.</p> : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold">{x.name}</div>
                        {x.libraryName && x.libraryName !== x.name && <div className="text-xs" style={muted}>{x.libraryName}</div>}
                        {x.master && <div className="text-xs" style={muted}>{x.master}</div>}
                      </div>
                      <button type="button" className="text-sm cx-link flex-none" onClick={() => setStep("pick")}><Search size={14} aria-hidden="true" /> Change exercise</button>
                    </div>
                    <div className="grid gap-0.5 text-sm mt-2">
                      {x.level && <div><span style={muted}>Level: </span>{x.level}</div>}
                      {x.primary?.length > 0 && <div><span style={muted}>Works: </span>{x.primary.join(", ")}{x.secondary?.length ? `; also ${x.secondary.join(", ")}` : ""}</div>}
                      <div><span style={muted}>Needs: </span>{[...(x.needs || []), ...(x.needsOneOf ? [x.needsOneOf.join(" or ")] : []), ...(x.piece ? [x.piece] : [])].join(", ") || "nothing"}</div>
                      {x.own && <div style={muted}>Your own exercise{x.note ? `: ${x.note}` : ""}</div>}
                    </div>
                    {info.points.length > 0 && (
                      <ul className="grid gap-1 mt-2 pt-2 border-t" style={line}>
                        {info.points.map((p, i) => {
                          const Icon = ICON[p.level];
                          return (
                            <li key={i} className="flex gap-2 text-sm">
                              <Icon size={15} className="flex-none mt-0.5" style={{ color: COLOR[p.level] }} aria-label={p.level === "stop" ? "Stop" : p.level === "warn" ? "Take care" : "Note"} />
                              <span>{p.text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* How it is done. All optional (Glenn: "what exercise to do is the most important part"). */}
              <div className="grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-medium">How it's done <span className="font-normal" style={muted}>(all optional)</span></div>
                  {info?.dose && (info.dose.sets || info.dose.reps) && (
                    <button type="button" className="text-sm cx-link" onClick={startingPoint}>
                      <Lightbulb size={14} aria-hidden="true" /> Coach IQ's starting point
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {field("sets", "Sets", "3", "Or a range, such as 1–3.", 20)}
                  {field("reps", "Reps", "8–12, or 30 s", "Or a time, or each side.", 40)}
                  {field("load", "Load", "45 lb", "In your units.")}
                  {field("effort", "Effort", "2 in reserve", "Or RPE 7.")}
                  {field("tempo", "Tempo", "3-1-1-0", "Down, pause, up, pause.", 20)}
                  {field("rest", "Rest", "90 s, or 2 min", "Between sets.", 20)}
                </div>
                {field("note", "Note", "Anything to remember, such as a cue", null, 300)}
                {!first && (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={f.superset} onChange={e => { setTouched(true); setF(d => ({ ...d, superset: e.target.checked })); }} />
                    Done together with the exercise above (a superset)
                  </label>
                )}
              </div>
              {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
            </div>
            <div className="p-4 border-t flex items-center gap-2" style={line}>
              <button type="submit" className="cx-btn-primary px-5 py-2 text-sm flex-1 sm:flex-none" disabled={busy || !pick || !info || info.failed}>
                {editing ? "Save" : `Add to ${dayName}`}
              </button>
              <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* Step 1: by name, or from what Coach IQ suggests for the day. */
function Pick({ dayId, onPick, onBack }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  const [next, setNext] = useState(null);
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/program-days/${dayId}/suggestions`).then(o => alive && setNext(o)).catch(() => alive && setNext({ suggestions: [] }));
    return () => { alive = false; };
  }, [dayId]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      apiRequest("GET", `/programs-find?q=${encodeURIComponent(q.trim())}`)
        .then(({ found: list }) => { if (alive) setFound(list); })
        .catch(() => { if (alive) setFound([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  const row = (x, sub) => (
    <li key={x.id} className="border-t first:border-t-0" style={line}>
      <button type="button" onClick={() => onPick(x)} className="w-full text-left px-3 py-2.5 hover:bg-(--ghost-fill)">
        <span className="block text-sm font-medium">{x.theirName || x.name}</span>
        <span className="block text-xs" style={muted}>{sub}</span>
      </button>
    </li>
  );
  return (
    <div className="overflow-y-auto px-4 pb-4 grid gap-3" style={{ overscrollBehavior: "contain" }}>
      {onBack && <button type="button" className="text-sm cx-quiet justify-self-start inline-flex items-center gap-1" onClick={onBack}><ChevronLeft size={15} aria-hidden="true" /> Back</button>}
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Which exercise?</span>
        <span className="flex items-center gap-2">
          <Search size={16} style={muted} aria-hidden="true" />
          <input className="cx-input" autoFocus value={q} maxLength={120} placeholder="Any name you use for it" onChange={e => setQ(e.target.value)} />
        </span>
      </label>
      {found ? (found.length === 0 ? <p className="text-sm" style={muted}>Nothing by that name. Try another word, or add it on My exercises.</p> : (
        <ul className="rounded-lg overflow-hidden border" style={line}>
          {found.map(x => row(x, x.theirOwnExercise ? "Your own exercise" : `${x.master}${x.level ? ` · ${x.level}` : ""}`))}
        </ul>
      )) : next?.suggestions?.length > 0 && (
        <div className="grid gap-1.5">
          <div className="text-xs font-medium inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
            <Lightbulb size={13} aria-hidden="true" /> Coach IQ suggests{next.day ? ` for a ${next.day.toLowerCase()} day` : ""}
          </div>
          <ul className="rounded-lg overflow-hidden border" style={line}>
            {next.suggestions.map(s => row(s, `${s.level} · ${s.why}`))}
          </ul>
        </div>
      )}
    </div>
  );
}
