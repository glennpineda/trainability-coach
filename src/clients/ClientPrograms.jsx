import React, { useEffect, useState } from "react";
import { ChevronDown, ClipboardCheck, ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { LoadingLine, EmptyState } from "../chrome/LoadingLine";
import { ConfirmDialog } from "../chrome/ConfirmDialog";
import { LogSession } from "../programs/LogSession";
import { entryText } from "../lib/workout-log";

const dayText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });

/*
 * Their logged sessions (Run 1, I-14), newest first, by any of their
 * trainers: the day, the program's day, who logged it and how much was
 * done; opened, each exercise as it went and the notes. The trainer who
 * logged one may change or delete it.
 */
function Sessions({ client, onSignedOut }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  const [changing, setChanging] = useState(null);   // { log, program, day }
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fail = (err) => { if (err.status === 401) onSignedOut?.(); else setError(err.message || "That didn't work. Try again."); };
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/clients/${client.id}/sessions`).then(d => { if (alive) setData(d); }).catch(err => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = async (log) => {
    setError("");
    try {
      const program = await apiRequest("GET", `/programs/${log.programId}`);
      const day = program.days.find(d => d.id === log.dayId);
      if (!day) throw new Error("That day is no longer in the program, so this session can't be changed.");
      setChanging({ log, program, day });
    } catch (err) { fail(err); }
  };
  const muted = { color: "var(--iron)" };
  const units = data?.units || "imperial";
  if (!data) return error ? <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p> : <LoadingLine />;
  return (
    <>
      {error && <p className="text-sm mb-2" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {data.sessions.length === 0 ? (
        <p className="text-sm" style={muted}>None logged yet. Open a program and tap <strong>Log this session</strong> under a day.</p>
      ) : (
        <ul className="grid gap-2">
          {data.sessions.map(log => {
            const done = log.entries.filter(e => e.done).length;
            const isOpen = open === log.id;
            return (
              <li key={log.id} className="rounded-lg p-2.5 text-sm" style={{ background: "var(--ghost-fill)" }}>
                <button type="button" className="w-full text-left flex items-start gap-2.5" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : log.id)}>
                  <ClipboardCheck size={18} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{dayText(log.doneOn)}</span>
                    <span className="block text-xs" style={muted}>
                      {log.programName}, {log.dayName} · {done} of {log.entries.length} done · logged by {log.mine ? "you" : log.loggedBy}
                    </span>
                  </span>
                  <ChevronDown size={16} className="flex-none mt-1" style={{ ...muted, transform: isOpen ? "rotate(180deg)" : undefined }} aria-hidden="true" />
                </button>
                {isOpen && (
                  <div className="mt-2 ml-7">
                    <ul className="grid gap-1">
                      {log.entries.map(e => (
                        <li key={e.peId}>
                          <span className="font-medium" style={e.done ? undefined : muted}>{e.name}</span>
                          <span style={muted}> · {entryText(e, log.units || units)}</span>
                          {e.note && <span className="block text-xs cx-wrap" style={muted}>{e.note}</span>}
                        </li>
                      ))}
                    </ul>
                    {log.note && <p className="text-xs mt-2 cx-wrap" style={muted}>{log.note}</p>}
                    {log.mine && (
                      <div className="flex gap-2 mt-2">
                        <button type="button" className="cx-btn-row" onClick={() => change(log)}><Pencil size={14} aria-hidden="true" /> Change</button>
                        <button type="button" className="cx-icon-btn" aria-label="Delete this session" title="Delete" onClick={() => setDeleting(log)}><Trash2 size={15} aria-hidden="true" /></button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {changing && (
        <LogSession program={changing.program} day={changing.day} existing={changing.log} units={units} onClose={() => setChanging(null)}
          onSaved={(d) => { setData(d); setChanging(null); }} />
      )}
      {deleting && (
        <ConfirmDialog title="Delete this session?" yes="Delete" no="Keep it" busy={busy}
          onYes={async () => {
            setBusy(true);
            try { setData(await apiRequest("DELETE", `/sessions/${deleting.id}`)); setDeleting(null); } catch (err) { fail(err); setDeleting(null); } finally { setBusy(false); }
          }}
          onNo={() => setDeleting(null)}>
          {dayText(deleting.doneOn)}, {deleting.dayName}. Its trainers will no longer see it, and a 1RM worked out from it goes too.
        </ConfirmDialog>
      )}
    </>
  );
}

/*
 * A client's programs, on their page (Run 1, U-9; Glenn, 19 Oct 2026: "Fifth
 * tab: Programs"): the trainer's programs for them, newest change first, each
 * opening in the designer, and New program for them, which starts Programs'
 * new-program steps with the client already chosen. Put-away ones are left
 * on the Programs page.
 */
export function ClientPrograms({ client, onOpenProgram, onNewProgram, onSignedOut }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    apiRequest("GET", "/programs")
      .then(d => { if (alive) setList((d.programs || []).filter(p => p.clientId === client.id)); })
      .catch(err => { if (!alive) return; if (err.status === 401) onSignedOut?.(); else setError("Their programs couldn't be loaded. Try again in a minute."); });
    return () => { alive = false; };
  }, [client.id, onSignedOut]);
  const muted = { color: "var(--iron)" };
  return (
    <div>
      {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {!list ? (!error && <LoadingLine />) : list.length === 0 ? (
        <EmptyState>No programs for {client.firstName || "them"} yet.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {list.map(p => (
            <li key={p.id}>
              <button type="button" className="w-full text-left rounded-lg p-3 flex items-start gap-3" style={{ background: "var(--ghost-fill)" }} onClick={() => onOpenProgram(p.id)}>
                <ClipboardList size={18} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-sm">{p.name}</span>
                  <span className="block text-xs" style={muted}>{p.kindLabel || p.goalLabel} · {p.days} {p.days === 1 ? "day" : "days"}, {p.exercises} {p.exercises === 1 ? "exercise" : "exercises"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {onNewProgram && !client.archived && (
        <button type="button" className="cx-btn-quiet w-full mt-3 py-2 text-sm" onClick={() => onNewProgram(client)}>
          <Plus size={14} className="inline" aria-hidden="true" /> New program for {client.firstName || "them"}
        </button>
      )}
      <h3 className="text-xs uppercase tracking-wide mt-6 mb-2" style={{ color: "var(--iron)" }}>Logged sessions</h3>
      <Sessions client={client} onSignedOut={onSignedOut} />
    </div>
  );
}
