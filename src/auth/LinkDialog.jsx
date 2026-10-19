import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { SAME_KEY } from "../chrome/SamePlaces";

/**
 * Joining a Coach account to a Trainability (Studio) account with another
 * email (stage three; Glenn, 18 Oct 2026): signed in to Coach, the trainer
 * signs in to Trainability once here. From then on they sign in with that
 * account, and everything they made in Coach is its. The page starts again
 * as the Trainability account, and Home says so once.
 */
export function LinkDialog({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const link = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError("Type your email address first."); return; }
    if (!password) { setError("Type your password."); return; }
    setBusy(true);
    try {
      const { samePlaces = [] } = await apiRequest("POST", "/auth/link", { email: email.trim(), password });
      try {
        sessionStorage.setItem("cx-linked", "1"); sessionStorage.setItem("coach-tab", "home");
        if (samePlaces.length) sessionStorage.setItem(SAME_KEY, JSON.stringify(samePlaces));
      } catch { /* not kept */ }
      window.location.reload();
    } catch (err) {
      setError(err.status >= 500 || err.status === undefined ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "That email and password don't match.");
      setBusy(false);
    }
  };
  /* On the page itself: opened from the header, whose blur would hold a
     fixed layer inside it. */
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <form role="dialog" aria-label="Link your Trainability account" onSubmit={link}
        className="cx-card w-full sm:max-w-md p-5 grid gap-3" style={{ borderRadius: 16 }}>
        <div className="flex items-start gap-3">
          <h2 className="cx-display text-xl flex-1">Link your Trainability account</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="text-sm" style={{ color: "var(--iron)" }}>
          If you also have a Trainability account, sign in to it once here. From then on you sign in with it, and everything you made in Coach stays yours.
        </p>
        <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Your Trainability email
          <input type="email" className="cx-input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoFocus style={{ color: "var(--ink)" }} />
        </label>
        <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Its password
          <input type="password" className="cx-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ color: "var(--ink)" }} />
        </label>
        {error && <p role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" disabled={busy}>
            {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Linking…</> : "Link accounts"}
          </button>
          <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
