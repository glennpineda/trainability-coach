import React, { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Sparkles, Pencil, MapPin, Check, X, Lock, Building2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { nameKey } from "../lib/name-key";
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
            className="cx-hit px-3.5 py-1 rounded-lg text-sm font-medium transition-colors"
            style={on
              ? { background: v ? "var(--fill-cerulean)" : "var(--chalk)", color: v ? "#fff" : "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" }
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

/* An answer the Primary Master set for everyone at a place in Studio. */
const ForEveryone = () => (
  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)", color: "var(--iron)" }}>
    <Lock size={11} aria-hidden="true" /> Set for everyone
  </span>
);

/* A short name typed in place: a place's new name, or a new place. */
function NameBox({ initial = "", placeholder, onSave, onCancel, busy }) {
  const [name, setName] = useState(initial);
  return (
    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
      <input className="cx-input" style={{ padding: "0.4rem 0.6rem" }} autoFocus value={name} maxLength={80}
        placeholder={placeholder} aria-label="Name of the place" onChange={e => setName(e.target.value)} />
      <button type="submit" className="cx-icon-btn" disabled={busy || !name.trim()} aria-label="Save" title="Save">
        <Check size={18} aria-hidden="true" />
      </button>
      <button type="button" className="cx-icon-btn" onClick={onCancel} aria-label="Cancel" title="Cancel">
        <X size={18} aria-hidden="true" />
      </button>
    </form>
  );
}

/**
 * My equipment: the first part of a trainer's personal memory
 * (coach-iq/README.md). Their places (the studio, a client's home …), and for
 * the place chosen, the short checklist and the particular pieces Billy has
 * asked about or the trainer has added. Everything saves as it is tapped;
 * what Billy wrote down is marked, and can be changed or removed here.
 */
export function EquipmentTab({ onSignedOut }) {
  const [data, setData] = useState(null);
  const [placeId, setPlaceId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [naming, setNaming] = useState(null);   // "new", or the id of the place being renamed
  const [draft, setDraft] = useState({ name: "", category: "", has: true, note: "" });

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

  useEffect(() => { call("GET", "/equipment"); }, [call]);

  /* The Primary Master also sets the places in Studio for every trainer
     (`everyone`), through their own routes. */
  const shared = data?.everyone?.find(p => p.id === placeId);
  const place = shared || data?.places.find(p => p.id === placeId) || data?.places[0];
  const base = shared ? `/everyone/places/${place.id}` : `/places/${place?.id}`;
  const itemPath = (id) => (shared ? `/everyone/items/${id}` : `/equipment/items/${id}`);
  /* A piece Coach knows, by its name or any other it goes by, as the server
     knows it (pieceFor), so "Butt blaster" needs no kind chosen. */
  const draftKey = nameKey(draft.name);
  const known = data && draftKey ? data.pieces.find(p => [p.label, ...(p.aliases || [])].some(n => nameKey(n) === draftKey)) : null;

  const add = async (e) => {
    e.preventDefault();
    const body = { name: draft.name.trim(), has: draft.has, note: draft.note.trim(), ...(known ? {} : { category: draft.category }) };
    if (await call("POST", `${base}/items`, body)) setDraft({ name: "", category: "", has: true, note: "" });
  };
  const labelOf = (key) => place?.categories.find(c => c.key === key)?.label || key;

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>My equipment</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={{ color: "var(--iron)" }}>
        What you have to work with, place by place. Billy uses it to suggest exercises you can actually do there, and
        asks about anything more particular the first time a program needs it.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--ember)" }}>{error}</p>}

      {!data ? (
        !error && <p className="text-sm" style={{ color: "var(--iron)" }}>Loading your equipment…</p>
      ) : (
        <>
          {/* The places, one chosen. */}
          <section className="cx-card p-3 mb-4">
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Your places">
              {data.places.map(p => (
                naming === p.id ? (
                  <NameBox key={p.id} initial={p.name} busy={busy} onCancel={() => setNaming(null)}
                    onSave={async (name) => { if (await call("PATCH", `/places/${p.id}`, { name })) setNaming(null); }} />
                ) : (
                  <button key={p.id} type="button" role="tab" aria-selected={p.id === place.id} onClick={() => setPlaceId(p.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                    style={p.id === place.id
                      ? { background: "var(--fill-cerulean)", color: "#fff" }
                      : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
                    <MapPin size={14} aria-hidden="true" /> {p.name}
                  </button>
                )
              ))}
              {naming === "new" ? (
                <NameBox placeholder="Such as Maria's home" busy={busy} onCancel={() => setNaming(null)}
                  onSave={async (name) => {
                    const out = await call("POST", "/places", { name });
                    if (out) { setNaming(null); setPlaceId(out.places[out.places.length - 1].id); }
                  }} />
              ) : (
                <button type="button" onClick={() => setNaming("new")} disabled={busy}
                  className="px-2 py-1.5 text-sm cx-link">
                  <Plus size={15} aria-hidden="true" /> Add a place
                </button>
              )}
            </div>
            {data.everyone?.length > 0 && (
              <>
                <h2 className="text-xs font-medium mt-4 mb-2" style={{ color: "var(--iron)" }}>Places in Studio, set for every trainer</h2>
                <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Places in Studio">
                  {data.everyone.map(p => (
                    <button key={p.id} type="button" role="tab" aria-selected={p.id === place.id} onClick={() => setPlaceId(p.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                      style={p.id === place.id
                        ? { background: "var(--fill-cerulean)", color: "#fff" }
                        : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
                      <Building2 size={14} aria-hidden="true" /> {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
            {shared ? (
              <p className="text-xs mt-3" style={{ color: "var(--iron)" }}>
                What you answer here is set for every trainer whose place in Studio this is. They see it, and can't change it.
              </p>
            ) : place.fromStudio ? (
              <p className="text-xs mt-3" style={{ color: "var(--iron)" }}>
                {place.yours ? "Your place in Studio." : "One of Studio's places."} Its name comes from Studio, so it's changed there.
                {(place.categories.some(c => c.locked) || place.items.some(i => i.locked)) && " Answers marked Set for everyone come from the Primary Master; ask them to change one."}
              </p>
            ) : naming !== place.id && (
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <button type="button" className="text-sm cx-link" onClick={() => setNaming(place.id)}>
                  <Pencil size={15} aria-hidden="true" /> Rename
                </button>
                {data.places.length > 1 && (
                  <button type="button" className="cx-btn-row" disabled={busy}
                    onClick={async () => { if (await call("DELETE", `/places/${place.id}`)) setPlaceId(null); }}>
                    <Trash2 size={15} aria-hidden="true" /> Remove this place
                  </button>
                )}
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <section className="cx-card p-4">
              <h2 className="font-semibold">The basics</h2>
              <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--iron)" }}>{shared ? `At ${place.name}, for every trainer, is there…` : `At ${place.name}, do you have…`}</p>
              <ul>
                {place.categories.map(c => (
                  <li key={c.key} className="flex items-center justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
                    <span className="min-w-0">
                      <span className="text-sm">{c.label}</span>
                      {c.source === "billy" && <span className="ml-2"><ByBilly /></span>}
                      {c.locked && <span className="ml-2"><ForEveryone /></span>}
                    </span>
                    <YesNo value={c.has} disabled={busy || c.locked} label={c.label}
                      onChange={(has) => call("PUT", `${base}/categories/${c.key}`, { has })} />
                  </li>
                ))}
              </ul>
            </section>

            <section className="cx-card p-4">
              <h2 className="font-semibold">Particular pieces</h2>
              <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--iron)" }}>
                A machine or a piece a program asked about. Billy adds them here when you tell him.
              </p>
              {place.items.length === 0 ? (
                <p className="text-sm py-2" style={{ color: "var(--iron)" }}>Nothing yet.</p>
              ) : (
                <ul>
                  {place.items.map(it => (
                    <li key={it.id} className="py-2 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">{it.name}</span>
                          <span className="block text-xs" style={{ color: "var(--iron)" }}>
                            {labelOf(it.category)}{it.note && ` · ${it.note}`}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 flex-none">
                          <YesNo value={it.has} disabled={busy || it.locked} label={it.name}
                            onChange={(has) => has === null
                              ? call("DELETE", itemPath(it.id))
                              : call("POST", `${base}/items`, { name: it.name, category: it.category, has, note: it.note })} />
                          {!it.locked && (
                            <button type="button" disabled={busy} onClick={() => call("DELETE", itemPath(it.id))}
                              className="cx-icon-btn" aria-label={`Remove ${it.name}`} title="Remove">
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      </div>
                      {it.source === "billy" && <div className="mt-1"><ByBilly /></div>}
                      {it.locked && <div className="mt-1"><ForEveryone /></div>}
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={add} className="mt-3 pt-3 border-t grid gap-2" style={{ borderColor: "var(--iron-line)" }}>
                <div className="text-sm font-medium">Add a piece</div>
                <input className="cx-input" placeholder="Name, such as Low row machine" value={draft.name} maxLength={120}
                  list="cx-known-pieces" onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} aria-label="Name" />
                <datalist id="cx-known-pieces">
                  {/* Its other names under it, which the browser also searches. */}
                  {data.pieces.map(p => <option key={p.key} value={p.label}>{p.aliases?.length ? `Also ${p.aliases.join(", ")}` : undefined}</option>)}
                </datalist>
                {known ? (
                  <p className="text-xs" style={{ color: "var(--iron)" }}>
                    {nameKey(known.label) === draftKey ? labelOf(known.kind) : `${known.label} · ${labelOf(known.kind)}`}
                  </p>
                ) : (
                  <select className="cx-input" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} aria-label="Kind">
                    <option value="">What kind is it?</option>
                    {place.categories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                )}
                <input className="cx-input" placeholder="A note (optional), such as only goes to 50 lb" value={draft.note} maxLength={200}
                  onChange={e => setDraft(d => ({ ...d, note: e.target.value }))} aria-label="Note" />
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">{shared ? "Is it there?" : "Do you have it?"}</span>
                  <YesNo value={draft.has} label="Do you have it?" onChange={(has) => setDraft(d => ({ ...d, has: has ?? d.has }))} />
                </div>
                {/* Adding to a list: a secondary button inside its card (Studio). */}
                <button type="submit" className="cx-btn-quiet w-full py-2 text-sm"
                  disabled={busy || !draft.name.trim() || (!known && !draft.category)}>
                  <Plus size={14} aria-hidden="true" /> Add
                </button>
              </form>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
