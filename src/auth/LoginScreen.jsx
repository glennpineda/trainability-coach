import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { HexBackdrop } from "./HexBackdrop";
import { CoachLockup } from "./CoachLockup";
import { apiRequest, STUDIO_URL } from "../lib/api";
import { VERSION_LABEL } from "../version";

/* As on Studio's screen: a name typed without an @ is taken as a studio
   address, since on a phone the @ is a keyboard switch away. */
const STUDIO_DOMAIN = "trainabilitystudio.com";
const withStudioDomain = (typed) => {
  const t = typed.trim();
  return t && !t.includes("@") ? `${t}@${STUDIO_DOMAIN}` : t;
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1" style={{ color: "var(--ink-soft)" }}>{label}</span>
      {children}
    </label>
  );
}

/**
 * Sign in with a Trainability account — the same email and password as Studio.
 * The check happens on Studio's server; this screen never sees a hash, and a
 * wrong email and a wrong password get the same answer by design.
 */
export function LoginScreen({ onLogin, offline }) {
  const [mode, setMode] = useState("login"); // login | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    if (busy) return;
    const address = withStudioDomain(email);
    if (address !== email) setEmail(address);
    setError(""); setMoved(false);
    if (!address || !password) { setError("Type your email and password."); return; }
    setBusy(true);
    try {
      await onLogin(address, password, remember);
    } catch (err) {
      /* Not a failure: an account from the old app has just been emailed a
         temporary password by Studio's server. */
      if (err.code === "password_migrated") { setMoved(true); setPassword(""); }
      else if (err.status >= 500 || err.status === undefined) setError("Couldn't reach Trainability. Check your connection and try again.");
      else setError(err.message || "That email and password don't match.");
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    const address = withStudioDomain(email);
    if (!address) return;
    setBusy(true);
    try {
      const out = await apiRequest("POST", "/auth/forgot-password", { email: address });
      setResetResult({ ok: true, message: out.message });
    } catch (err) {
      setResetResult({ ok: false, message: err.message || "That could not be sent." });
    } finally { setBusy(false); }
  }

  function backToLogin() { setMode("login"); setResetResult(null); setError(""); }

  return (
    <div
      className="min-h-dvh flex justify-center items-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 45%, #172A3A 100%)" }}
    >
      <HexBackdrop />
      <div className="w-full max-w-sm relative z-10">
        <div className="cx-card p-7" style={{ borderRadius: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.35)" }}>
          <div className="flex flex-col items-center mb-6">
            <CoachLockup style={{ width: 150, height: "auto" }} />
            {/* Under the logo, as on Studio's sign-in screen. */}
            <div className="text-sm mt-3" style={{ color: "var(--iron)" }}>Version {VERSION_LABEL}</div>
          </div>

          {offline && (
            <div className="text-sm rounded-lg p-3 mb-4" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>
              Trainability isn&apos;t answering right now, so signing in may not work. Try again in a minute.
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <p className="text-sm text-center" style={{ color: "var(--iron)" }}>
                Use the same email and password as Trainability Studio.
              </p>
              <Field label="Email">
                <input type="email" className="cx-input" value={email} onChange={e => setEmail(e.target.value)}
                  autoComplete="username" autoFocus placeholder="you@example.com" />
              </Field>
              <Field label="Password">
                <input type="password" className="cx-input" value={password}
                  onChange={e => { setPassword(e.target.value); setMoved(false); }} autoComplete="current-password" />
              </Field>

              {moved && (
                <div className="text-sm rounded-lg p-3" style={{ background: "var(--accent-soft)", color: "var(--ink-soft)" }}>
                  <strong className="block" style={{ color: "var(--ink)" }}>Check your email.</strong>
                  This account came over from the old app, so its old password doesn&apos;t work here.
                  A temporary one is on its way — sign in with that, then choose your own.
                </div>
              )}

              <label className="flex items-center gap-2 text-sm select-none" style={{ color: "var(--iron)" }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4" style={{ accentColor: "var(--cerulean)" }} />
                Keep me logged in
              </label>

              {error && <div role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</div>}

              <button type="submit" disabled={busy} aria-busy={busy} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Signing in…</> : "Log in"}
              </button>
              <div className="text-center">
                <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="cx-link text-sm">
                  <KeyRound size={15} aria-hidden="true" /> Forgot password?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4" noValidate>
              {!resetResult ? (
                <>
                  <p className="text-sm" style={{ color: "var(--iron)" }}>
                    Enter your account email and we&apos;ll send a temporary password to it. It works in Studio and Coach.
                  </p>
                  <Field label="Email">
                    <input type="email" className="cx-input" value={email} onChange={e => setEmail(e.target.value)} autoFocus autoComplete="username" />
                  </Field>
                  <button type="submit" disabled={!email.trim() || busy} className="cx-btn-primary w-full py-2.5 text-base">
                    {busy ? "Sending…" : "Send temporary password"}
                  </button>
                  <button type="button" onClick={backToLogin} className="w-full text-sm" style={{ color: "var(--iron)" }}>Back to login</button>
                </>
              ) : (
                <>
                  <div className="text-sm" style={{ color: resetResult.ok ? "var(--moss)" : "var(--ember)" }}>{resetResult.message}</div>
                  {resetResult.ok && (
                    <div className="text-sm" style={{ color: "var(--iron)" }}>
                      It may take a minute to arrive. Check the junk folder before trying again — each attempt replaces the last password sent.
                    </div>
                  )}
                  <button type="button" onClick={backToLogin} className="cx-btn-primary w-full py-2.5 text-base">Back to login</button>
                </>
              )}
            </form>
          )}
        </div>
        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.75)" }}>
          Part of the Trainability family ·{" "}
          <a href={STUDIO_URL} className="underline underline-offset-2" style={{ color: "#fff" }}>Open Studio</a>
        </p>
      </div>
    </div>
  );
}
