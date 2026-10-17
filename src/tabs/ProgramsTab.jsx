import React, { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus, Archive } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";
import { Designer, DetailsForm, KindForm } from "../programs/Designer";

/**
 * Programs (Glenn, 17 Oct 2026: "We need to start creating a workout program
 * designer so we can start testing Coach IQ in real time"): the signed-in
 * trainer's own programs, each for one client of theirs, and the designer
 * (programs/Designer.jsx). Nobody else sees them.
 */

const muted = { color: "var(--iron)" };

export function ProgramsTab({ clients, billy, onSignedOut }) {
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(() => { try { return sessionStorage.getItem("coach-program") || null; } catch { return null; } });
  const [making, setMaking] = useState(false);
  /* The answers to the first step, what kind of program, until the second is saved. */
  const [kind, setKind] = useState(null);
  const [places, setPlaces] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { try { openId ? sessionStorage.setItem("coach-program", openId) : sessionStorage.removeItem("coach-program"); } catch { /* not kept */ } }, [openId]);

  const fail = useCallback((err) => { if (err.status === 401) onSignedOut?.(); else setError(err.message); }, [onSignedOut]);
  const load = useCallback(() => apiRequest("GET", "/programs").then(setData).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (making) apiRequest("GET", "/equipment").then(o => setPlaces(o.places.map(p => ({ id: p.id, name: p.name })))).catch(fail); }, [making, fail]);

  const create = async (body) => {
    setBusy(true); setError("");
    try { const p = await apiRequest("POST", "/programs", { ...body, ...kind }); setMaking(false); setKind(null); setOpenId(p.id); load(); }
    catch (err) { fail(err); } finally { setBusy(false); }
  };
  const archive = async (p) => {
    if (!window.confirm(`Put “${p.name}” away? It stops being listed here.`)) return;
    try { const o = await apiRequest("DELETE", `/programs/${p.id}`); setData(d => ({ ...d, programs: o.programs })); }
    catch (err) { fail(err); }
  };

  const active = (clients || []).filter(c => !c.archived);

  return (
    <div className="max-w-3xl mx-auto px-4">
      <TabHeading>Programs</TabHeading>
      {openId && data ? (
        <Designer id={openId} goals={data.goals} vocab={data} billy={billy} onSignedOut={onSignedOut} onBack={() => { setOpenId(null); load(); }} />
      ) : (
        <>
          <p className="text-sm -mt-2 mb-4" style={muted}>
            Programs you design for your clients, day by day. Coach IQ checks each one as you build it and suggests what
            could come next. Only you see your programs.
          </p>
          {error && <p className="text-sm mb-3" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
          {making ? (
            <section className="cx-card p-4 mb-4">
              <h2 className="cx-display text-xl mb-3">A new program</h2>
              {active.length === 0 ? <p className="text-sm" style={muted}>You have no clients yet. Add them in Studio first.</p>
                : !data ? <p className="text-sm" style={muted}>Loading…</p>
                : !kind ? (
                  <KindForm vocab={data} onCancel={() => setMaking(false)} onNext={setKind} />
                ) : (
                  <DetailsForm key={kind.kind} clients={active} goals={data.goals || []} places={places} busy={busy} word="Start designing"
                    initial={{ goal: data.kinds.find(k => k.key === kind.kind)?.goal }}
                    onBack={() => setKind(null)} onCancel={() => { setMaking(false); setKind(null); }} onSave={create} />
                )}
            </section>
          ) : (
            <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2 mb-4" onClick={() => setMaking(true)}>
              <Plus size={16} aria-hidden="true" /> New program
            </button>
          )}
          {!data ? (!error && <p className="text-sm" style={muted}>Loading…</p>) : data.programs.length === 0 ? (
            !making && <p className="text-sm" style={muted}>No programs yet. Tap New program to design the first.</p>
          ) : (
            <ul className="grid gap-3">
              {data.programs.map(p => (
                <li key={p.id} className="cx-card p-4 flex items-start gap-3">
                  <ClipboardList size={20} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(p.id)}>
                    <span className="block font-semibold">{p.name}</span>
                    <span className="block text-sm" style={muted}>
                      For {p.clientName} · {p.kindLabel || p.goalLabel} · {p.days} {p.days === 1 ? "day" : "days"}, {p.exercises} {p.exercises === 1 ? "exercise" : "exercises"}
                    </span>
                    <span className="block text-xs" style={muted}>Changed {new Date(p.updatedAt).toLocaleDateString()}</span>
                  </button>
                  <button type="button" className="cx-icon-btn" onClick={() => archive(p)} aria-label={`Put ${p.name} away`} title="Put away"><Archive size={16} aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
