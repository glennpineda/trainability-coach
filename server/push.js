import crypto from "node:crypto";
import webpush from "web-push";
import { all, get, run } from "./db.js";
import { messagesOff } from "./email.js";

/**
 * Notifications on a phone or computer: web push (Glenn, 18 Oct 2026:
 * "Enable in-app push notifications here, put in the profile settings
 * somewhere for now"). Studio's (its server/push.js), cut to what Coach has
 * to tell: the same subscribe, look up, turn off and "Send a test", the same
 * check that the address is a push service's, the same handling of a device
 * that has gone, and the same switches.
 *
 * **What goes.** Chosen per device (`kinds`), as in Studio:
 *
 * - `client_message` — a client answered or wrote to the trainer in Messages
 *   (from Studio's client page, through the client link).
 *
 * A Coach account has no clients who can write (they read on Trainability's
 * client page), so it has nothing to turn on yet.
 *
 * **Off unless the keys are set.** VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
 * (`npx web-push generate-vapid-keys`), with VAPID_SUBJECT, a mailto: or
 * https: address the push services can reach the sender at. Coach's own, not
 * Studio's: each app is its own site to a browser. Without them nothing is
 * sent and the account menu offers nothing. MESSAGES_OFF stops every push.
 *
 * **Only a push service is ever called.** The endpoint comes from the browser,
 * so it is checked against the push services' own hosts before it is stored —
 * otherwise "subscribe" would be a way to make this server post to any
 * address. PUSH_FAKE_ORIGIN adds one more, for tests: a fake push service on
 * this machine. Never set it on a host.
 */

/* Chrome and Edge's Android, Firefox, Safari (Apple), and Edge on Windows. */
const PUSH_HOSTS = [
  /(^|\.)fcm\.googleapis\.com$/i,
  /(^|\.)android\.googleapis\.com$/i,
  /(^|\.)push\.services\.mozilla\.com$/i,
  /(^|\.)push\.apple\.com$/i,
  /(^|\.)notify\.windows\.com$/i,
];

/* What each reads as where it is turned on. */
export const PUSH_KIND_WORDS = {
  client_message: { label: "Messages from clients", detail: "When a client writes to you in Messages: who, and the start of what they wrote." },
};

/** What a trainer's device may carry: nothing for a Coach account yet. */
export const kindsFor = (user) => (user?.coachAccount ? [] : ["client_message"]);
export const kindChoices = (user) => kindsFor(user).map(kind => ({ kind, ...PUSH_KIND_WORDS[kind] }));

export const pushConfigured = () =>
  !!(String(process.env.VAPID_PUBLIC_KEY || "").trim() && String(process.env.VAPID_PRIVATE_KEY || "").trim());
export const publicKey = () => (pushConfigured() ? String(process.env.VAPID_PUBLIC_KEY).trim() : null);

/* The sender's contact, which the push services read: the app's own address
   when nothing else is set, as long as it is https (they refuse anything else). */
function subject() {
  const set = String(process.env.VAPID_SUBJECT || "").trim();
  if (set) return set;
  const origin = String(process.env.APP_ORIGIN || "").trim();
  return /^https:\/\//i.test(origin) ? origin : "mailto:noreply@example.com";
}

const hashOf = (endpoint) => crypto.createHash("sha256").update(String(endpoint)).digest("hex");
const now = () => new Date().toISOString();
const failure = (status, code, message) => Object.assign(new Error(message), { status, code });

export function endpointAllowed(endpoint) {
  let url;
  try { url = new URL(String(endpoint || "")); } catch { return false; }
  const fake = String(process.env.PUSH_FAKE_ORIGIN || "").trim().replace(/\/$/, "");
  if (fake && url.origin === fake) return true;
  return url.protocol === "https:" && PUSH_HOSTS.some(re => re.test(url.hostname));
}

const kindsOf = (row) => String(row?.kinds || "").split(",").filter(Boolean);

/* What a person may ask for, from what they sent; everything theirs when nothing was said. */
function cleanKinds(user, kinds) {
  const allowed = kindsFor(user);
  if (kinds == null) return allowed;
  if (!Array.isArray(kinds)) throw failure(400, "push_kinds", "Say what this device should be told about.");
  if (kinds.some(k => !allowed.includes(k))) throw failure(400, "push_kinds", "That isn't something this device can be told about.");
  return allowed.filter(k => kinds.includes(k));
}

/**
 * Turn this device on for a trainer, or change what it carries. The browser's
 * `PushSubscription` as JSON: `{ endpoint, keys: { p256dh, auth } }`.
 */
export async function subscribe(user, { subscription, kinds, userAgent = null } = {}) {
  if (!pushConfigured()) throw failure(409, "push_off", "Notifications aren't set up on this server.");
  const endpoint = String(subscription?.endpoint || "");
  const p256dh = String(subscription?.keys?.p256dh || "");
  const auth = String(subscription?.keys?.auth || "");
  if (!endpoint || !p256dh || !auth || endpoint.length > 1024 || p256dh.length > 255 || auth.length > 255) {
    throw failure(400, "push_subscription", "That isn't a notification subscription this app can use.");
  }
  if (!endpointAllowed(endpoint)) throw failure(400, "push_endpoint", "That notification address isn't a push service's.");
  const chosen = cleanKinds(user, kinds);
  const hash = hashOf(endpoint);
  const agent = userAgent ? String(userAgent).slice(0, 255) : null;
  const existing = await get(`SELECT endpoint_hash FROM coach_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?`, [hash, user.id]);
  if (existing) {
    /* The browser may have renewed its keys; the newest are the ones that work. */
    await run(`UPDATE coach_push_subscriptions SET endpoint = ?, p256dh = ?, auth = ?, kinds = ?, user_agent = ?, failures = 0, last_error = NULL
      WHERE endpoint_hash = ? AND user_id = ?`, [endpoint, p256dh, auth, chosen.join(","), agent, hash, user.id]);
  } else {
    await run(`INSERT INTO coach_push_subscriptions (endpoint_hash, user_id, endpoint, p256dh, auth, kinds, user_agent, created_at, failures)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`, [hash, user.id, endpoint, p256dh, auth, chosen.join(","), agent, now()]);
  }
  return { on: true, kinds: chosen };
}

