import React, { useState } from "react";
import { KeyRound, Loader2, UserPlus, UserRound } from "lucide-react";
import { HexBackdrop } from "./HexBackdrop";
import { CoachLockup } from "./CoachLockup";
import { apiRequest, STUDIO_URL } from "../lib/api";
import { PhraseCycle, BELONGING } from "./PhraseCycle";
import { InstallBanner } from "./InstallBanner";

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
 * One sign-in screen for everybody, as Studio's (its auth/LoginScreen.jsx;
 * Glenn, 17 Oct 2026: "make the login screen identical to Studio, checking
 * email first as we will eventually let clients login here"). The email is
 * asked first, and Studio's server says which way in it takes
 * (/api/auth/door, relayed): a team account's password, or the code a client
 * or member signs in with, answered the same for an address nobody has, so the
 * screen can't be used to learn who is a client.
 *
 * Coach's own accounts (Glenn, 18 Oct 2026) come in here too: an email with
 * a Coach account goes to the same password step ("coach"), checked on
 * Coach's server; any other email that isn't a team account is offered a
 * Coach account, or, for a client, their own page in Studio (Coach has no
 * client sign-in yet). This screen never sees a hash, and a wrong email and
 * a wrong password get the same answer by design.
 */
export function LoginScreen({ onLogin, onSignup, offline }) {
  const [mode, setMode] = useState("email"); // email | password | client | signup | forgot
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [moved, setMoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  /* Which way in this email takes. */
  async function handleContinue(e) {
    e.preventDefault();
    if (busy) return;
    const address = withStudioDomain(email);
    if (address !== email) setEmail(address);
    setError(""); setMoved(false);
    if (!/^\S+@\S+\.\S+$/.test(address)) { setError("Type your email address first."); return; }
    setBusy(true);
    try {
      const out = await apiRequest("POST", "/auth/door", { email: address });
      /* A team account's password is Studio's; a Coach account's ("coach")
         is Coach's own; anybody else may make a Coach account. */
      setMode(out.door === "password" || out.door === "coach" ? "password" : "client");
    } catch (err) {
      setError(err.status >= 500 || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "That didn't work. Try again.");
    } finally { setBusy(false); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (busy) return;
    setError(""); setMoved(false);
    if (!password) { setError("Type your password."); return; }
    setBusy(true);
    try {
      await onLogin(email, password, remember);
    } catch (err) {
      /* Not a failure: an account from the old app has just been emailed a
         temporary password by Studio's server. */
      if (err.code === "password_migrated") { setMoved(true); setPassword(""); }
      else if (err.status >= 500 || err.status === undefined) setError("Couldn't reach Trainability. Check your connection and try again.");
      else setError(err.message || "That email and password don't match.");
      setBusy(false);
    }
  }

  /* A Coach account for a trainer who isn't on Trainability's team. */
  async function handleSignup(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!name.trim()) { setError("Type your name."); return; }
    if (password.length < 8) { setError("Your password needs at least 8 characters."); return; }
    setBusy(true);
    try {
      await onSignup(name.trim(), email, password, remember);
    } catch (err) {
      setError(err.status >= 500 || err.status === undefined ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "Your account couldn't be made. Try again.");
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

  function backToEmail() { setMode("email"); setPassword(""); setName(""); setError(""); setMoved(false); }
  function backToLogin() { setMode("password"); setResetResult(null); setError(""); }

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
            {/* Under the logo, as on Studio's sign-in screen: "You belong
                here." in twenty languages (the version is in the account menu). */}
            <div className="mt-3"><PhraseCycle phrases={BELONGING} label="You belong here." className="text-sm" /></div>
          </div>

          {offline && (
            <div className="text-sm rounded-lg p-3 mb-4" style={{ background: "var(--ember-soft)", color: "var(--ember)" }}>
              Trainability isn&apos;t answering right now, so signing in may not work. Try again in a minute.
            </div>
          )}

          {mode === "email" ? (
            <form onSubmit={handleContinue} className="space-y-3" noValidate>
              {/* As Studio asks it: which address, since one never signed up with finds nobody. */}
              <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                Please use the email you used when you signed up with Trainability.
              </p>
              {/* No caption over the box, as on Studio's: the line above and the words in it say what goes there. */}
              <input type="email" className="cx-input" value={email} onChange={e => setEmail(e.target.value)}
                autoComplete="username" autoFocus aria-label="Email" placeholder="Your email address" />
              {error && <div role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</div>}
              <button type="submit" disabled={busy} aria-busy={busy} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> One moment…</> : "Continue"}
              </button>
            </form>
          ) : mode === "client" ? (
            <div className="space-y-3">
              {/* Not a team account or a Coach account: a trainer new to
                  Coach, or a client or member, or an address nobody has.
                  Studio answers those alike, and so does this: a trainer
                  makes a Coach account; a client goes to their own page. */}
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                There&apos;s no trainer account for {email} yet.
              </p>
              <p className="text-sm" style={{ color: "var(--iron)" }}>
                If you&apos;re a trainer, make your Coach account now. It&apos;s free.
              </p>
              <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                <UserPlus size={18} aria-hidden="true" /> Create a Coach account
              </button>
              <p className="text-sm pt-1" style={{ color: "var(--iron)" }}>
                Training with us as a client? Your own page is in Studio.
              </p>
              <a href={`${STUDIO_URL}me`} className="cx-btn-row w-full justify-center">
                <UserRound size={16} aria-hidden="true" /> Go to my page
              </a>
              <button type="button" onClick={backToEmail} className="cx-quiet w-full text-sm">Use a different email</button>
            </div>
          ) : mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4" noValidate>
              <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Create your Coach account</p>
              <Field label="Your name">
                <input className="cx-input" value={name} onChange={e => setName(e.target.value)} autoFocus autoComplete="name" maxLength={120} />
              </Field>
              <Field label="Email">
                <input type="email" className="cx-input" value={email} readOnly autoComplete="username" style={{ color: "var(--iron)" }} />
              </Field>
              <Field label="Choose a password">
                <input type="password" className="cx-input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
              </Field>
              <p className="text-xs -mt-2" style={{ color: "var(--iron)" }}>At least 8 characters.</p>
              <label className="flex items-center gap-2 text-sm select-none" style={{ color: "var(--iron)" }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="w-4 h-4" style={{ accentColor: "var(--cerulean)" }} />
                Keep me logged in
              </label>
              {error && <div role="alert" className="text-sm" style={{ color: "var(--ember)" }}>{error}</div>}
              <button type="submit" disabled={busy} aria-busy={busy} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> One moment…</> : "Create account"}
              </button>
              <button type="button" onClick={backToEmail} className="cx-quiet w-full text-sm">Use a different email</button>
            </form>
          ) : mode === "password" ? (
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <Field label="Email">
                {/* Kept as a field so a password manager fills and saves the pair; changing it starts again. */}
                <input type="email" className="cx-input" value={email} readOnly autoComplete="username" style={{ color: "var(--iron)" }} />
              </Field>
              <Field label="Password">
                <input type="password" className="cx-input" value={password} autoFocus
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
              <button type="button" onClick={backToEmail} className="cx-quiet w-full text-sm">Use a different email</button>
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
                  <button type="submit" disabled={!email.trim() || busy} aria-busy={busy} className="cx-btn-primary w-full py-2.5 text-base flex items-center justify-center gap-2">
                    {busy ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Sending…</> : "Send temporary password"}
                  </button>
                  <button type="button" onClick={backToLogin} className="cx-quiet w-full text-sm">Back to login</button>
                </>
              ) : (
                <>
                  <div className="text-sm" style={{ color: resetResult.ok ? "var(--moss)" : "var(--ember)" }}>{resetResult.message}</div>
                  {resetResult.ok && (
                    <div className="text-sm" style={{ color: "var(--iron)" }}>
                      It may take a minute to arrive. Check the junk folder before trying again — each attempt replaces the last password sent.
                    </div>
                  )}
                  <button type="button" onClick={backToLogin} className="cx-quiet w-full py-2 text-sm">Back to login</button>
                </>
              )}
            </form>
          )}
        </div>
        <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.75)" }}>
          Part of the Trainability family
        </p>
      </div>
      <InstallBanner />
    </div>
  );
}
