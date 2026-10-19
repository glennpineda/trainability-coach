import React, { useCallback, useEffect, useState } from "react";
import { BodyMap, scaleOf } from "./BodyMap";
import { loadLine } from "../lib/one-rm";
import {
  ArrowDown, ArrowUp, ChevronLeft, Link2, Lightbulb, OctagonAlert, Pencil, Plus, Printer, Repeat, Sparkles, Trash2, TriangleAlert, Info, X,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { useUnits } from "../hooks/useUnits";
import { ExerciseDialog } from "./ExerciseDialog";

/**
 * The program designer (Glenn, 17 Oct 2026: "Go"): one program, day by day,
 * exercise by exercise, with Coach IQ beside it at every step (server/
 * programs.js). Under each day, what could come next, already fitted to the
 * place, the client's level and limitations, with a starting dose to take or
 * leave; under each exercise, what Coach IQ's check says about it, naming the
 * principle or rule it comes from; Swap for alternatives; and Billy, asked
 * about the program or a day, in his panel. Only the exercise is needed: the
 * rest is the trainer's to fill in or not.
 */

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };
const LEVEL_ICON = { stop: OctagonAlert, warn: TriangleAlert, note: Info };
const LEVEL_COLOR = { stop: "var(--ember)", warn: "#B7791F", note: "var(--iron)" };
const FROM = {
  equipment: "The place's equipment", limitations: "The client's limitations", library: "Coach IQ's library",
  reps: "Principles: Reps", sets: "Principles: Sets", rest: "Principles: Rest", tempo: "Principles: Tempo",
  "starting-out": "Principles: Starting out", "frequency-and-variety": "Principles: How often",
  progression: "The client's earlier programs", "one-rm": "The client's 1RM",
};

/* "3 × 8–12 · 45 lb · RPE 7 · 3-1-1-0 · rest 75 s": what is filled in, in the reader's units. */
export function doseLine(e, units) {
  const parts = [];
  if (e.sets && e.reps) parts.push(`${e.sets} × ${e.reps}`);
  else if (e.sets) parts.push(`${e.sets} sets`);
  else if (e.reps) parts.push(`${e.reps} reps`);
  if (e.load) parts.push(loadLine(e, units));
  if (e.effort) parts.push(e.effort);
  if (e.tempo) parts.push(`tempo ${e.tempo}`);
  if (e.restText) parts.push(`rest ${e.restText}`);
  return parts.join(" · ");
}

/* 1, 2, 3a, 3b, 4: a superset shares a number, each with its letter. */
export function labelsFor(exercises) {
  const out = [];
  let n = 0, letter = 0;
  exercises.forEach((e, i) => {
    if (!e.superset) { n++; letter = 0; } else letter++;
    const inPair = !!e.superset || !!exercises[i + 1]?.superset;
    out.push({ label: inPair ? `${n}${String.fromCharCode(97 + letter)}` : `${n}`, inPair });
  });
  return out;
}

function Point({ p }) {
  const Icon = LEVEL_ICON[p.level];
  return (
    <li className="flex gap-2 text-sm">
      <Icon size={15} className="flex-none mt-0.5" style={{ color: LEVEL_COLOR[p.level] }} aria-label={p.level === "stop" ? "Stop" : p.level === "warn" ? "Take care" : "Note"} />
      <span className="min-w-0">{p.text} <span className="text-xs" style={muted}>({FROM[p.from] || p.from})</span></span>
    </li>
  );
}

