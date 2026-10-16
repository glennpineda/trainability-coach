import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";

/* Yes and No side by side; the chosen one filled. Tapping the chosen one
   again takes the answer back. */
function YesNo({ value, onChange, disabled, label }) {
  return (
    <div className="flex rounded-[10px] p-0.5 gap-0.5 flex-none" style={{ background: "var(--ghost-fill)" }} role="group" aria-label={label}>
      {[[true, "Yes"], [false, "No"]].map(([v, word]) => {
        const on = value === v;
        return (
          <button key={word} type="button" disabled={disabled} aria-pressed={on}
            onClick={() => onChange(on ? null : v)}
            className="px-3.5 py-1 rounded-lg text-sm font-medium transition-colors"
            style={on
              ? { background: v ? "var(--cerulean)" : "var(--chalk)", color: v ? "#fff" : "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" }
              : { color: "var(--iron)" }}>
            {word}
          </button>
        );
      })}
    </div>
  );
}

const ByBilly = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,162,220,0.22)", color: "var(--ink)" }}>
    <Sparkles size={11} aria-hidden="true" /> Noted by Billy
  </span>
);

/**
 * My equipment: the first part of a trainer's personal memory
 * (coach-iq/README.md). The short checklist, and the particular pieces Billy
 * has asked about or the trainer has added. Everything saves as it is tapped;
 * what Billy wrote down is marked, and can be changed or removed here.
 */
export function EquipmentTab({ onSignedOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "", has: true, where: "" });

  const call = useCallback(async (method, path, body) => {
    setBusy(true);
    setError("");
    try {
      setData(await apiRequest(method, path, body));
      return true;
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [onSignedOut]);

  useEffect(() => { call("GET", "/equipment"); }, [call]);

  const add = async (e) => {
    e.preventDefault();
    if (await call("POST", "/equipment/items", { name: draft.name.trim(), category: draft.category, has: draft.has, where: draft.where.trim() })) {
      setDraft({ name: "", category: "", has: true, where: "" });
    }
  };
  const labelOf = (key) => data?.categories.find(c => c.key === key)?.label || key;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>My equipment</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={{ color: "var(--iron)" }}>
        What you have to work with. Billy uses it to suggest exercises you can actually do, and asks about anything
        more particular the first time a program needs it.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--ember)" }}>{error}</p>}

      {!data ? (
        !error && <p className="text-sm" style={{ color: "var(--iron)" }}>Loading your equipment…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <section className="cx-card p-4">
            <h2 className="font-semibold">The basics</h2>
            <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--iron)" }}>Do you have…</p>
            <ul>
              {data.categories.map(c => (
                <li key={c.key} className="flex items-center justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
                  <span className="min-w-0">
                    <span className="text-sm">{c.label}</span>
                    {c.source === "billy" && <span className="ml-2"><ByBilly /></span>}
                  </span>
                  <YesNo value={c.has} disabled={busy} label={c.label}
                    onChange={(has) => call("PUT", `/equipment/categories/${c.key}`, { has })} />
                </li>
              ))}
            </ul>
          </section>

          <section className="cx-card p-4">
            <h2 className="font-semibold">Particular pieces</h2>
            <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--iron)" }}>
              A machine or a piece a program asked about. Billy adds them here when you tell him.
            </p>
            {data.items.length === 0 ? (
              <p className="text-sm py-2" style={{ color: "var(--iron)" }}>Nothing yet.</p>
            ) : (
              <ul>
                {data.items.map(it => (
                  <li key={it.id} className="py-2 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate">{it.name}</span>
                        <span className="block text-xs" style={{ color: "var(--iron)" }}>
                          {labelOf(it.category)}{it.where && ` · ${it.where}`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 flex-none">
                        <YesNo value={it.has} disabled={busy} label={it.name}
                          onChange={(has) => has === null
                            ? call("DELETE", `/equipment/items/${it.id}`)
                            : call("POST", "/equipment/items", { name: it.name, category: it.category, has, where: it.where })} />
                        <button type="button" disabled={busy} onClick={() => call("DELETE", `/equipment/items/${it.id}`)}
                          className="cx-billy-icon" style={{ width: 34, height: 34 }} aria-label={`Remove ${it.name}`} title="Remove">
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                    {it.source === "billy" && <div className="mt-1"><ByBilly /></div>}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={add} className="mt-3 pt-3 border-t grid gap-2" style={{ borderColor: "var(--iron-line)" }}>
              <div className="text-sm font-medium">Add a piece</div>
              <input className="cx-input" placeholder="Name, such as Low row machine" value={draft.name} maxLength={120}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} aria-label="Name" />
              <select className="cx-input" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} aria-label="Kind">
                <option value="">What kind is it?</option>
                {data.categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <input className="cx-input" placeholder="Where it is (optional), such as the studio" value={draft.where} maxLength={200}
                onChange={e => setDraft(d => ({ ...d, where: e.target.value }))} aria-label="Where it is" />
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Do you have it?</span>
                <YesNo value={draft.has} label="Do you have it?" onChange={(has) => setDraft(d => ({ ...d, has: has ?? d.has }))} />
              </div>
              <button type="submit" className="cx-btn-primary py-2 text-sm inline-flex items-center justify-center gap-2"
                disabled={busy || !draft.name.trim() || !draft.category}>
                <Plus size={16} aria-hidden="true" /> Add
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
