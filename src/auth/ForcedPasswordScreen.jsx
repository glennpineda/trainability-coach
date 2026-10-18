import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { HexBackdrop } from "./HexBackdrop";
import { CoachLockup } from "./CoachLockup";
import { apiRequest } from "../lib/api";

const PASSWORD_MIN = 8;

/**
 * Signed in with a temporary password: their own is chosen before anything
 * else, Studio's ForcedPasswordResetScreen (its src/auth) in Coach's look,
 * with its words: "Set a new password", New password and its rule, Confirm
 * new password, "Set password & continue", "Log out instead". Saved through
 * /api/auth/password, Coach's own for a Coach account, Studio's for a
 * Trainability one (stage four, build 1.0.52).
 */
export function ForcedPasswordScreen({ user, onDone, onLogout }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isValid = newPassword.length >= PASSWORD_MIN && newPassword === confirmPassword;

  async function save(e) {
    e.preventDefault();
    setTouched(true); setError("");
    if (!isValid || busy) return;
    setBusy(true);
    try {
      await apiRequest("POST", "/auth/password", { newPassword });
      onDone();
    } catch (err) {
      setError(err.status >= 500 || err.status === undefined ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "Your password couldn't be changed.");
      setBusy(false);
    }
  }

  const problem = touched && !isValid
    ? (newPassword.length < PASSWORD_MIN ? `New password must be at least ${PASSWORD_MIN} characters.` : "Passwords don't match.")
    : "";
  return (
    <div className="min-h-dvh flex justify-center items-center p-4 relative overflow-hidden"
      style={{ background: "var(--ground)" }}>
      <HexBackdrop />
      <form onSubmit={save} noValidate className="w-full max-w-sm relative z-10 cx-card p-7 space-y-4" style={{ borderRadius: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
        <div className="flex flex-col items-center text-center">
          <CoachLockup style={{ width: 120, height: "auto" }} />
          <h1 className="cx-display text-2xl mt-4">Set a new password</h1>
          <p className="text-sm mt-1" style={{ color: "var(--iron)" }}>Hi {user.name}, you logged in with a temporary password. Choose your own to continue.</p>
        </div>
        <div>
          <label className="block">
            <span className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>New password</span>
            <input type="password" className="cx-input" autoComplete="new-password" autoFocus value={newPassword}
              onChange={e => setNewPassword(e.target.value)} aria-describedby="cx-password-rule"
              style={touched && newPassword.length < PASSWORD_MIN ? { borderColor: "var(--ember)" } : undefined} />
          </label>
          <div id="cx-password-rule" className="text-xs mt-1" style={{ color: "var(--iron)" }}>At least {PASSWORD_MIN} characters.</div>
        </div>
        <label className="block">
          <span className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Confirm new password</span>
          <input type="password" className="cx-input" autoComplete="new-password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={touched && newPassword !== confirmPassword ? { borderColor: "var(--ember)" } : undefined} />
        </label>
        {(problem || error) && <div role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{problem || error}</div>}
        <button type="submit" disabled={busy} aria-busy={busy} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
          {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Saving…</> : "Set password & continue"}
        </button>
        <button type="button" onClick={onLogout} className="cx-quiet w-full text-sm">Log out instead</button>
      </form>
    </div>
  );
}
