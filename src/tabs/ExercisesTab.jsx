import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, Search, Send, Undo2, Link2, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";

const ByBilly = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,162,220,0.22)", color: "var(--ink)" }}>
    <Sparkles size={11} aria-hidden="true" /> Noted by Billy
  </span>
);

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };

/* Search Coach IQ's library and pick one. */
function LibraryPicker({ onPick, onCancel, busy }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState(null);
  useEffect(() => {
    if (q.trim().length < 2) { setFound(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      apiRequest("GET", `/coach-iq/exercises?q=${encodeURIComponent(q.trim())}`)
        .then(({ exercises }) => { if (alive) setFound(exercises); })
        .catch(() => { if (alive) setFound([]); });
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  return (
    <div className="mt-2 grid gap-2">
      <div className="flex items-center gap-2">
        <input className="cx-input" autoFocus value={q} maxLength={120} placeholder="Search the library, such as goblet squat"
          aria-label="Search the library" onChange={e => setQ(e.target.value)} />
        <button type="button" className="cx-billy-icon flex-none" style={{ width: 34, height: 34 }} onClick={onCancel} aria-label="Cancel" title="Cancel">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {found && (found.length === 0 ? (
        <p className="text-xs" style={muted}>Nothing in the library by that name.</p>
      ) : (
        <ul className="rounded-lg overflow-hidden border" style={line}>
          {found.map(x => (
            <li key={x.id} className="border-t first:border-t-0" style={line}>
              <button type="button" disabled={busy} onClick={() => onPick(x)} className="w-full text-left px-3 py-2 hover:bg-(--ghost-fill)">
                <span className="block text-sm font-medium">{x.name}</span>
                <span className="block text-xs" style={muted}>{x.master}</span>
              </button>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

/* A private exercise's details: what it's called, its movement, what it
   needs and works. */
function OwnForm({ initial, data, busy, onSave, onCancel }) {
  const [f, setF] = useState(() => ({ name: "", familyId: "", needs: [], primary: [], note: "", ...initial }));
  const toggle = (field, key) => setF(d => ({ ...d, [field]: d[field].includes(key) ? d[field].filter(k => k !== key) : [...d[field], key] }));
  const chip = (on) => on
    ? { background: "var(--cerulean)", color: "#fff", borderColor: "var(--cerulean)" }
    : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" };
  return (
    <form className="mt-2 grid gap-2" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
      <input className="cx-input" value={f.name} maxLength={120} placeholder="Its name" aria-label="Its name"
        onChange={e => setF(d => ({ ...d, name: e.target.value }))} />
      <select className="cx-input" value={f.familyId} aria-label="The movement it is closest to" onChange={e => setF(d => ({ ...d, familyId: e.target.value }))}>
        <option value="">The movement it is closest to (optional)</option>
        {data.families.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
      <div className="text-xs" style={muted}>What it needs:</div>
      <div className="flex flex-wrap gap-1.5">
        {data.kinds.map(k => (
          <button key={k.key} type="button" aria-pressed={f.needs.includes(k.key)} onClick={() => toggle("needs", k.key)}
            className="text-xs px-2.5 py-1 rounded-full border" style={chip(f.needs.includes(k.key))}>{k.label}</button>
        ))}
      </div>
      <div className="text-xs" style={muted}>What it mainly works:</div>
      <div className="flex flex-wrap gap-1.5">
        {data.muscles.map(m => (
          <button key={m} type="button" aria-pressed={f.primary.includes(m)} onClick={() => toggle("primary", m)}
            className="text-xs px-2.5 py-1 rounded-full border" style={chip(f.primary.includes(m))}>{m}</button>
        ))}
      </div>
      <textarea className="cx-input text-sm" rows={2} maxLength={300} value={f.note} placeholder="How it's done (optional)"
        aria-label="How it's done" onChange={e => setF(d => ({ ...d, note: e.target.value }))} />
      <div className="flex gap-2">
        <button type="submit" className="cx-btn-primary px-4 py-2 text-sm" disabled={busy || !f.name.trim()}>Save</button>
        <button type="button" className="px-4 py-2 text-sm cx-link" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/**
 * My exercises (ideas audit, 3): the trainer's own names for exercises, each
 * tied to Coach IQ's library or to an exercise of their own; names still to
 * sort out (from a scanned program, or told to Billy); and their own
 * exercises, each of which can be suggested to Glenn for the shared library.
 * Their word wins: Billy calls an exercise what they call it.
 */
export function ExercisesTab({ onSignedOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);   // what is being done: { id, mode }
  const [newName, setNewName] = useState("");
  const [suggestNote, setSuggestNote] = useState("");

  const call = useCallback(async (method, path, body) => {
    setBusy(true);
    setError("");
    try {
      const out = await apiRequest(method, path, body);
      setData(out);
      return out;
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [onSignedOut]);

  useEffect(() => { call("GET", "/my-exercises"); }, [call]);

  const done = (out) => { if (out) setOpen(null); };
  const is = (id, mode) => open?.id === id && open?.mode === mode;
  const toSort = data?.names.filter(n => !n.exerciseId) || [];
  const tied = data?.names.filter(n => n.exerciseId) || [];

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>My exercises</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={muted}>
        What you call your exercises, and exercises of your own. Billy uses your names when he talks to you.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--ember)" }}>{error}</p>}

      {!data ? (
        !error && <p className="text-sm" style={muted}>Loading your exercises…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <div className="grid gap-4">
            {toSort.length > 0 && (
              <section className="cx-card p-4">
                <h2 className="font-semibold">Names to sort out</h2>
                <p className="text-xs mt-0.5 mb-2" style={muted}>
                  Names Coach didn't recognise. Find each one in the library, or keep it as an exercise of your own.
                </p>
                <ul>
                  {toSort.map(n => (
                    <li key={n.id} className="py-2 border-t first:border-t-0" style={line}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium min-w-0 truncate">{n.name}</span>
                        <button type="button" disabled={busy} onClick={() => call("DELETE", `/my-exercises/names/${n.id}`)}
                          className="cx-billy-icon flex-none" style={{ width: 30, height: 30 }} aria-label={`Remove ${n.name}`} title="Remove">
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                      {n.source === "billy" && <div className="mt-1"><ByBilly /></div>}
                      {is(n.id, "find") ? (
                        <LibraryPicker busy={busy} onCancel={() => setOpen(null)}
                          onPick={async (x) => done(await call("PATCH", `/my-exercises/names/${n.id}`, { exerciseId: x.id }))} />
                      ) : is(n.id, "own") ? (
                        <OwnForm initial={{ name: n.name }} data={data} busy={busy} onCancel={() => setOpen(null)}
                          onSave={async (f) => done(await call("POST", "/my-exercises/own", { ...f, fromName: n.id }))} />
                      ) : (
                        <div className="flex flex-wrap gap-3 mt-1 text-sm">
                          <button type="button" className="inline-flex items-center gap-1 cx-link" onClick={() => setOpen({ id: n.id, mode: "find" })}>
                            <Search size={14} aria-hidden="true" /> Find it in the library
                          </button>
                          <button type="button" className="inline-flex items-center gap-1 cx-link" onClick={() => setOpen({ id: n.id, mode: "own" })}>
                            <Plus size={14} aria-hidden="true" /> Keep it as my own
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="cx-card p-4">
              <h2 className="font-semibold">My names</h2>
              <p className="text-xs mt-0.5 mb-2" style={muted}>What you call an exercise, and what it is.</p>
              {tied.length === 0 ? (
                <p className="text-sm py-2" style={muted}>None yet.</p>
              ) : (
                <ul>
                  {tied.map(n => (
                    <li key={n.id} className="py-2 border-t first:border-t-0" style={line}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{n.name}</span>
                          <span className="block text-xs" style={muted}>
                            {n.library ? n.library.master : n.own ? `Your own: ${n.own.name}` : ""}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 flex-none">
                          <button type="button" className="cx-billy-icon" style={{ width: 30, height: 30 }} onClick={() => setOpen({ id: n.id, mode: "find" })}
                            aria-label={`Change what ${n.name} is`} title="Change">
                            <Link2 size={15} aria-hidden="true" />
                          </button>
                          <button type="button" disabled={busy} onClick={() => call("DELETE", `/my-exercises/names/${n.id}`)}
                            className="cx-billy-icon" style={{ width: 30, height: 30 }} aria-label={`Remove ${n.name}`} title="Remove">
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                      {n.source === "billy" && <div className="mt-1"><ByBilly /></div>}
                      {is(n.id, "find") && (
                        <LibraryPicker busy={busy} onCancel={() => setOpen(null)}
                          onPick={async (x) => done(await call("PATCH", `/my-exercises/names/${n.id}`, { exerciseId: x.id }))} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <form className="mt-3 pt-3 border-t grid gap-2" style={line}
                onSubmit={(e) => { e.preventDefault(); setOpen({ id: "new", mode: "find" }); }}>
                <div className="text-sm font-medium">Add a name</div>
                <input className="cx-input" value={newName} maxLength={120} placeholder="What you call it, such as Bulgarians"
                  aria-label="What you call it" onChange={e => setNewName(e.target.value)} />
                {is("new", "find") ? (
                  <LibraryPicker busy={busy} onCancel={() => setOpen(null)}
                    onPick={async (x) => {
                      const out = await call("POST", "/my-exercises/names", { name: newName.trim(), exerciseId: x.id });
                      if (out) { setOpen(null); setNewName(""); }
                    }} />
                ) : (
                  <button type="submit" className="cx-btn-primary py-2 text-sm inline-flex items-center justify-center gap-2" disabled={busy || !newName.trim()}>
                    <Search size={16} aria-hidden="true" /> Find what it is
                  </button>
                )}
              </form>
            </section>
          </div>

          <section className="cx-card p-4">
            <h2 className="font-semibold">My own exercises</h2>
            <p className="text-xs mt-0.5 mb-2" style={muted}>
              Exercises the library doesn't have. Suggest one and it may be added to everybody's library.
            </p>
            {data.exercises.length === 0 && !is("new", "own") && <p className="text-sm py-2" style={muted}>None yet.</p>}
            <ul>
              {data.exercises.map(x => (
                <li key={x.id} className="py-2 border-t first:border-t-0" style={line}>
                  {is(x.id, "edit") ? (
                    <OwnForm initial={x} data={data} busy={busy} onCancel={() => setOpen(null)}
                      onSave={async (f) => done(await call("PATCH", `/my-exercises/own/${x.id}`, f))} />
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <button type="button" className="min-w-0 text-left" onClick={() => setOpen({ id: x.id, mode: "edit" })} title="Change">
                          <span className="block text-sm font-medium">{x.name}</span>
                          <span className="block text-xs" style={muted}>
                            {[x.family, x.primary.join(", "), x.needs.map(k => data.kinds.find(c => c.key === k)?.label || k).join(", ")].filter(Boolean).join(" · ")}
                          </span>
                          {x.note && <span className="block text-xs mt-0.5" style={muted}>{x.note}</span>}
                        </button>
                        <button type="button" disabled={busy} onClick={() => call("DELETE", `/my-exercises/own/${x.id}`)}
                          className="cx-billy-icon flex-none" style={{ width: 30, height: 30 }} aria-label={`Remove ${x.name}`} title="Remove">
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                      {x.suggestedAt ? (
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs" style={muted}>
                          <span>Suggested for the library on {new Date(x.suggestedAt).toLocaleDateString()}</span>
                          <button type="button" className="inline-flex items-center gap-1 cx-link" disabled={busy}
                            onClick={() => call("DELETE", `/my-exercises/own/${x.id}/suggestion`)}>
                            <Undo2 size={12} aria-hidden="true" /> Take back
                          </button>
                        </div>
                      ) : is(x.id, "suggest") ? (
                        <form className="mt-2 grid gap-2" onSubmit={async (e) => {
                          e.preventDefault();
                          if (await call("PUT", `/my-exercises/own/${x.id}/suggestion`, { note: suggestNote.trim() })) { setOpen(null); setSuggestNote(""); }
                        }}>
                          <textarea className="cx-input text-sm" rows={2} maxLength={300} value={suggestNote} autoFocus
                            placeholder="Why it belongs in the library (optional)" aria-label="Why it belongs in the library"
                            onChange={e => setSuggestNote(e.target.value)} />
                          <div className="flex gap-2">
                            <button type="submit" className="cx-btn-primary px-4 py-2 text-sm" disabled={busy}>Suggest it</button>
                            <button type="button" className="px-4 py-2 text-sm cx-link" onClick={() => setOpen(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" className="mt-1 inline-flex items-center gap-1 text-sm cx-link" onClick={() => setOpen({ id: x.id, mode: "suggest" })}>
                          <Send size={14} aria-hidden="true" /> Suggest for the library
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            {is("new", "own") ? (
              <OwnForm data={data} busy={busy} onCancel={() => setOpen(null)}
                onSave={async (f) => done(await call("POST", "/my-exercises/own", f))} />
            ) : (
              <button type="button" className="mt-2 inline-flex items-center gap-1 text-sm cx-link" onClick={() => setOpen({ id: "new", mode: "own" })}>
                <Plus size={14} aria-hidden="true" /> Add an exercise of my own
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
