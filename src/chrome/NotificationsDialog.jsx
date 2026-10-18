import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, Check, Loader2, X } from "lucide-react";
import { apiRequest } from "../lib/api";
import { appleMobile, runningInstalled } from "../lib/install";

/*
 * Notifications on this device (Glenn, 18 Oct 2026: "Enable in-app push
 * notifications here, put in the profile settings somewhere for now"),
 * opened from the account menu. Studio's PushNotifications (its
 * src/components/PushNotifications.jsx), its steps and words: On and Off for
 * this device only; the browser's own "Allow notifications?" box only after
 * On is tapped, never on page load (a No there is for good); what to be told
 * about, ticked; and Send a test. On an iPhone or iPad in Safari, the way to
 * the Home Screen first, since that is the only place they work there.
 */

/* The server's public key, as the browser wants it. */
function keyBytes(b64) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/* What this browser can do: "ok", "home" (an iPhone or iPad in Safari, which
   needs Coach on the Home Screen first), "blocked" (they said No before), or
   "none". */
export function supportHere() {
  const can = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!can) return appleMobile() && !runningInstalled() ? "home" : "none";
  if (Notification.permission === "denied") return "blocked";
  return "ok";
}

export async function currentSubscription() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

export function NotificationsDialog({ info, state, setState, onClose }) {
  const [support, setSupport] = useState(supportHere);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);
  const allKinds = info.kinds.map(k => k.kind);

  async function save(kinds) {
    const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    /* The browser asks its own push service (Apple's, Google's …) for an
       address; on a network that can't reach it, that never answers, so it
       is given up after 20 seconds rather than spinning for good. */
    if (!sub) {
      sub = await Promise.race([
        reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(info.publicKey) }),
        new Promise((_, no) => setTimeout(() => no(new Error("This device couldn't reach its notification service. Check the connection and try again.")), 20000)),
      ]);
    }
    setState(await apiRequest("PUT", "/push", { subscription: sub.toJSON(), kinds }));
  }

  async function turn(on) {
    if (busy || state.on === on) return;
    setBusy(true); setError(null); setNote(null);
    try {
      if (on) {
        const answer = await Notification.requestPermission();
        if (answer !== "granted") {
          setSupport(answer === "denied" ? "blocked" : "ok");
          if (answer !== "denied") setError("Notifications weren't allowed, so nothing changed.");
          return;
        }
        await save(state.kinds.length ? state.kinds : allKinds);
      } else {
        const sub = await currentSubscription();
        const out = sub ? await apiRequest("POST", "/push/off", { endpoint: sub.endpoint }) : { others: 0 };
        /* Let the browser go only when nobody else on it still wants them. */
        if (sub && !out.others) await sub.unsubscribe().catch(() => {});
        setState({ on: false, kinds: [] });
      }
    } catch (err) {
      setError(err.message || "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pick(kind) {
    if (busy) return;
    const next = state.kinds.includes(kind) ? state.kinds.filter(k => k !== kind) : [...state.kinds, kind];
    if (!next.length) return;
    setBusy(true); setError(null); setNote(null);
    try { await save(allKinds.filter(k => next.includes(k))); }
    catch (err) { setError(err.message || "That could not be saved."); }
    finally { setBusy(false); }
  }

  async function test() {
    if (busy) return;
    setBusy(true); setError(null); setNote(null);
    try {
      const sub = await currentSubscription();
      const out = await apiRequest("POST", "/push/test", { endpoint: sub?.endpoint });
      if (out.sent) setNote("Sent. It should arrive in a few seconds.");
      else setError(out.off ? "Messages are switched off on this server while it is being tested, so nothing was sent."
        : `It didn't arrive: ${out.reason || "the push service said no"}.`);
    } catch (err) {
      setError(err.message || "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const blockedWords = support === "home"
    ? <>On an iPhone or iPad, notifications work once Coach is on your Home Screen: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, and open it from there to turn them on.</>
    : support === "blocked"
      ? "Notifications from this app are blocked in this browser's settings. Allow them there, then come back here to turn them on."
      : "This browser can't show notifications from this app.";

  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Notifications" className="cx-card w-full sm:max-w-md p-5 grid gap-4" style={{ borderRadius: 16 }}>
        <div className="flex items-start gap-3">
          <h2 className="cx-display text-xl flex-1">Notifications on this device</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <p className="text-sm -mt-2" style={{ color: "var(--iron)" }}>
          News from Coach on this phone or computer, even when Coach isn&apos;t open. Only this device: turn it on on each one you want told.
        </p>

        {support !== "ok" ? (
          <p className="text-sm p-3 rounded-lg" style={{ background: "var(--iq-card)", color: "var(--iq-ink)" }}>{blockedWords}</p>
        ) : (
          <>
            <div className="flex rounded-[10px] p-1 gap-1" style={{ background: "var(--ghost-fill)" }} role="group" aria-label="Notifications on this device">
              {[[true, "On", Bell], [false, "Off", BellOff]].map(([value, label, Icon]) => (
                <button key={label} type="button" aria-pressed={state.on === value} onClick={() => turn(value)} disabled={busy}
                  className="cx-chip flex-1 px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5"
                  style={state.on === value
                    ? { background: "var(--chalk)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" }
                    : { color: "var(--iron)" }}>
                  {busy && state.on !== value ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />} {label}
                </button>
              ))}
            </div>

            {state.on && info.kinds.length > 1 && (
              <div className="grid gap-1">
                {info.kinds.map(k => {
                  const checked = state.kinds.includes(k.kind);
                  return (
                    <button key={k.kind} type="button" role="checkbox" aria-checked={checked} onClick={() => pick(k.kind)}
                      /* The last one can't be unticked: nothing ticked is Off, which has its own button. */
                      disabled={busy || (checked && state.kinds.length === 1)}
                      className="w-full flex items-start gap-2 text-left py-1 disabled:cursor-default">
                      <span className="mt-0.5 w-[18px] h-[18px] rounded flex items-center justify-center flex-none"
                        style={checked ? { background: "var(--fill-cerulean)", color: "#fff" } : { border: "2px solid var(--iron-line)" }}>
                        {checked && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                      </span>
                      <span>
                        <span className="block text-sm">{k.label}</span>
                        <span className="block text-xs" style={{ color: "var(--iron)" }}>{k.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {state.on && info.kinds.length === 1 && (
              <p className="text-sm" style={{ color: "var(--iron)" }}><strong style={{ color: "var(--ink)", fontWeight: 500 }}>{info.kinds[0].label}.</strong> {info.kinds[0].detail}</p>
            )}

            {state.on && (
              <div>
                <button type="button" onClick={test} disabled={busy} className="cx-btn-row">Send a test</button>
              </div>
            )}
          </>
        )}

        {note && <p className="text-sm" role="status" style={{ color: "var(--iron)" }}>{note}</p>}
        {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      </div>
    </div>,
    document.body,
  );
}
