import React, { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";

/* The conditions and facts Coach knows, asked for once. */
let known = null;
const loadKnown = () => (known ||= apiRequest("GET", "/coach-iq/conditions").catch((err) => { known = null; throw err; }));

/* One choice among many, on or off. */
function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className="text-xs px-2.5 py-1 rounded-full border transition-colors"
      style={on
        ? { background: "var(--cerulean)", color: "#fff", borderColor: "var(--cerulean)" }
        : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" }}>
      {children}
    </button>
  );
}

/**
 * A client's limitations (ideas audit, 22): in plain words, as their trainer
 * wrote them, with what each means for exercises. Every trainer of the
 * client sees them, with who wrote each; only the writer may delete one.
 * Billy reads them before suggesting anything for this client.
 */
export function Limitations({ clientId, onSignedOut }) {
  const [list, setList] = useState(null);
  const [options, setOptions] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [draft, setDraft] = useState({ text: "", conditions: [], facts: [] });

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);

  useEffect(() => {
    let alive = true;
    Promise.all([apiRequest("GET", `/clients/${clientId}/limitations`), loadKnown()])
      .then(([{ limitations }, k]) => { if (alive) { setList(limitations); setOptions(k); } })
      .catch((err) => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [clientId, fail]);

  const send = async (method, path, body) => {
    setBusy(true); setError("");
    try { const out = await apiRequest(method, path, body); setList(out.limitations); return true; }
    catch (err) { fail(err); return false; }
    finally { setBusy(false); }
  };
  const toggle = (field, key) => setDraft(d => ({ ...d, [field]: d[field].includes(key) ? d[field].filter(k => k !== key) : [...d[field], key] }));
  const labelOf = (key) => options?.conditions.find(c => c.key === key)?.label || key;

  return (
    <div className="sm:col-span-2 mt-2 pt-3 border-t" style={{ borderColor: "var(--iron-line)" }}>
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        <span className="text-sm font-semibold">Limitations</span>
      </div>
      {error && <p className="text-sm my-1" style={{ color: "var(--ember)" }}>{error}</p>}
      {!list ? (!error && <p className="text-sm" style={{ color: "var(--iron)" }}>Loading…</p>) : (
        <>
          {list.length === 0 && !adding && <p className="text-sm" style={{ color: "var(--iron)" }}>None written down.</p>}
          <ul className="space-y-2">
            {list.map(l => (
              <li key={l.id} className="text-sm rounded-lg p-2.5" style={{ background: "var(--ghost-fill)" }}>
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block cx-wrap">{l.text}</span>
                    {(l.conditions.length > 0 || l.facts.length > 0) && (
                      <span className="block text-xs mt-1" style={{ color: "var(--iron)" }}>
                        {[...l.conditions.map(labelOf), ...l.facts.map(f => `no ${options?.facts[f] || f}`)].join(" · ")}
                      </span>
                    )}
                    <span className="block text-xs mt-1" style={{ color: "var(--iron)" }}>Written by {l.mine ? "you" : l.writtenBy}</span>
                  </span>
                  {l.mine && deleting !== l.id && (
                    <button type="button" className="cx-icon-btn" aria-label="Delete this limitation"
                      title="Delete" onClick={() => setDeleting(l.id)}>
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {/* An inline confirmation, Studio's: a pale red box, the red
                    button and a quiet way out, in ink-soft (iron on the pale
                    red is too faint to read). */}
                {deleting === l.id && (
                  <div className="mt-2 rounded-lg p-2.5 flex flex-wrap items-center gap-2" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
                    <span className="text-sm flex-1 min-w-[10rem]">Delete this limitation? Its trainers will no longer see it.</span>
                    <span className="flex items-center gap-1">
                      <button type="button" className="cx-btn-ember px-3 py-1.5 text-sm" disabled={busy} aria-busy={busy}
                        onClick={async () => { if (await send("DELETE", `/limitations/${l.id}`)) setDeleting(null); }}>{busy ? "Deleting…" : "Delete"}</button>
                      <button type="button" className="px-3 py-1.5 text-sm" style={{ color: "var(--ink-soft)" }} onClick={() => setDeleting(null)}>Keep it</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {adding ? (
            <form className="mt-2 grid gap-2" onSubmit={async (e) => {
              e.preventDefault();
              if (await send("POST", `/clients/${clientId}/limitations`, draft)) { setAdding(false); setDraft({ text: "", conditions: [], facts: [] }); }
            }}>
              <textarea className="cx-input text-sm" rows={2} maxLength={300} value={draft.text} aria-label="The limitation, in plain words"
                placeholder="In plain words, such as: no kneeling, new knee in March"
                onChange={e => setDraft(d => ({ ...d, text: e.target.value }))} />
              <div className="text-xs" style={{ color: "var(--iron)" }}>What it means (optional):</div>
              <div className="flex flex-wrap gap-1.5">
                {options?.conditions.map(c => <Chip key={c.key} on={draft.conditions.includes(c.key)} onClick={() => toggle("conditions", c.key)}>{c.label}</Chip>)}
              </div>
              <div className="text-xs" style={{ color: "var(--iron)" }}>Keep away from (optional):</div>
              <div className="flex flex-wrap gap-1.5">
                {options && Object.entries(options.facts).map(([k, words]) => <Chip key={k} on={draft.facts.includes(k)} onClick={() => toggle("facts", k)}>{words}</Chip>)}
              </div>
              <p className="text-xs" style={{ color: "var(--iron)" }}>
                Every trainer of this client sees this. Write what it means for training, not a diagnosis.
              </p>
              <div className="flex gap-2">
                <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy || !draft.text.trim()} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
                <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <button type="button" className="cx-btn-quiet w-full mt-3 py-2 text-sm" onClick={() => setAdding(true)}>
              <Plus size={14} aria-hidden="true" /> Add a limitation
            </button>
          )}
        </>
      )}
    </div>
  );
}