/**
 * Turn this device off for a trainer. `others` is how many other people this
 * same browser still carries notifications for, so the page lets go of the
 * browser's own subscription only when nobody is left on it.
 */
export async function unsubscribe(user, endpoint) {
  const hash = hashOf(endpoint);
  await run(`DELETE FROM coach_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?`, [hash, user.id]);
  const left = await get(`SELECT COUNT(*) AS n FROM coach_push_subscriptions WHERE endpoint_hash = ?`, [hash]);
  return { on: false, others: Number(left?.n || 0) };
}

/** Whether this device is on for a trainer, and with what. */
export async function lookup(user, endpoint) {
  const row = endpoint
    ? await get(`SELECT kinds FROM coach_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?`, [hashOf(endpoint), user.id])
    : null;
  return row ? { on: true, kinds: kindsOf(row) } : { on: false, kinds: [] };
}

/* Studio's deliver: encrypted and signed by web-push, then posted here so the
   timeout is ours. 404 and 410 are the push service saying this browser has
   gone, and the row goes with it; anything else is counted. */
async function deliver(row, payload) {
  let details;
  try {
    details = webpush.generateRequestDetails(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
      {
        vapidDetails: { subject: subject(), publicKey: process.env.VAPID_PUBLIC_KEY.trim(), privateKey: process.env.VAPID_PRIVATE_KEY.trim() },
        TTL: 24 * 60 * 60,
        urgency: payload.urgent ? "high" : "normal",
        ...(payload.tag ? { topic: String(payload.tag).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) || undefined } : {}),
      });
  } catch (err) {
    await noteFailure(row, `could not be prepared: ${err.message}`);
    return { sent: false, reason: err.message };
  }
  try {
    const res = await fetch(details.endpoint, { method: details.method, headers: details.headers, body: details.body, signal: AbortSignal.timeout(10_000) });
    if (res.ok) {
      await run(`UPDATE coach_push_subscriptions SET last_ok_at = ?, failures = 0, last_error = NULL WHERE endpoint_hash = ? AND user_id = ?`, [now(), row.endpoint_hash, row.user_id]);
      return { sent: true };
    }
    if (res.status === 404 || res.status === 410) {
      await run(`DELETE FROM coach_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?`, [row.endpoint_hash, row.user_id]);
      return { sent: false, gone: true, reason: `the push service says this device has gone (${res.status})` };
    }
    await noteFailure(row, `push service answered ${res.status}`);
    return { sent: false, reason: `push service answered ${res.status}` };
  } catch (err) {
    await noteFailure(row, err.message);
    return { sent: false, reason: err.message };
  }
}

async function noteFailure(row, reason) {
  await run(`UPDATE coach_push_subscriptions SET failures = failures + 1, last_error = ? WHERE endpoint_hash = ? AND user_id = ?`,
    [String(reason).slice(0, 255), row.endpoint_hash, row.user_id]);
}

/**
 * Every device of one trainer that carries `kind`. `payload` is what the
 * service worker shows: `{ title, body, url, tag }`, `url` being where a tap
 * opens. Never throws.
 */
export async function pushTo(userId, kind, payload) {
  try {
    if (!pushConfigured()) return { sent: 0, reason: "push not set up" };
    const rows = (await all(`SELECT * FROM coach_push_subscriptions WHERE user_id = ?`, [userId])).filter(r => kindsOf(r).includes(kind));
    if (!rows.length) return { sent: 0, reason: "no device" };
    if (messagesOff()) return { sent: 0, off: true, reason: "messages are off" };
    let sent = 0;
    const reasons = [];
    for (const row of rows) {
      const r = await deliver(row, payload);
      if (r.sent) sent++; else reasons.push(r.reason);
    }
    return { sent, devices: rows.length, ...(sent ? {} : { reason: reasons[0] || "not sent" }) };
  } catch (err) {
    console.warn("Push failed:", err.message);
    return { sent: 0, reason: err.message };
  }
}

/** "Send a test": one notification to this device only, so it can be seen to arrive. */
export async function pushTest(user, endpoint) {
  if (!pushConfigured()) throw failure(409, "push_off", "Notifications aren't set up on this server.");
  const row = endpoint ? await get(`SELECT * FROM coach_push_subscriptions WHERE endpoint_hash = ? AND user_id = ?`, [hashOf(endpoint), user.id]) : null;
  if (!row) throw failure(404, "push_not_on", "Notifications aren't on for this device.");
  if (messagesOff()) return { sent: false, off: true, reason: "messages are off" };
  return deliver(row, { title: "Notifications are on", body: "This is how news from Coach will look on this device.", url: "/", tag: "test" });
}
