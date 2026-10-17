import React, { useEffect, useState } from "react";
import { Loader2, Plus, Undo2, X } from "lucide-react";
import { apiRequest } from "../lib/api";

/**
 * The pieces of the library's editor on Review Coach IQ (the library lives in
 * the app since build 1.0.12; Glenn, 17 Oct 2026): the forms for a version,
 * a family, a condition and a principle, the pickers they are made of, and a list of
 * changes to undo. The server checks every change with Coach IQ's rules and
 * says why when it refuses one; the forms show its reasons as they are.
 */

const muted = { color: "var(--iron)" };
const label = "text-xs";

/* What the editor may choose from, asked for once. */
let vocab = null;
export function useVocabulary() {
  const [v, setV] = useState(vocab);
  useEffect(() => {
    if (vocab) return undefined;
    let alive = true;
    apiRequest("GET", "/coach-iq/library/vocabulary").then(out => { vocab = out; if (alive) setV(out); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return v;
}

/* Many of a few: chips, on or off. */
export function Chips({ options, value, onChange, label: name }) {
  const chip = (on) => on
    ? { background: "var(--cerulean)", color: "#fff", borderColor: "var(--cerulean)" }
    : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map(([key, words]) => {
        const on = value.includes(key);
        return (
          <button key={key} type="button" aria-pressed={on} className="text-xs px-2.5 py-1 rounded-full border" style={chip(on)}
            onClick={() => onChange(on ? value.filter(k => k !== key) : [...value, key])}>{words}</button>
        );
      })}
    </div>
  );
}

/* Exercises chosen from the library by searching: easier or harder steps. */
function ExercisePicker({ value, onChange, exclude, name }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState([]);
  useEffect(() => {
    if (q.trim().length < 2) { setFound([]); return undefined; }
    let alive = true;
    const t = setTimeout(() => apiRequest("GET", `/coach-iq/exercises?q=${encodeURIComponent(q.trim())}`)
      .then(({ exercises }) => { if (alive) setFound(exercises.filter(x => x.id !== exclude && !value.some(v => v.id === x.id)).slice(0, 6)); })
      .catch(() => {}), 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q, value, exclude]);
  return (
    <div className="grid gap-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(x => (
            <span key={x.id} className="inline-flex items-center gap-1 text-xs pl-2.5 pr-1 py-1 rounded-full" style={{ background: "var(--ghost-fill)" }}>
              {x.name}
              <button type="button" className="rounded-full p-0.5" aria-label={`Take ${x.name} off`} onClick={() => onChange(value.filter(v => v.id !== x.id))}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input className="cx-input text-sm" value={q} placeholder="Search to add one" aria-label={name} onChange={e => setQ(e.target.value)} />
      {found.length > 0 && (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--iron-line)" }}>
          {found.map(x => (
            <li key={x.id} className="border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
              <button type="button" className="w-full text-left px-3 py-1.5 text-sm hover:bg-(--ghost-fill)" onClick={() => { onChange([...value, { id: x.id, name: x.name }]); setQ(""); }}>
                {x.name} <span className="text-xs" style={muted}>· {x.master} · {x.level}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* A labelled field. */
const Field = ({ name, children }) => (
  <div className="grid gap-1"><span className={label} style={muted}>{name}</span>{children}</div>
);

/* What the server said was wrong, as it said it. */
export function Problems({ error }) {
  if (!error) return null;
  return (
    <div className="text-sm rounded-lg p-2.5" role="alert" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
      <div className="font-semibold">{error.message}</div>
      {error.problems?.length > 0 && <ul className="list-disc pl-5 mt-1">{error.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
    </div>
  );
}

const SaveRow = ({ busy, onCancel, word = "Save" }) => (
  <div className="flex items-center gap-2">
    <button type="submit" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" disabled={busy} aria-busy={busy}>
      {busy ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Saving…</> : word}
    </button>
    <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
  </div>
);

const entries = (o) => Object.entries(o);
const pairs = (list) => list.map(x => [x, x]);

/**
 * A version of an exercise. `initial` is a review card's version (raw, its
 * easier and harder steps), or what a new one starts with.
 */
export function VersionForm({ initial = {}, families, onSave, onCancel, busy, error, word, intro }) {
  const v = useVocabulary();
  const raw = initial.raw || {};
  const [f, setF] = useState(() => ({
    name: raw.name || initial.name || "",
    aliases: (raw.aliases || []).join(", "),
    movement: raw.movement || initial.movement || "",
    attributes: { ...(raw.attributes || initial.attributes || {}) },
    primary: raw.primary || initial.primary || [],
    secondary: raw.secondary || [],
    level: raw.level || "beginner",
    joints: raw.cautions?.joints || [],
    facts: raw.cautions?.flags || [],
    piece: raw.piece || "",
    measure: raw.measure || [],
    perSide: raw.perSide === undefined ? "" : String(raw.perSide),
    harder: initial.harderSteps || [],
    easier: initial.easierSteps || [],
  }));
  if (!v) return <p className="text-sm" style={muted}>Loading…</p>;
  const set = (k, val) => setF(d => ({ ...d, [k]: val }));
  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: f.name, aliases: f.aliases.split(",").map(s => s.trim()).filter(Boolean), movement: f.movement,
      attributes: f.attributes, primary: f.primary, secondary: f.secondary, level: f.level, joints: f.joints, facts: f.facts,
      piece: f.piece, measure: f.measure, perSide: f.perSide === "" ? undefined : f.perSide === "true",
      harder: f.harder.map(x => x.id), easier: f.easier.map(x => x.id),
    });
  };
  return (
    <form className="grid gap-3 mt-2" onSubmit={submit}>
      {intro}
      <Field name="Everyday name">
        <input className="cx-input" value={f.name} maxLength={120} required onChange={e => set("name", e.target.value)} />
      </Field>
      <Field name="Also called (commas between)">
        <input className="cx-input" value={f.aliases} onChange={e => set("aliases", e.target.value)} />
      </Field>
      {families && (
        <Field name="Family">
          <select className="cx-input" value={f.movement} required onChange={e => set("movement", e.target.value)}>
            <option value="">Choose a family…</option>
            {families.map(fm => <option key={fm.id} value={fm.id}>{fm.label}</option>)}
          </select>
        </Field>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {v.order.map(key => (
          <Field key={key} name={key === "implement" ? "Equipment (needed)" : key[0].toUpperCase() + key.slice(1)}>
            <select className="cx-input text-sm" value={f.attributes[key] || ""} onChange={e => set("attributes", { ...f.attributes, [key]: e.target.value })}>
              <option value="">{key === "implement" ? "Choose…" : "Usual"}</option>
              {v.words[key].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
        ))}
      </div>
      <Field name="Level: the skill and strength it needs">
        <select className="cx-input" value={f.level} onChange={e => set("level", e.target.value)}>
          {v.levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </Field>
      <Field name="Works"><Chips name="Works" options={pairs(v.muscles)} value={f.primary} onChange={x => set("primary", x)} /></Field>
      <Field name="Also works"><Chips name="Also works" options={pairs(v.muscles)} value={f.secondary} onChange={x => set("secondary", x)} /></Field>
      <Field name="Loads"><Chips name="Loads" options={pairs(v.joints)} value={f.joints} onChange={x => set("joints", x)} /></Field>
      <Field name="Involves"><Chips name="Involves" options={entries(v.facts)} value={f.facts} onChange={x => set("facts", x)} /></Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field name="A particular piece it needs">
          <select className="cx-input text-sm" value={f.piece} onChange={e => set("piece", e.target.value)}>
            <option value="">None</option>
            {v.pieces.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </Field>
        <Field name="Counted each side">
          <select className="cx-input text-sm" value={f.perSide} onChange={e => set("perSide", e.target.value)}>
            <option value="">As usual for it</option><option value="true">Yes</option><option value="false">No</option>
          </select>
        </Field>
      </div>
      <Field name="Counted in (none chosen: as the family is)"><Chips name="Counted in" options={pairs(v.measures)} value={f.measure} onChange={x => set("measure", x)} /></Field>
      <Field name="One step easier"><ExercisePicker name="One step easier" value={f.easier} exclude={raw.id} onChange={x => set("easier", x)} /></Field>
      <Field name="One step harder"><ExercisePicker name="One step harder" value={f.harder} exclude={raw.id} onChange={x => set("harder", x)} /></Field>
      <Problems error={error} />
      <SaveRow busy={busy} onCancel={onCancel} word={word} />
    </form>
  );
}

/* A family: its name, what it is for, where it sits in a session. */
export function FamilyForm({ initial = {}, onSave, onCancel, busy, error, children, word }) {
  const v = useVocabulary();
  const [f, setF] = useState(() => ({
    label: initial.label || "", pattern: initial.pattern || "", purposes: initial.purposes || [], roles: initial.roles || [],
    needs: initial.needs || [], measure: initial.measure || [], perSide: !!initial.perSide, implementInName: !!initial.implementInName,
    discipline: initial.discipline || "",
  }));
  if (!v) return <p className="text-sm" style={muted}>Loading…</p>;
  const set = (k, val) => setF(d => ({ ...d, [k]: val }));
  return (
    <form className="grid gap-3 mt-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <Field name="Family name"><input className="cx-input" value={f.label} maxLength={80} required onChange={e => set("label", e.target.value)} /></Field>
      <Field name="Movement pattern">
        <select className="cx-input" value={f.pattern} required onChange={e => set("pattern", e.target.value)}>
          <option value="">Choose…</option>
          {entries(v.patterns).map(([k, w]) => <option key={k} value={k}>{w}</option>)}
        </select>
      </Field>
      <Field name="What it is for"><Chips name="What it is for" options={entries(v.purposes)} value={f.purposes} onChange={x => set("purposes", x)} /></Field>
      <Field name="Where it sits in a session"><Chips name="Where it sits" options={entries(v.roles)} value={f.roles} onChange={x => set("roles", x)} /></Field>
      <Field name="Always needs"><Chips name="Always needs" options={v.kinds.map(k => [k.key, k.label])} value={f.needs} onChange={x => set("needs", x)} /></Field>
      <Field name="Usually counted in"><Chips name="Usually counted in" options={pairs(v.measures)} value={f.measure} onChange={x => set("measure", x)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.perSide} onChange={e => set("perSide", e.target.checked)} /> Always counted each side</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.implementInName} onChange={e => set("implementInName", e.target.checked)} /> Its name already says the equipment (Leg Press, Box Jump)</label>
      <Field name="Discipline">
        <select className="cx-input text-sm" value={f.discipline} onChange={e => set("discipline", e.target.value)}>
          <option value="">None</option>{v.disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      {children}
      <Problems error={error} />
      <SaveRow busy={busy} onCancel={onCancel} word={word} />
    </form>
  );
}

/* A condition: what to avoid, what to make easier, when to send them on. */
export function ConditionForm({ initial = {}, onSave, onCancel, busy, error, word }) {
  const v = useVocabulary();
  const [f, setF] = useState(() => ({
    label: initial.label || "",
    avoid: { facts: initial.avoid?.facts || [], joints: initial.avoid?.joints || [] },
    modify: { facts: initial.modify?.facts || [], joints: initial.modify?.joints || [] },
    clearance: !!initial.clearance, refer: initial.refer || "",
  }));
  if (!v) return <p className="text-sm" style={muted}>Loading…</p>;
  const part = (p, k, x) => setF(d => ({ ...d, [p]: { ...d[p], [k]: x } }));
  return (
    <form className="grid gap-3 mt-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <Field name="Its name"><input className="cx-input" value={f.label} maxLength={80} required onChange={e => setF(d => ({ ...d, label: e.target.value }))} /></Field>
      <Field name="Avoid"><Chips name="Avoid" options={entries(v.facts)} value={f.avoid.facts} onChange={x => part("avoid", "facts", x)} /></Field>
      <Field name="Avoid loading"><Chips name="Avoid loading" options={pairs(v.joints)} value={f.avoid.joints} onChange={x => part("avoid", "joints", x)} /></Field>
      <Field name="Make easier or supported"><Chips name="Make easier" options={entries(v.facts)} value={f.modify.facts} onChange={x => part("modify", "facts", x)} /></Field>
      <Field name="Take care loading"><Chips name="Take care loading" options={pairs(v.joints)} value={f.modify.joints} onChange={x => part("modify", "joints", x)} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.clearance} onChange={e => setF(d => ({ ...d, clearance: e.target.checked }))} /> A doctor's go-ahead comes first</label>
      <Field name="When to send them on">
        <textarea className="cx-input text-sm" rows={3} maxLength={400} value={f.refer} required onChange={e => setF(d => ({ ...d, refer: e.target.value }))} />
      </Field>
      <Problems error={error} />
      <SaveRow busy={busy} onCancel={onCancel} word={word} />
    </form>
  );
}

/* Changes to the library, newest first, each with Undo while it can be. */
/** A principle: its title, what it covers, and its text in Markdown. */
export function PrincipleForm({ initial = {}, onSave, onCancel, busy, error, word }) {
  const [f, setF] = useState(() => ({ title: initial.title || "", covers: initial.covers || "", body: initial.body || "" }));
  const set = (k) => (e) => setF(d => ({ ...d, [k]: e.target.value }));
  return (
    <form className="grid gap-3 mt-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <Field name="Title"><input className="cx-input" value={f.title} maxLength={80} required onChange={set("title")} /></Field>
      <Field name="What it covers, in a line"><input className="cx-input" value={f.covers} maxLength={200} required onChange={set("covers")} /></Field>
      <Field name="The text">
        <textarea className="cx-input text-sm font-mono" rows={18} value={f.body} required onChange={set("body")} />
      </Field>
      <p className="text-xs -mt-2" style={muted}>
        "## " starts a heading, "- " a point, "1. " a numbered step; **two stars** make words bold. A link to another topic is
        written [its words](rest.md).
      </p>
      <Problems error={error} />
      <SaveRow busy={busy} onCancel={onCancel} word={word} />
    </form>
  );
}

export function ChangeList({ changes, onUndo, busy, error }) {
  if (!changes) return <p className="text-sm" style={muted}>Loading…</p>;
  if (!changes.length) return <p className="text-sm" style={muted}>No changes yet.</p>;
  return (
    <div className="grid gap-2">
      <Problems error={error} />
      <ul>
        {changes.map(c => (
          <li key={c.id} className="py-2 border-t first:border-t-0 flex items-start justify-between gap-3" style={{ borderColor: "var(--iron-line)" }}>
            <span className="min-w-0 text-sm">
              <span className="block" style={c.undoneBy ? { textDecoration: "line-through", color: "var(--iron)" } : undefined}>{c.summary}</span>
              <span className="block text-xs" style={muted}>
                {c.by} · {new Date(c.at).toLocaleString()}{c.undoneBy ? " · undone" : ""}
              </span>
            </span>
            {!c.undoneBy && c.touches.length > 0 && (
              <button type="button" className="cx-btn-row flex-none" disabled={busy} onClick={() => onUndo(c)}>
                <Undo2 size={15} aria-hidden="true" /> Undo
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Adding to a list: Studio's secondary button, full width, inside its card. */
export const AddButton = ({ onClick, children }) => (
  <button type="button" className="cx-btn-quiet w-full py-2 text-sm" onClick={onClick}>
    <Plus size={14} aria-hidden="true" /> {children}
  </button>
);
