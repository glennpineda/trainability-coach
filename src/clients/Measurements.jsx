import React, { useCallback, useEffect, useState } from "react";
import { ChartLine, ChevronDown, Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { MEASURES, toShown, unitOf, rowsOf, previousOf, waistToHip } from "../lib/measures";
import { Trend } from "./Trend";

/*
 * A client's body measurements (Glenn, 18 Oct 2026): weight, body fat, and
 * girths, arm, thigh and calf left and right, one set per day taken, under
 * Limitations on the client's details and laid out as they are. Studio has
 * none to copy. Every trainer of the client sees them with who took each
 * set; only that trainer may change or delete one. In the trainer's own units
 * (Units, in the account menu); kept in metric (src/lib/measures.js).
 */

const today = () => new Date().toISOString().slice(0, 10);
const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/* One set's values, two to a row from sm, each with how it changed since
   the set before in grey: up or down is a fact, not good or bad
   (measures.js, rowsOf, which adds the waist-to-hip ratio and puts blood
   pressure on one row). */
function Values({ set, previous, units }) {
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {rowsOf(set.values, previous?.values, units).map(r => (
        <div key={r.key} className="flex items-baseline justify-between gap-2 min-w-0">
          <dt className="truncate" style={{ color: "var(--iron)" }}>{r.label}</dt>
          <dd className="text-right whitespace-nowrap tabular-nums">
            {r.text}
            {previous && r.change && <span className="block text-xs" style={{ color: "var(--iron)" }}>{r.change}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* What can be charted, in the order the sets show them: each measurement
   (blood pressure as its two numbers on one chart) and the waist-to-hip
   ratio, with the newest set of each day. Only those taken on two days or
   more. */
function charts(list, units) {
  const byDay = new Map();
  /* Oldest first, so a day's later set wins for what it has; what it left
     empty keeps the earlier one's. */
  for (const set of [...list].reverse()) {
    const had = byDay.get(set.takenOn) || {};
    byDay.set(set.takenOn, { ...had, ...Object.fromEntries(Object.entries(set.values).filter(([, v]) => v != null)) });
  }
  const days = [...byDay.keys()].sort();
  const pts = (get) => days.map(date => ({ date, value: get(byDay.get(date)) })).filter(p => p.value != null);
  const out = [];
  for (const m of MEASURES) {
    if (m.key === "bpDia") continue;
    if (m.key === "bpSys") {
      const top = pts(v => (v.bpSys != null && v.bpDia != null ? Math.round(v.bpSys) : null));
      const bottom = pts(v => (v.bpSys != null && v.bpDia != null ? Math.round(v.bpDia) : null));
      out.push({ key: "bp", label: "Blood pressure", series: [{ name: "Top", points: top }, { name: "Bottom", points: bottom }], format: (v) => `${v} mmHg`, unit: "mmHg" });
      continue;
    }
    const u = unitOf(m, units);
    out.push({ key: m.key, label: m.label, series: [{ name: m.label, points: pts(v => toShown(m, v[m.key], units)) }], format: (v) => (u === "%" ? `${v}%` : `${v} ${u}`) });
    if (m.key === "hips") out.push({ key: "waistToHip", label: "Waist to hip", series: [{ name: "Waist to hip", points: pts(v => waistToHip(v)) }], format: (v) => v.toFixed(2) });
  }
  return out.filter(c => c.series[0].points.length >= 2);
}

/* The progress chart, with a choice of what it shows. */
function Progress({ list, units }) {
  const options = charts(list, units);
  const [key, setKey] = useState(options[0]?.key);
  const c = options.find(o => o.key === key) || options[0];
  if (!c) return <p className="text-sm mt-2" style={{ color: "var(--iron)" }}>A chart needs measurements taken on two days or more.</p>;
  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which measurement to chart">
        {options.map(o => (
          <button key={o.key} type="button" aria-pressed={o.key === c.key} onClick={() => setKey(o.key)}
            className="cx-chip text-xs px-2.5 py-1 rounded-full border"
            style={o.key === c.key ? { background: "var(--fill-cerulean)", color: "#fff", borderColor: "var(--fill-cerulean)" } : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" }}>{o.label}</button>
        ))}
      </div>
      <Trend series={c.series} format={c.format} label={`${c.label} over time`} />
    </div>
  );
}

function Form({ units, initial, busy, onSave, onCancel }) {
  const [takenOn, setTakenOn] = useState(initial?.takenOn || today());
  const [note, setNote] = useState(initial?.note || "");
  const [values, setValues] = useState(() => Object.fromEntries(MEASURES.map(m => [m.key, initial ? String(toShown(m, initial.values[m.key], units) ?? "") : ""])));
  const box = (m) => (
    <label key={m.key} className="grid gap-1 text-xs min-w-0" style={{ color: "var(--iron)" }}>
      {m.pair ? m.side : m.label}
      <span className="relative">
        <input type="text" inputMode="decimal" className="cx-input" style={{ color: "var(--ink)", paddingRight: "2.4rem" }}
          value={values[m.key]} onChange={e => setValues(v => ({ ...v, [m.key]: e.target.value }))} aria-label={`${m.label}, ${unitOf(m, units)}`} />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--iron)" }} aria-hidden="true">{unitOf(m, units)}</span>
      </span>
    </label>
  );
  const groups = [];
  for (const m of MEASURES) {
    const last = groups[groups.length - 1];
    if (last && (last.pair || null) === (m.pair || null)) last.items.push(m);
    else groups.push({ pair: m.pair || null, items: [m] });
  }
  return (
    <form className="mt-2 grid gap-3" onSubmit={(e) => { e.preventDefault(); onSave({ takenOn, note, values, units }); }}>
      <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Taken on
        <input type="date" className="cx-input" style={{ color: "var(--ink)" }} max={today()} value={takenOn} onChange={e => setTakenOn(e.target.value)} />
      </label>
      {/* In MEASURES' order: runs of single ones two to a row, and each pair
          (left and right, or blood pressure's two numbers) under its name. */}
      {groups.map(g => (g.pair ? (
        <fieldset key={g.pair} className="grid gap-1">
          <legend className="text-xs font-medium mb-1" style={{ color: "var(--ink-soft)" }}>{g.pair}</legend>
          <div className="grid grid-cols-2 gap-2">{g.items.map(box)}</div>
        </fieldset>
      ) : (
        <div key={g.items[0].key} className="grid grid-cols-2 gap-2">{g.items.map(box)}</div>
      )))}
      <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Note (optional)
        <textarea className="cx-input text-sm" rows={2} maxLength={1000} style={{ color: "var(--ink)" }} value={note}
          placeholder="Such as: taken before breakfast, tape at the navel" onChange={e => setNote(e.target.value)} />
      </label>
      <p className="text-xs" style={{ color: "var(--iron)" }}>Fill in only what you took. Every trainer of this client sees these.</p>
      <div className="flex gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export function Measurements({ clientId, onSignedOut }) {
  const [data, setData] = useState(null);   // { measurements, units }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);   // "new", or a set's id
  const [deleting, setDeleting] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [chart, setChart] = useState(false);

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/clients/${clientId}/measurements`).then(d => { if (alive) setData(d); }).catch(err => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [clientId, fail]);

  const send = async (method, path, body) => {
    setBusy(true); setError("");
    try { setData(await apiRequest(method, path, body)); return true; }
    catch (err) { fail(err); return false; }
    finally { setBusy(false); }
  };

  const list = data?.measurements || [];
  const units = data?.units || "imperial";
  const latest = list[0];
  const rest = list.slice(1);

  return (
    <div className="sm:col-span-2 mt-2 pt-3 border-t" style={{ borderColor: "var(--iron-line)" }}>
      <div className="flex items-center gap-2 mb-1">
        <Ruler size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        <span className="text-sm font-semibold">Measurements</span>
      </div>
      {error && <p className="text-sm my-1" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {!data ? (!error && <p className="text-sm" style={{ color: "var(--iron)" }}>Loading…</p>) : (
        <>
          {list.length === 0 && editing !== "new" && <p className="text-sm" style={{ color: "var(--iron)" }}>None taken yet.</p>}
          {[latest, ...(showAll ? rest : [])].filter(Boolean).map((set, i) => {
            const previous = previousOf(list, set);
            return (
              <div key={set.id} className="text-sm rounded-lg p-2.5 mt-2" style={{ background: "var(--ghost-fill)" }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="min-w-0">
                    <span className="block font-medium">{i === 0 ? "Latest: " : ""}{dateText(set.takenOn)}</span>
                    <span className="block text-xs" style={{ color: "var(--iron)" }}>
                      Taken by {set.mine ? "you" : set.takenBy}{previous ? ` · changes since ${dateText(previous.takenOn)}` : ""}
                    </span>
                  </span>
                  {set.mine && editing !== set.id && deleting !== set.id && (
                    <span className="flex gap-1">
                      <button type="button" className="cx-icon-btn" aria-label="Change these measurements" title="Change" onClick={() => setEditing(set.id)}><Pencil size={15} aria-hidden="true" /></button>
                      <button type="button" className="cx-icon-btn" aria-label="Delete these measurements" title="Delete" onClick={() => setDeleting(set.id)}><Trash2 size={15} aria-hidden="true" /></button>
                    </span>
                  )}
                </div>
                {editing === set.id ? (
                  <Form units={units} initial={set} busy={busy} onCancel={() => setEditing(null)}
                    onSave={async (body) => { if (await send("PUT", `/measurements/${set.id}`, body)) setEditing(null); }} />
                ) : (
                  <>
                    <Values set={set} previous={previous} units={units} />
                    {set.note && <p className="text-xs mt-2" style={{ color: "var(--iron)" }}>{set.note}</p>}
                  </>
                )}
                {/* The inline confirmation Limitations uses. */}
                {deleting === set.id && (
                  <div className="mt-2 rounded-lg p-2.5 flex flex-wrap items-center gap-2" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
                    <span className="text-sm flex-1 min-w-[10rem]">Delete these measurements? Its trainers will no longer see them.</span>
                    <span className="flex items-center gap-1">
                      <button type="button" className="cx-btn-ember px-3 py-1.5 text-sm" disabled={busy} aria-busy={busy}
                        onClick={async () => { if (await send("DELETE", `/measurements/${set.id}`)) setDeleting(null); }}>{busy ? "Deleting…" : "Delete"}</button>
                      <button type="button" className="px-3 py-1.5 text-sm" style={{ color: "var(--ink-soft)" }} onClick={() => setDeleting(null)}>Keep it</button>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {rest.length > 0 && (
            <button type="button" className="cx-link text-sm mt-2 mr-4" aria-expanded={chart} onClick={() => setChart(s => !s)}>
              <ChartLine size={14} aria-hidden="true" /> {chart ? "Hide progress" : "Show progress"}
            </button>
          )}
          {rest.length > 0 && (
            <button type="button" className="cx-link text-sm mt-2" aria-expanded={showAll} onClick={() => setShowAll(s => !s)}>
              <ChevronDown size={14} aria-hidden="true" style={{ transform: showAll ? "rotate(180deg)" : undefined }} />
              {showAll ? "Show only the latest" : `Earlier measurements (${rest.length})`}
            </button>
          )}
          {chart && rest.length > 0 && <Progress list={list} units={units} />}

          {editing === "new" ? (
            <Form units={units} busy={busy} onCancel={() => setEditing(null)}
              onSave={async (body) => { if (await send("POST", `/clients/${clientId}/measurements`, body)) setEditing(null); }} />
          ) : (
            <button type="button" className="cx-btn-quiet w-full mt-3 py-2 text-sm" onClick={() => setEditing("new")}>
              <Plus size={14} aria-hidden="true" /> Add measurements
            </button>
          )}
        </>
      )}
    </div>
  );
}
