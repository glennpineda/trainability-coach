import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDown, ArrowUp, ChevronLeft, Link2, Lightbulb, OctagonAlert, Pencil, Plus, Printer, Repeat, Search, Sparkles, Trash2, TriangleAlert, Info, X,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { convertText } from "../lib/units";
import { useUnits } from "../hooks/useUnits";

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
};

/* "3 × 8–12 · 45 lb · RPE 7 · 3-1-1-0 · rest 75 s": what is filled in, in the reader's units. */
export function doseLine(e, units) {
  const parts = [];
  if (e.sets && e.reps) parts.push(`${e.sets} × ${e.reps}`);
  else if (e.sets) parts.push(`${e.sets} sets`);
  else if (e.reps) parts.push(`${e.reps} reps`);
  if (e.load) parts.push(convertText(e.load, units));
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

/* Search the trainer's names, their own exercises and the library. */
function Finder({ onPick, onCancel, busy }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (q.trim().length < 2) { setFound(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      apiRequest("GET", `/programs-find?q=${encodeURIComponent(q.trim())}`)
        .then(({ found: f }) => { if (alive) setFound(f); })
        .catch(() => { if (alive) setFound([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <Search size={16} style={muted} aria-hidden="true" />
        <input className="cx-input" autoFocus value={q} maxLength={120} placeholder="Find an exercise, by any name you use"
          aria-label="Find an exercise" onChange={e => setQ(e.target.value)} />
        <button type="button" className="cx-icon-btn" onClick={onCancel} aria-label="Cancel" title="Cancel"><X size={18} aria-hidden="true" /></button>
      </div>
      {found && (found.length === 0 ? <p className="text-xs" style={muted}>Nothing by that name. Try another word, or add it on My exercises.</p> : (
        <ul className="rounded-lg overflow-hidden border" style={line}>
          {found.map(x => (
            <li key={x.id} className="border-t first:border-t-0" style={line}>
              <button type="button" disabled={busy} onClick={() => onPick(x)} className="w-full text-left px-3 py-2 hover:bg-(--ghost-fill)">
                <span className="block text-sm font-medium">{x.theirName || x.name}</span>
                <span className="block text-xs" style={muted}>{x.theirOwnExercise ? "Your own exercise" : x.master}{x.level ? ` · ${x.level}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/* Sets, reps and the rest: all optional. */
function DoseForm({ e, busy, onSave, onCancel, first }) {
  const [f, setF] = useState({ sets: e.sets || "", reps: e.reps || "", load: e.load || "", effort: e.effort || "", tempo: e.tempo || "", rest: e.restText || "", note: e.note || "", superset: !!e.superset });
  const set = (k) => (ev) => setF(d => ({ ...d, [k]: ev.target.value }));
  const field = (k, label, placeholder, max) => (
    <label className="grid gap-1 text-xs" style={muted}>{label}
      <input className="cx-input text-sm" value={f[k]} maxLength={max} placeholder={placeholder} onChange={set(k)} style={{ color: "var(--ink)" }} />
    </label>
  );
  return (
    <form className="grid gap-2 mt-2" onSubmit={(ev) => { ev.preventDefault(); onSave(f); }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {field("sets", "Sets", "3, or 1–3", 20)}
        {field("reps", "Reps", "8–12, or 30 s", 40)}
        {field("load", "Load", "45 lb", 60)}
        {field("effort", "Effort", "2 in reserve", 60)}
        {field("tempo", "Tempo", "3-1-1-0", 20)}
        {field("rest", "Rest", "90 s, or 2 min", 20)}
      </div>
      {field("note", "Note", "Anything to remember", 300)}
      {!first && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.superset} onChange={ev => setF(d => ({ ...d, superset: ev.target.checked }))} /> Done together with the one above (a superset)</label>
      )}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-row" disabled={busy}>Save</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
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
        <Lightbulb size={13} aria-hidden="true" /> Could come next{out.place ? `, for “${out.place}”` : ""}
      </div>
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

export function Designer({ id, onBack, onSignedOut, billy, goals }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);     // { kind: "dose" | "swap" | "find" | "day" | "details", id }
  const [version, setVersion] = useState(0);
  const [units] = useUnits();

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.message);
  }, [onSignedOut]);

  useEffect(() => { apiRequest("GET", `/programs/${id}`).then(setP).catch(fail); }, [id, fail]);

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
          <DetailsForm initial={p} goals={goals} places={p.places} busy={busy} onCancel={() => setOpen(null)}
            onSave={(body) => call("PATCH", `/programs/${p.id}`, body)} />
        ) : (
          <>
            <h2 className="cx-display text-2xl">{p.name}</h2>
            <div className="text-sm" style={muted}>
              For {p.clientName} · {p.goalLabel} · {p.level} · {p.placeName ? `at “${p.placeName}”` : "no place chosen"}
            </div>
            {p.notes && <p className="text-sm mt-2 whitespace-pre-wrap">{p.notes}</p>}
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

      {p.days.map((d, di) => {
        const dayPoints = points(c => c.day === d.id && !c.exercise);
        const labels = labelsFor(d.exercises);
        return (
          <section key={d.id} className="cx-card p-4">
            {is("day", d.id) ? (
              <DayForm day={d} busy={busy} onCancel={() => setOpen(null)} onSave={(body) => call("PATCH", `/program-days/${d.id}`, body)} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-lg">{d.name}</h3>
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
            {d.notes && !is("day", d.id) && <p className="text-sm mt-1" style={muted}>{d.notes}</p>}
            {dayPoints.length > 0 && <ul className="grid gap-1 mt-2">{dayPoints.map((c, i) => <Point key={i} p={c} />)}</ul>}

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
                        <div className="text-sm font-medium">{e.name}{e.own && <span className="text-xs font-normal" style={muted}> · your own</span>}</div>
                        {e.libraryName && e.libraryName !== e.name && <div className="text-xs" style={muted}>{e.libraryName}</div>}
                        {doseLine(e, units) && <div className="text-sm">{doseLine(e, units)}</div>}
                        {e.note && <div className="text-xs" style={muted}>{e.note}</div>}
                        {mine.length > 0 && <ul className="grid gap-1 mt-1">{mine.map((c, j) => <Point key={j} p={c} />)}</ul>}
                        {is("dose", e.id) && <DoseForm e={e} first={i === 0} busy={busy} onCancel={() => setOpen(null)} onSave={(body) => call("PATCH", `/program-exercises/${e.id}`, body)} />}
                        {is("swap", e.id) && <Swaps peId={e.id} busy={busy} onCancel={() => setOpen(null)} onPick={(a) => call("PATCH", `/program-exercises/${e.id}`, { exerciseId: a.id })} />}
                        {!is("dose", e.id) && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <button type="button" className="text-xs cx-link" onClick={() => setOpen({ kind: "dose", id: e.id })}><Pencil size={13} aria-hidden="true" /> Sets, reps…</button>
                            <button type="button" className="text-xs cx-link ml-2" onClick={() => setOpen(is("swap", e.id) ? null : { kind: "swap", id: e.id })}><Repeat size={13} aria-hidden="true" /> Swap</button>
                            <span className="flex-1" />
                            <button type="button" className="cx-icon-btn" disabled={busy || i === 0} onClick={() => call("PATCH", `/program-exercises/${e.id}`, { move: -1 })} aria-label={`Move ${e.name} up`} title="Move up"><ArrowUp size={15} aria-hidden="true" /></button>
                            <button type="button" className="cx-icon-btn" disabled={busy || i === d.exercises.length - 1} onClick={() => call("PATCH", `/program-exercises/${e.id}`, { move: 1 })} aria-label={`Move ${e.name} down`} title="Move down"><ArrowDown size={15} aria-hidden="true" /></button>
                            <button type="button" className="cx-icon-btn" disabled={busy} onClick={() => call("DELETE", `/program-exercises/${e.id}`)} aria-label={`Take ${e.name} out`} title="Take it out"><Trash2 size={15} aria-hidden="true" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-2">
              {is("find", d.id) ? (
                <Finder busy={busy} onCancel={() => setOpen(null)} onPick={(x) => call("POST", `/program-days/${d.id}/exercises`, { exerciseId: x.id })} />
              ) : (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" className="cx-btn-row" onClick={() => setOpen({ kind: "find", id: d.id })}><Plus size={15} aria-hidden="true" /> Add an exercise</button>
                  {billy?.available && (
                    <button type="button" className="text-sm cx-link" onClick={() => askBilly(`In my program “${p.name}” for ${p.clientName} (${p.id}), what should come next on ${d.name}?`)}>
                      <Sparkles size={15} aria-hidden="true" /> Ask Billy about {d.name}
                    </button>
                  )}
                </div>
              )}
            </div>
            <Next dayId={d.id} version={version} busy={busy} units={units}
              onTake={(s) => call("POST", `/program-days/${d.id}/exercises`, { exerciseId: s.id, sets: s.dose.sets, reps: s.dose.reps, rest: s.dose.restText })} />
          </section>
        );
      })}

      <button type="button" className="cx-btn-quiet w-full py-2 text-sm" disabled={busy} onClick={() => call("POST", `/programs/${p.id}/days`, {})}>
        <Plus size={15} className="inline" aria-hidden="true" /> Add a day
      </button>
    </div>
  );
}

function DayForm({ day, busy, onSave, onCancel }) {
  const [f, setF] = useState({ name: day.name, notes: day.notes || "" });
  return (
    <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <input className="cx-input" value={f.name} maxLength={80} required aria-label="The day's name" onChange={e => setF(d => ({ ...d, name: e.target.value }))} />
      <input className="cx-input text-sm" value={f.notes} maxLength={1000} placeholder="A note for the day (optional)" aria-label="A note for the day" onChange={e => setF(d => ({ ...d, notes: e.target.value }))} />
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-row" disabled={busy}>Save</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** A program's details: its name, what it is for, the client's level, where, and notes. */
export function DetailsForm({ initial = {}, goals, places, clients, busy, onSave, onCancel, word = "Save" }) {
  const [f, setF] = useState({
    name: initial.name || "", goal: initial.goal || "general", level: initial.level || "beginner",
    placeId: initial.placeId ?? places?.[0]?.id ?? "", notes: initial.notes || "", clientId: initial.clientId || "",
  });
  const set = (k) => (e) => setF(d => ({ ...d, [k]: e.target.value }));
  /* A new program starts at the first place, once the places have come. */
  useEffect(() => {
    if (initial.placeId === undefined && places?.length) setF(d => (d.placeId ? d : { ...d, placeId: places[0].id }));
  }, [places, initial.placeId]);
  const lab = (name, el) => <label className="grid gap-1 text-xs" style={muted}>{name}{el}</label>;
  return (
    <form className="grid gap-3" onSubmit={(e) => { e.preventDefault(); onSave(clients ? f : { name: f.name, goal: f.goal, level: f.level, placeId: f.placeId, notes: f.notes }); }}>
      {clients && lab("Client", (
        <select className="cx-input" value={f.clientId} required onChange={e => {
          const c = clients.find(x => x.id === e.target.value);
          setF(d => ({ ...d, clientId: e.target.value, name: d.name || (c ? `${c.firstName}'s program` : "") }));
        }} style={{ color: "var(--ink)" }}>
          <option value="">Choose a client…</option>
          {clients.map(c => <option key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`.trim()}</option>)}
        </select>
      ))}
      {lab("Name", <input className="cx-input" value={f.name} maxLength={120} required onChange={set("name")} style={{ color: "var(--ink)" }} />)}
      <div className="grid sm:grid-cols-3 gap-3">
        {lab("What it's for", <select className="cx-input" value={f.goal} onChange={set("goal")} style={{ color: "var(--ink)" }}>{goals.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}</select>)}
        {lab("The client's level", <select className="cx-input" value={f.level} onChange={set("level")} style={{ color: "var(--ink)" }}>{["beginner", "intermediate", "advanced"].map(l => <option key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</option>)}</select>)}
        {lab("Where they train", (
          <select className="cx-input" value={f.placeId} onChange={set("placeId")} style={{ color: "var(--ink)" }}>
            <option value="">Not chosen</option>
            {(places || []).map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
          </select>
        ))}
      </div>
      {lab("Notes (optional)", <textarea className="cx-input text-sm" rows={2} maxLength={2000} value={f.notes} onChange={set("notes")} style={{ color: "var(--ink)" }} />)}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy}>{word}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
