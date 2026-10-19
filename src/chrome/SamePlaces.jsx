import React, { useState } from "react";
import { createPortal } from "react-dom";
import { apiRequest } from "../lib/api";

/*
 * After linking a Coach account to a Trainability one (Run 1, B-6; Glenn,
 * 19 Oct 2026: "Ask at linking"): each place both accounts had under the
 * same name ("Where I usually train", which every account starts with) is
 * asked about once, on Home, with how many answers each has: merge them,
 * keep both (the Coach account's renamed "… (Coach)"), or keep only the
 * Trainability account's. Kept for the browser tab by the link (LinkDialog,
 * useAuth), as "cx-same-places".
 */
export const SAME_KEY = "cx-same-places";
const answers = (n) => (n === 1 ? "1 answer" : `${n} answers`);

export function SamePlaces() {
  const [pairs, setPairs] = useState(() => { try { return JSON.parse(sessionStorage.getItem(SAME_KEY) || "[]"); } catch { return []; } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pair = pairs[0];
  if (!pair) return null;
  const done = () => {
    const rest = pairs.slice(1);
    try { rest.length ? sessionStorage.setItem(SAME_KEY, JSON.stringify(rest)) : sessionStorage.removeItem(SAME_KEY); } catch { /* not kept */ }
    setPairs(rest); setError("");
  };
  const choose = async (choice) => {
    setBusy(true); setError("");
    try { await apiRequest("POST", "/places/same", { coachPlaceId: pair.coachPlaceId, keepId: pair.keepId, choice }); done(); }
    catch (err) { if (err.status === 404) done(); else setError(err.message || "That didn't save. Try again in a minute."); }
    finally { setBusy(false); }
  };
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cx-same-title" className="cx-card w-full sm:max-w-md p-5 grid gap-3" style={{ borderRadius: 16, color: "var(--ink)" }}>
        <h2 id="cx-same-title" className="cx-display text-xl">Two places called “{pair.name}”</h2>
        <p className="text-sm" style={{ color: "var(--iron)" }}>
          Your Coach account had one ({answers(pair.coachAnswers)} about its equipment) and your Trainability account had one ({answers(pair.keepAnswers)}). What should happen to them?
        </p>
        {error && <p role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>}
        <div className="grid gap-2">
          <button type="button" autoFocus className="cx-btn-primary w-full py-2.5 text-sm" disabled={busy} onClick={() => choose("merge")}>Merge them into one</button>
          <button type="button" className="cx-btn-quiet w-full py-2.5 text-sm" disabled={busy} onClick={() => choose("both")}>Keep both (the Coach one as “{pair.name} (Coach)”)</button>
          <button type="button" className="cx-btn-quiet w-full py-2.5 text-sm" disabled={busy} onClick={() => choose("theirs")}>Keep only the Trainability one</button>
        </div>
        <p className="text-xs" style={{ color: "var(--iron)" }}>
          Merging keeps the Trainability one's answers where both answered and adds the rest. A place not kept is put away, not deleted, and its programs use the one kept.
        </p>
      </div>
    </div>,
    document.body,
  );
}