/* Alternatives for one exercise, fitted to this program. */
function Swaps({ peId, onPick, onCancel, busy }) {
  const [out, setOut] = useState(null);
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/program-exercises/${peId}/swaps`).then(o => alive && setOut(o)).catch(() => alive && setOut({ alternatives: [] }));
    return () => { alive = false; };
  }, [peId]);
  return (
    <div className="mt-2 p-3 rounded-lg grid gap-2" style={{ background: "var(--ghost-fill)" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Swap for</span>
        <button type="button" className="cx-icon-btn" onClick={onCancel} aria-label="Close" title="Close"><X size={16} aria-hidden="true" /></button>
      </div>
      {!out ? <p className="text-xs" style={muted}>Looking…</p> : out.alternatives.length === 0 ? (
        <p className="text-xs" style={muted}>{out.note || "Nothing in the library passes the place, the level and the limitations for this one."}</p>
      ) : (
        <ul className="grid gap-1">
          {out.alternatives.map(a => (
            <li key={a.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0 text-sm">
                <span className="font-medium">{a.name}</span> <span className="text-xs" style={muted}>· {a.level} · {a.why}</span>
                {a.askFirst && <span className="block text-xs" style={muted}>Ask first: {a.askFirst.join(", ")}</span>}
                {a.modifyFor && <span className="block text-xs" style={{ color: "#B7791F" }}>Make easier for: {a.modifyFor.join(", ")}</span>}
              </span>
              <button type="button" className="cx-btn-row flex-none" disabled={busy} onClick={() => onPick(a)}>Use it</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* What could come next on a day. */
function Next({ dayId, version, busy, onTake, units }) {
  const [out, setOut] = useState(null);
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/program-days/${dayId}/suggestions`).then(o => alive && setOut(o)).catch(() => alive && setOut({ suggestions: [] }));
    return () => { alive = false; };
  }, [dayId, version]);
  if (!out) return <p className="text-xs mt-3" style={muted}>Coach IQ is looking at what could come next…</p>;
  if (!out.suggestions.length) return null;
  return (
    <div className="mt-3 pt-3 border-t" style={line}>
      <div className="text-xs font-medium mb-1.5 inline-flex items-center gap-1" style={{ color: "var(--accent)" }}>
        <Lightbulb size={13} aria-hidden="true" /> Could come next{out.day ? ` on a ${out.day.toLowerCase()} day` : ""}{out.place ? `, for “${out.place}”` : ""}
      </div>
      {out.full && <p className="text-xs mb-1.5" style={muted}>{out.full}</p>}
      <ul className="grid gap-2">
        {out.suggestions.map(s => (
          <li key={s.id} className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-sm">
              <span className="font-medium">{s.name}</span> <span className="text-xs" style={muted}>· {s.level}</span>
              <span className="block text-xs" style={muted}>{s.why} {doseLine({ ...s.dose }, units) ? `Start with ${doseLine({ ...s.dose }, units)}.` : ""}</span>
              {s.askFirst && <span className="block text-xs" style={muted}>Ask first: {s.askFirst.join(", ")}</span>}
              {s.modifyFor && <span className="block text-xs" style={{ color: "#B7791F" }}>Make easier for: {s.modifyFor.join(", ")}</span>}
            </span>
            <button type="button" className="cx-btn-row flex-none" disabled={busy} onClick={() => onTake(s)}><Plus size={14} aria-hidden="true" /> Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Designer({ id, onBack, onSignedOut, billy, goals, vocab }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);     // { kind: "swap" | "day" | "details", id }
  /* The add-and-edit dialog: { day, editing?, suggested? } (ExerciseDialog.jsx). */
  const [dialog, setDialog] = useState(null);
  const [dialogError, setDialogError] = useState("");
  const openDialog = (d) => { setDialogError(""); setDialog(d); };
  /* Coach IQ's answers in the add dialog, kept for this program on this
     device so the next exercise opens with them. */
  const askKey = `cx-iq-ask:${id}`;
  const [lastAsk, setLastAsk] = useState(() => { try { return JSON.parse(localStorage.getItem(askKey) || "null"); } catch { return null; } });
  const rememberAsk = (v) => { setLastAsk(v); try { localStorage.setItem(askKey, JSON.stringify(v)); } catch { /* not kept: asked afresh */ } };
  const [version, setVersion] = useState(0);
  const [units] = useUnits();

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.message);
  }, [onSignedOut]);

  /* The client's gym in Studio, when it isn't where this program is: asked
     on opening, and gone once the place is changed. */
  const [gym, setGym] = useState(null);
  useEffect(() => { apiRequest("GET", `/programs/${id}`).then(o => { setP(o); setGym(o.gym || null); }).catch(fail); }, [id, fail]);

  const call = async (method, path, body, keepOpen = false) => {
    setBusy(true); setError("");
    try {
      const out = await apiRequest(method, path, body);
      setP(out); setVersion(v => v + 1);
      if (!keepOpen) setOpen(null);
      return true;
    } catch (err) { fail(err); return false; } finally { setBusy(false); }
  };
  const is = (kind, key) => open?.kind === kind && open?.id === key;
  /* Saved from the dialog: a new exercise on the day, or one changed. It
     stays open with the server's words if the save is refused. */
  const saveDialog = async (body) => {
    const { day, editing } = dialog;
    const { exerciseId, ...dose } = body;
    setBusy(true); setDialogError("");
    try {
      const out = editing
        ? await apiRequest("PATCH", `/program-exercises/${editing.id}`, { ...dose, ...(exerciseId !== editing.exerciseId ? { exerciseId } : {}) })
        : await apiRequest("POST", `/program-days/${day.id}/exercises`, { exerciseId, ...dose });
      setP(out); setVersion(v => v + 1); setDialog(null);
    } catch (err) {
      if (err.status === 401) onSignedOut?.(); else setDialogError(err.message);
    } finally { setBusy(false); }
  };
  const askBilly = (words) => { billy?.setOpen(true); billy?.ask(words); };

  if (!p) return error ? <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p> : <p className="text-sm" style={muted}>Loading…</p>;
  const points = (filter) => p.check.filter(filter);
  const top = points(c => !c.day && !c.exercise);
  const count = (lvl) => p.check.filter(c => c.level === lvl).length;

  return (
    <div className="grid gap-4">
      <button type="button" className="text-sm cx-link justify-self-start" onClick={onBack}><ChevronLeft size={16} aria-hidden="true" /> All programs</button>

      <section className="cx-card p-4">
        {is("details", p.id) ? (
          <DetailsForm initial={p} goals={goals} vocab={vocab} places={p.places} busy={busy} onCancel={() => setOpen(null)}
            onSave={(body) => call("PATCH", `/programs/${p.id}`, body)} />
        ) : (
          <>
            <h2 className="cx-display text-2xl">{p.name}</h2>
            <div className="text-sm" style={muted}>
              For {p.clientName} · {p.goalLabel} · {p.level} · {p.placeName ? `at “${p.placeName}”` : "no place chosen"}
            </div>
            <div className="text-sm" style={muted}>
              {[p.kindLabel, p.minutes ? `${p.minutes}-minute sessions` : null, p.focusLabels.length ? `focus: ${p.focusLabels.join(", ").toLowerCase()}` : null].filter(Boolean).join(" · ")}
            </div>
            {p.notes && <p className="text-sm mt-2 whitespace-pre-wrap cx-wrap">{p.notes}</p>}
            {gym && p.placeId !== gym.placeId && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm">
                <span className="inline-flex items-start gap-1.5"><Info size={15} className="flex-none mt-0.5" style={{ color: "var(--iron)" }} aria-hidden="true" />{gym.text}</span>
                <button type="button" className="cx-link" disabled={busy} onClick={() => call("PATCH", `/programs/${p.id}`, { placeId: gym.placeId })}>Use {gym.name}</button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
              <button type="button" className="cx-btn-row" onClick={() => setOpen({ kind: "details", id: p.id })}><Pencil size={15} aria-hidden="true" /> Edit the details</button>
              <a className="text-sm cx-link" href={`/print/program/${p.id}`} target="_blank" rel="noreferrer"><Printer size={15} aria-hidden="true" /> Print for the client</a>
              {billy?.available && (
                <button type="button" className="text-sm cx-link" onClick={() => askBilly(`Look over my program “${p.name}” for ${p.clientName} (${p.id}). What would you change or add next?`)}>
                  <Sparkles size={15} aria-hidden="true" /> Ask Billy about it
                </button>
              )}
            </div>
          </>
        )}
        <div className="mt-3 pt-3 border-t text-sm" style={line}>
          <span className="font-medium">Coach IQ's check: </span>
          {p.check.length === 0 ? <span style={muted}>nothing to point out.</span> : (
            <span style={muted}>
              {[count("stop") && `${count("stop")} to stop`, count("warn") && `${count("warn")} to take care with`, count("note") && `${count("note")} to note`].filter(Boolean).join(", ")}, shown where they apply.
            </span>
          )}
          {top.length > 0 && <ul className="grid gap-1 mt-2">{top.map((c, i) => <Point key={i} p={c} />)}</ul>}
        </div>
      </section>

      {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}

      {p.days.map((d, di, days) => {
        const bodyScale = scaleOf(days);
        const dayPoints = points(c => c.day === d.id && !c.exercise);
        const labels = labelsFor(d.exercises);
        return (
          <section key={d.id} className="cx-card p-4">
            {is("day", d.id) ? (
              <DayForm day={d} dayKinds={vocab?.dayKinds} busy={busy} onCancel={() => setOpen(null)} onSave={(body) => call("PATCH", `/program-days/${d.id}`, body)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-lg">{d.name}{!d.name.toLowerCase().startsWith(d.kindLabel.split(" ")[0].toLowerCase()) && <span className="text-xs font-normal ml-2" style={muted}>{d.kindLabel}</span>}</h3>
                <div className="flex items-center gap-1">
                  <button type="button" className="cx-icon-btn" disabled={busy || di === 0} onClick={() => call("PATCH", `/program-days/${d.id}`, { move: -1 })} aria-label={`Move ${d.name} up`} title="Move up"><ArrowUp size={16} aria-hidden="true" /></button>
                  <button type="button" className="cx-icon-btn" disabled={busy || di === p.days.length - 1} onClick={() => call("PATCH", `/program-days/${d.id}`, { move: 1 })} aria-label={`Move ${d.name} down`} title="Move down"><ArrowDown size={16} aria-hidden="true" /></button>
                  <button type="button" className="cx-icon-btn" onClick={() => setOpen({ kind: "day", id: d.id })} aria-label={`Rename ${d.name}`} title="Rename"><Pencil size={16} aria-hidden="true" /></button>
                  <button type="button" className="cx-icon-btn" disabled={busy}
                    onClick={() => (d.exercises.length === 0 || window.confirm(`Take ${d.name} out of the program, with its ${d.exercises.length} exercises?`)) && call("DELETE", `/program-days/${d.id}`)}
                    aria-label={`Take ${d.name} out`} title="Take the day out"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </div>
            )}
            {d.notes && !is("day", d.id) && <p className="text-sm mt-1 cx-wrap" style={muted}>{d.notes}</p>}
            {dayPoints.length > 0 && <ul className="grid gap-1 mt-2">{dayPoints.map((c, i) => <Point key={i} p={c} />)}</ul>}
            {/* What the day works (Glenn, 19 Oct 2026), shaded by its exercises. */}
            {d.exercises.length > 0 && <BodyMap exercises={d.exercises} top={bodyScale} />}

            {d.exercises.length === 0 && <p className="text-sm mt-2" style={muted}>No exercises yet. Add one, or take one of Coach IQ's suggestions below.</p>}
            <ol className="mt-2">
              {d.exercises.map((e, i) => {
                const { label, inPair } = labels[i];
                const mine = points(c => c.exercise === e.id);
                return (
                  <li key={e.id} className="py-2.5 border-t first:border-t-0" style={line}>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold w-7 flex-none pt-0.5" style={{ color: inPair ? "var(--accent)" : "var(--iron)" }}>
                        {e.superset && <Link2 size={11} className="inline mr-0.5" aria-label="With the one above" />}{label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <button type="button" className="text-left" onClick={() => openDialog({ day: d, editing: e, first: i === 0 })}>
                          <span className="block text-sm font-medium">{e.name}{e.own && <span className="text-xs font-normal" style={muted}> · your own</span>}</span>
                          {e.libraryName && e.libraryName !== e.name && <span className="block text-xs" style={muted}>{e.libraryName}</span>}
                        </button>
                        {doseLine(e, units) ? <div className="text-sm">{doseLine(e, units)}</div> : <div className="text-xs" style={muted}>No sets or reps yet.</div>}
                        {e.note && <div className="text-xs cx-wrap" style={muted}>{e.note}</div>}
                        {mine.length > 0 && <ul className="grid gap-1 mt-1">{mine.map((c, j) => <Point key={j} p={c} />)}</ul>}
                        {is("swap", e.id) && <Swaps peId={e.id} busy={busy} onCancel={() => setOpen(null)} onPick={(a) => call("PATCH", `/program-exercises/${e.id}`, { exerciseId: a.id })} />}
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <button type="button" className="cx-btn-row" onClick={() => openDialog({ day: d, editing: e, first: i === 0 })}><Pencil size={14} aria-hidden="true" /> Details</button>
                            <button type="button" className="text-xs cx-link ml-2" onClick={() => setOpen(is("swap", e.id) ? null : { kind: "swap", id: e.id })}><Repeat size={13} aria-hidden="true" /> Swap</button>
                            <span className="flex-1" />
                            <button type="button" className="cx-icon-btn" disabled={busy || i === 0} onClick={() => call("PATCH", `/program-exercises/${e.id}`, { move: -1 })} aria-label={`Move ${e.name} up`} title="Move up"><ArrowUp size={15} aria-hidden="true" /></button>
                            <button type="button" className="cx-icon-btn" disabled={busy || i === d.exercises.length - 1} onClick={() => call("PATCH", `/program-exercises/${e.id}`, { move: 1 })} aria-label={`Move ${e.name} down`} title="Move down"><ArrowDown size={15} aria-hidden="true" /></button>
                            <button type="button" className="cx-icon-btn" disabled={busy} onClick={() => call("DELETE", `/program-exercises/${e.id}`)} aria-label={`Take ${e.name} out`} title="Take it out"><Trash2 size={15} aria-hidden="true" /></button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" className="cx-btn-row" onClick={() => openDialog({ day: d, first: d.exercises.length === 0 })}><Plus size={15} aria-hidden="true" /> Add an exercise</button>
                  {billy?.available && (
                    <button type="button" className="text-sm cx-link" onClick={() => askBilly(`In my program “${p.name}” for ${p.clientName} (${p.id}), what should come next on ${d.name}?`)}>
                      <Sparkles size={15} aria-hidden="true" /> Ask Billy about {d.name}
                    </button>
                  )}
                </div>
            </div>
            <Next dayId={d.id} version={version} busy={busy} units={units}
              onTake={(s) => openDialog({ day: d, suggested: s, first: d.exercises.length === 0 })} />
          </section>
        );
      })}

      <button type="button" className="cx-btn-quiet w-full py-2 text-sm" disabled={busy} onClick={() => call("POST", `/programs/${p.id}/days`, {})}>
        <Plus size={15} className="inline" aria-hidden="true" /> Add a day
      </button>
      {dialog && (
        <ExerciseDialog dayId={dialog.day.id} dayName={dialog.day.name} first={dialog.first} editing={dialog.editing} suggested={dialog.suggested} vocab={vocab}
          remembered={lastAsk} onRemember={rememberAsk} oneRms={p.oneRms} units={units} clientName={p.clientName ? p.clientName.split(" ")[0] : ""}
          onAskBilly={billy?.available ? (words) => askBilly(`In my program “${p.name}” for ${p.clientName} (${p.id}): ${words}`) : null}
          busy={busy} error={dialogError} onSave={saveDialog} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

function DayForm({ day, dayKinds, busy, onSave, onCancel }) {
  const [f, setF] = useState({ name: day.name, notes: day.notes || "", kind: day.kind || "full" });
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <input className="cx-input" value={f.name} maxLength={80} required aria-label="The day's name" onChange={e => setF(d => ({ ...d, name: e.target.value }))} />
      {dayKinds && (
        <label className="grid gap-1 text-xs" style={muted}>What this day trains (Coach IQ suggests from it)
          <select className="cx-input" value={f.kind} onChange={e => setF(d => ({ ...d, kind: e.target.value }))} style={{ color: "var(--ink)" }}>
            {dayKinds.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
        </label>
      )}
      <input className="cx-input text-sm" value={f.notes} maxLength={1000} placeholder="A note for the day (optional)" aria-label="A note for the day" onChange={e => setF(d => ({ ...d, notes: e.target.value }))} />
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-row" disabled={busy}>Save</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* A row of choices, one or several. */
function Choices({ options, value, onChange, many = false, label }) {
  const on = (k) => (many ? value.includes(k) : value === k);
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map(([k, words]) => (
        <button key={k} type="button" aria-pressed={on(k)}
          onClick={() => onChange(many ? (on(k) ? value.filter(v => v !== k) : [...value, k]) : k)}
          className="px-3 py-1.5 rounded-full text-sm"
          style={on(k) ? { background: "var(--cerulean)", color: "#fff" } : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
          {words}
        </button>
      ))}
    </div>
  );
}

/**
 * The first step of a new program (Glenn, 17 Oct 2026: "Before creating a new
 * program, ask what kind of program they are think of creating so we can help
 * recommend exercises better"): what kind, how many days a week, anything to
 * focus on, and how long a session is. Its days are made from the answers,
 * and Coach IQ suggests for each day from what that day trains.
 */
export function KindForm({ vocab, initial, onNext, onCancel }) {
  const [f, setF] = useState(() => initial || { kind: "", daysPerWeek: null, focus: [], minutes: 60 });
  const kind = vocab.kinds.find(k => k.key === f.kind);
  const lab = (name, el) => <div className="grid gap-1.5"><div className="text-sm font-medium">{name}</div>{el}</div>;
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (kind) onNext({ ...f, daysPerWeek: f.daysPerWeek || kind.days }); }}>
      <div className="grid gap-1.5">
        <div className="text-sm font-medium">What kind of program are you thinking of?</div>
        <div className="grid sm:grid-cols-2 gap-2" role="radiogroup" aria-label="What kind of program">
          {vocab.kinds.map(k => (
            <button key={k.key} type="button" role="radio" aria-checked={f.kind === k.key}
              onClick={() => setF(d => ({ ...d, kind: k.key, daysPerWeek: d.kind === k.key ? d.daysPerWeek : k.days }))}
              className="text-left rounded-xl p-3 border"
              style={f.kind === k.key ? { borderColor: "var(--cerulean)", background: "var(--accent-soft)" } : { borderColor: "var(--iron-line)" }}>
              <span className="block font-medium text-sm">{k.label}</span>
              <span className="block text-xs" style={muted}>{k.about}</span>
            </button>
          ))}
        </div>
      </div>
      {kind && (
        <>
          {lab("Days a week", <Choices label="Days a week" options={[1, 2, 3, 4, 5, 6].map(n => [n, String(n)])} value={f.daysPerWeek || kind.days} onChange={(n) => setF(d => ({ ...d, daysPerWeek: n }))} />)}
          {lab(<>Anything to focus on? <span className="font-normal" style={muted}>(optional, any number)</span></>, <Choices many label="Focus" options={vocab.focus.map(x => [x.key, x.label])} value={f.focus} onChange={(v) => setF(d => ({ ...d, focus: v }))} />)}
          {lab("How long is a session?", <Choices label="Session length" options={vocab.minutes.map(m => [m, `${m} min`])} value={f.minutes} onChange={(m) => setF(d => ({ ...d, minutes: m }))} />)}
        </>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={!kind}>Next</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** A program's details: its name, what it is for, the client's level, where, and notes; editing, its focus and session length too. */
export function DetailsForm({ initial = {}, goals, vocab, places, clients, busy, onSave, onCancel, onBack, word = "Save" }) {
  const [f, setF] = useState({
    name: initial.name || "", goal: initial.goal || "general", level: initial.level || (clients ? "" : "beginner"),
    placeId: initial.placeId ?? places?.[0]?.id ?? "", notes: initial.notes || "", clientId: initial.clientId || "",
    focus: initial.focus || [], minutes: initial.minutes ?? null,
  });
  const set = (k) => (e) => setF(d => ({ ...d, [k]: e.target.value }));
  /* A new program starts at the first place, once the places have come. */
  useEffect(() => {
    if (initial.placeId === undefined && places?.length) setF(d => (d.placeId ? d : { ...d, placeId: places[0].id }));
  }, [places, initial.placeId]);
  /* A new program's level starts from what the trainer's earlier programs
     for the client say; with none, the trainer is asked. */
  const [known, setKnown] = useState(null);
  useEffect(() => {
    if (!clients || !f.clientId) { setKnown(null); return; }
    let live = true;
    apiRequest("GET", `/clients/${f.clientId}/level`).then(o => {
      if (!live) return;
      setKnown(o);
      setF(d => ({ ...d, level: o.level || "" }));
    }).catch(() => { if (live) setKnown(null); });
    return () => { live = false; };
  }, [clients, f.clientId]);
  /* And where they train starts at their gym in Studio, if they have one,
     made one of the trainer's places the first time. */
  const [gym, setGym] = useState(null);
  useEffect(() => {
    if (!clients || !f.clientId) { setGym(null); return; }
    let live = true;
    apiRequest("GET", `/clients/${f.clientId}/place`).then(o => {
      if (!live) return;
      setGym(o.place);
      /* With no gym in Studio, back to the trainer's first place. */
      setF(d => ({ ...d, placeId: o.place ? o.place.id : places?.[0]?.id ?? "" }));
    }).catch(() => { if (live) setGym(null); });
    return () => { live = false; };
  }, [clients, f.clientId]);
  const placeList = gym && !(places || []).some(p => p.id === gym.id) ? [...(places || []), gym] : (places || []);
  const firstName = clients?.find(c => c.id === f.clientId)?.firstName;
  const lab = (name, el) => <label className="grid gap-1 text-xs" style={muted}>{name}{el}</label>;
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSave(clients ? { name: f.name, goal: f.goal, level: f.level, placeId: f.placeId, notes: f.notes, clientId: f.clientId }
      : { name: f.name, goal: f.goal, level: f.level, placeId: f.placeId, notes: f.notes, ...(vocab ? { focus: f.focus, minutes: f.minutes } : {}) }); }}>
      {onBack && <button type="button" className="text-sm cx-link justify-self-start" onClick={onBack}><ChevronLeft size={15} aria-hidden="true" /> Back to the kind of program</button>}
      {clients && lab("Client", (
        <select className="cx-input" value={f.clientId} required onChange={e => {
          const c = clients.find(x => x.id === e.target.value);
          /* The name follows the client while it is still the one made up for the last. */
          const was = clients.find(x => x.id === f.clientId);
          setF(d => ({ ...d, clientId: e.target.value, name: (!d.name || (was && d.name === `${was.firstName}'s program`)) && c ? `${c.firstName}'s program` : d.name }));
        }} style={{ color: "var(--ink)" }}>
          <option value="">Choose a client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim()}</option>)}
        </select>
      ))}
      {lab("Name", <input className="cx-input" value={f.name} maxLength={120} required onChange={set("name")} style={{ color: "var(--ink)" }} />)}
      <div className="grid sm:grid-cols-3 gap-3">
        {lab("What it's for", <select className="cx-input" value={f.goal} onChange={set("goal")} style={{ color: "var(--ink)" }}>{goals.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}</select>)}
        {lab("The client's level", <select className="cx-input" value={f.level} required onChange={set("level")} style={{ color: "var(--ink)" }}>
          {!f.level && <option value="">Choose…</option>}
          {["beginner", "intermediate", "advanced"].map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}
        </select>)}
        {clients && f.clientId && known && (
          <p className="text-xs sm:col-span-3 sm:order-last" style={muted}>
            {known.level ? <>Coach IQ: {known.why}</> : <>No programs for {firstName || "them"} yet. What's their fitness level?</>}
          </p>
        )}
        {lab("Where they train", (
          <select className="cx-input" value={f.placeId} onChange={set("placeId")} style={{ color: "var(--ink)" }}>
            <option value="">Not chosen</option>
            {placeList.map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
        ))}
        {clients && gym && f.placeId === gym.id && (
          <p className="text-xs sm:col-span-3 sm:order-last" style={muted}>{firstName ? `${firstName}'s` : "Their"} gym in Studio.</p>
        )}
      </div>
      {!clients && vocab && (
        <>
          <div className="grid gap-1 text-xs" style={muted}>Focus<Choices many label="Focus" options={vocab.focus.map(x => [x.key, x.label])} value={f.focus} onChange={(v) => setF(d => ({ ...d, focus: v }))} /></div>
          <div className="grid gap-1 text-xs" style={muted}>How long is a session?<Choices label="Session length" options={vocab.minutes.map(m => [m, `${m} min`])} value={f.minutes} onChange={(m) => setF(d => ({ ...d, minutes: m }))} /></div>
        </>
      )}
      {lab("Notes (optional)", <textarea className="cx-input text-sm" rows={2} maxLength={2000} value={f.notes} onChange={set("notes")} style={{ color: "var(--ink)" }} />)}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy}>{word}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
