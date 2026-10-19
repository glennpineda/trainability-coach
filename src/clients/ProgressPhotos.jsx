import React, { useCallback, useEffect, useState } from "react";
import { Camera, ChevronDown, Columns2, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { ANGLES } from "../lib/progress-photos";
import { isoDate } from "../lib/date";
import { PhotoSession } from "./PhotoSession";
import { PhotoCompare } from "./PhotoCompare";

/*
 * A client's progress photos (Glenn, 19 Oct 2026): front, sides and back,
 * one set per day, under Measurements and laid out as they are. Nothing is
 * taken or shown until one of the client's trainers records that the client
 * agreed ("Trainers, with a client opt-in"); then every trainer of the client
 * sees them, with who took each set, and only that trainer may delete one.
 * Taken through PhotoSession, which guides each angle; two days compared in
 * PhotoCompare. If the client stops agreeing, every set goes.
 */

const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const muted = { color: "var(--iron)" };

/* A set's four, small, each opening full size. */
function Thumbs({ set }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {ANGLES.map(a => (
        <figure key={a.key} className="min-w-0">
          {set.photos[a.key] ? (
            <a href={set.photos[a.key]} target="_blank" rel="noreferrer" aria-label={`${a.label}, ${dateText(set.takenOn)}, full size`}>
              <img src={set.photos[a.key]} alt="" loading="lazy" className="w-full rounded-md object-cover" style={{ aspectRatio: "3 / 4", background: "var(--ghost-fill)" }} />
            </a>
          ) : <div className="w-full rounded-md" style={{ aspectRatio: "3 / 4", background: "var(--ghost-fill)" }} />}
          <figcaption className="text-[11px] mt-0.5 text-center truncate" style={muted}>{a.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function ProgressPhotos({ client, onSignedOut, inTab = false }) {
  const clientId = client.id;
  const first = client.firstName || "This client";
  const [data, setData] = useState(null);     // { consent, sets }
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [session, setSession] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [pair, setPair] = useState([null, null]);   // the earlier and the later set's ids
  const [deleting, setDeleting] = useState(null);   // a set's id, or "all" when they stop agreeing

  const fail = useCallback((err, set = setError) => {
    if (err.status === 401) onSignedOut?.();
    else set(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);
  useEffect(() => {
    let alive = true;
    let loadedAt = 0;
    const load = () => apiRequest("GET", `/clients/${clientId}/progress-photos`)
      .then(d => { if (alive) { loadedAt = Date.now(); setData(d); } }).catch(err => { if (alive) fail(err); });
    load();
    /* The pictures' signed links last an hour at least (server/progress-photos.js),
       so a page left open asks again before they run out: every few minutes
       while it is seen, and on coming back to it (Run 1, A-9). */
    const fresh = () => { if (loadedAt && document.visibilityState === "visible" && Date.now() - loadedAt > 45 * 60 * 1000) load(); };
    const t = setInterval(fresh, 5 * 60 * 1000);
    document.addEventListener("visibilitychange", fresh);
    window.addEventListener("focus", fresh);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", fresh); window.removeEventListener("focus", fresh); };
  }, [clientId, fail]);

  const send = async (method, path, body, set = setError) => {
    setBusy(true); set("");
    try { setData(await apiRequest(method, path, body)); return true; }
    catch (err) { fail(err, set); return false; }
    finally { setBusy(false); }
  };

  const sets = data?.sets || [];
  const latest = sets[0];
  const rest = sets.slice(1);
  /* Compare the oldest with the latest, to begin with. */
  const a = sets.find(s => s.id === pair[0]) || sets[sets.length - 1];
  const b = sets.find(s => s.id === pair[1]) || latest;
  const [earlier, later] = a && b && a.takenOn > b.takenOn ? [b, a] : [a, b];

  const header = (set, i) => (
    <div className="flex items-start justify-between gap-2 mb-1.5">
      <span className="min-w-0">
        <span className="block font-medium text-sm">{i === 0 ? "Latest: " : ""}{dateText(set.takenOn)}</span>
        <span className="block text-xs" style={muted}>Taken by {set.mine ? "you" : set.takenBy}</span>
      </span>
      {set.mine && deleting !== set.id && (
        <button type="button" className="cx-icon-btn" aria-label="Delete these photos" title="Delete" onClick={() => setDeleting(set.id)}><Trash2 size={15} aria-hidden="true" /></button>
      )}
    </div>
  );
  const confirm = (text, onYes, yes = "Delete") => (
    <div className="mt-2 rounded-lg p-2.5 flex flex-wrap items-center gap-2" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
      <span className="text-sm flex-1 min-w-[10rem]">{text}</span>
      <span className="flex items-center gap-1">
        <button type="button" className="cx-btn-ember px-3 py-1.5 text-sm" disabled={busy} aria-busy={busy} onClick={onYes}>{busy ? "Deleting…" : yes}</button>
        <button type="button" className="px-3 py-1.5 text-sm" style={{ color: "var(--ink-soft)" }} onClick={() => setDeleting(null)}>Keep them</button>
      </span>
    </div>
  );
  const card = (set, i) => (
    <div key={set.id} className="rounded-lg p-2.5 mt-2" style={{ background: "var(--ghost-fill)" }}>
      {header(set, i)}
      <Thumbs set={set} />
      {set.note && <p className="text-xs mt-1.5 cx-wrap" style={muted}>{set.note}</p>}
      {deleting === set.id && confirm("Delete these photos? Its trainers will no longer see them.", async () => { if (await send("DELETE", `/progress-photos/${set.id}`)) setDeleting(null); })}
    </div>
  );

  return (
    /* In its own tab of the client's dialog (ClientsTab), the tab names it:
       no heading or rule of its own. */
    <div className={inTab ? "" : "sm:col-span-2 mt-2 pt-3 border-t"} style={inTab ? undefined : { borderColor: "var(--iron-line)" }}>
      <div className={inTab ? "hidden" : "flex items-center gap-2 mb-1"}>
        <Camera size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        <span className="text-sm font-semibold">Progress photos</span>
      </div>
      {error && <p className="text-sm my-1" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {!data ? (!error && <p className="text-sm" style={muted}>Loading…</p>) : !data.consent ? (
        /* Their agreement first. */
        <div className="rounded-lg p-3 mt-1 text-sm" style={{ background: "var(--ghost-fill)" }}>
          <p>Before taking any, ask {first} if they agree. The photos are kept in Coach, and every trainer of {first} can see them.</p>
          <label className="flex items-start gap-2 mt-2">
            <input type="checkbox" className="mt-1" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>{first} agrees to progress photos being taken and kept.</span>
          </label>
          <button type="button" className="cx-btn-quiet mt-2 px-4 py-2 text-sm" disabled={!agreed || busy} aria-busy={busy}
            onClick={() => send("POST", `/clients/${clientId}/progress-photos/consent`, { agreed: true })}>Save their agreement</button>
        </div>
      ) : (
        <>
          <p className="text-xs" style={muted}>{first} agreed · recorded by {data.consent.mine ? "you" : data.consent.recordedBy} on {dateText(isoDate(new Date(data.consent.agreedAt)))}</p>
          {sets.length === 0 && <p className="text-sm mt-1" style={muted}>None taken yet.</p>}
          {latest && card(latest, 0)}
          <div className="flex flex-wrap gap-x-4">
            {sets.length > 1 && (
              <button type="button" className="cx-link text-sm mt-2" aria-expanded={comparing} onClick={() => setComparing(c => !c)}>
                <Columns2 size={14} aria-hidden="true" /> {comparing ? "Hide the comparison" : "Compare two days"}
              </button>
            )}
            {rest.length > 0 && (
              <button type="button" className="cx-link text-sm mt-2" aria-expanded={showAll} onClick={() => setShowAll(s => !s)}>
                <ChevronDown size={14} aria-hidden="true" style={{ transform: showAll ? "rotate(180deg)" : undefined }} />
                {showAll ? "Show only the latest" : `Earlier photos (${rest.length})`}
              </button>
            )}
          </div>
          {comparing && earlier && later && (
            <div className="rounded-lg p-2.5 mt-2" style={{ background: "var(--chalk)", border: "1px solid var(--iron-line)" }}>
              <div className="grid sm:grid-cols-2 gap-2 mb-2">
                {[0, 1].map(n => (
                  <label key={n} className="grid gap-1 text-xs" style={muted}>{n ? "Later" : "Earlier"}
                    <select className="cx-input text-sm" style={{ color: "var(--ink)" }} value={(n ? later : earlier).id}
                      onChange={e => setPair(p => (n ? [earlier.id, e.target.value] : [e.target.value, later.id]))}>
                      {sets.map(s => <option key={s.id} value={s.id}>{dateText(s.takenOn)}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              {earlier.id === later.id ? <p className="text-sm" style={muted}>Choose two different days.</p> : <PhotoCompare key={`${earlier.id}-${later.id}`} a={earlier} b={later} />}
            </div>
          )}
          {showAll && rest.map((s, i) => card(s, i + 1))}
          <button type="button" className="cx-btn-quiet w-full mt-3 py-2 text-sm" onClick={() => { setSessionError(""); setSession(true); }}>
            <Plus size={14} aria-hidden="true" /> Take progress photos
          </button>
          {deleting === "all" ? confirm(`Delete all of ${first}'s progress photos, taken by any of their trainers? Photos already sent in a message stay there.`,
            async () => { if (await send("DELETE", `/clients/${clientId}/progress-photos/consent`)) { setDeleting(null); setAgreed(false); } }, "Delete them all")
            : <button type="button" className="cx-link text-xs mt-2" onClick={() => setDeleting("all")}>{first} no longer agrees</button>}
        </>
      )}
      {session && (
        <PhotoSession firstName={first} previous={latest} busy={busy} error={sessionError} onClose={() => setSession(false)}
          onSave={async (body) => { if (await send("POST", `/clients/${clientId}/progress-photos`, body, setSessionError)) setSession(false); }} />
      )}
    </div>
  );
}
