import React, { useEffect, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { apiRequest } from "../lib/api";

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
      {!list ? (!error && <p className="text-sm" style={muted}>Loading…</p>) : list.length === 0 ? (
        <p className="text-sm" style={muted}>No programs for {client.firstName || "them"} yet.</p>
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
    </div>
  );
}
