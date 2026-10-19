import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

/*
 * The session ended while the app was open (Run 1, U-3): a request answered
 * 401, so the trainer is asked to sign in again over the screen they were on,
 * instead of being dropped on the sign-in screen with whatever they had typed
 * lost. Studio has nothing like it (it goes back to its sign-in screen), so
 * this is Coach's own, in the words and steps of Coach's sign-in screen and
 * Link dialog. Signed in again as the same person, the screen underneath is
 * as they left it, and they tap Save again; Log out goes to the sign-in
 * screen as before. Over everything, the photo session included.
 */
export function SignInAgain({ user, onLogin, onLogout }) {
  const known = user?.email || "";
  const [email, setEmail] = useState(known);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!email.includes("@")) { setError("Type your email address first."); return; }
    if (!password) { setError("Type your password."); return; }
    setBusy(true);
    try {
      await onLogin(email, password, remember);
    } catch (err) {
      setError(err.status >= 500 || err.status === undefined ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "That email and password don't match.");
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 80, background: "rgba(0,0,0,0.5)" }}>
      <form role="dialog" aria-modal="true" aria-labelledby="cx-again-title" onSubmit={signIn}
        className="cx-card w-full sm:max-w-md p-5 grid gap-3" style={{ borderRadius: 16, color: "var(--ink)" }}>
        <h2 id="cx-again-title" className="cx-display text-xl">Sign in again</h2>
        <p className="text-sm" style={{ color: "var(--iron)" }}>
          You&apos;ve been signed out. Sign in again to carry on: what you were doing is still here, so you can save it.
        </p>
        {known ? (
          <p className="text-sm">{known}</p>
        ) : (
          <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Email
            <input type="email" className="cx-input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" autoFocus style={{ color: "var(--ink)" }} />
          </label>
        )}
        <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Password
          <input type="password" className="cx-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" autoFocus={!!known} style={{ color: "var(--ink)" }} />
        </label>
        <label className="flex items-center gap-2 text-sm select-none" style={{ color: "var(--iron)" }}>
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4" style={{ accentColor: "var(--cerulean)" }} />
          Keep me logged in
        </label>
        {error && <p role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>}
        <div className="flex items-center gap-2">
          <button type="submit" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" disabled={busy} aria-busy={busy}>
            {busy ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Signing in…</> : "Log in"}
          </button>
          <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onLogout}>Log out</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
