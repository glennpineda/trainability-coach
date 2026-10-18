import crypto from "node:crypto";
import { promisify } from "node:util";
import { all, get, run } from "./db.js";
import { insertWithNewId } from "./ids.js";
import { tempPassword } from "./temp-password.js";
import { sendEmail, EMAIL_CONFIGURED } from "./email.js";

/**
 * Coach's own accounts, for trainers who aren't on Trainability's team
 * (Glenn, 18 Oct 2026: "anyone (a trainer) can create an account at Coach to
 * use its functionality. But if you have a Studio account, it just syncs it
 * better"). Trainability's own trainers keep signing in with their Studio
 * account, relayed as before; an email with a Coach account here signs in
 * here instead.
 *
 * Passwords are kept as Studio keeps them (its server/auth.js): scrypt from
 * node:crypto, the same cost and the same stored form, compared in constant
 * time. A session is a random token in an HttpOnly cookie, cx_session, and
 * only its SHA-256 is stored.
 */

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
/* Studio's minimum, so one rule holds in both apps. */
export const PASSWORD_MIN = 8;
export const COOKIE = "cx_session";
/* How long a sign-in lasts: a month with "Keep me logged in", otherwise until
   the browser is closed, and at most a day here. */
const LONG = 30 * 24 * 3600 * 1000, SHORT = 24 * 3600 * 1000;

const now = () => new Date().toISOString();
export const emailKey = (email) => String(email || "").trim().toLowerCase();
export const looksLikeEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim()) && String(email).length <= 190;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${key.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, salt, hex] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const key = await scrypt(password, salt, hex.length / 2, { N: +N, r: +r, p: +p });
    const expected = Buffer.from(hex, "hex");
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
/* A hash to compare against when there is no account, so a missing email
   takes as long as a wrong password and the time doesn't say which. */
const DUMMY = hashPassword(crypto.randomBytes(16).toString("hex"));

/** What makes a sign-up acceptable, or the reason not. */
export function checkSignup({ name, email, password } = {}) {
  if (!String(name || "").trim()) return "Type your name.";
  if (String(name).trim().length > 120) return "Keep your name under 120 characters.";
  if (!looksLikeEmail(email)) return "That email address is not complete.";
  if (typeof password !== "string" || password.length < PASSWORD_MIN || !password.trim()) return `Your password needs at least ${PASSWORD_MIN} characters.`;
  if (password.length > 200) return "Keep your password under 200 characters.";
  return null;
}

/* An account that still signs in here: one linked to Studio signs in with
   Studio's password, so it no longer answers. */
export const accountByEmail = (email) => get(`SELECT * FROM coach_accounts WHERE email = ? AND studio_user_id = ''`, [emailKey(email)]);

/* A new account's id must not already be a trainer here: ids share Studio's
   tag, so one that happened to match a Studio trainer's would mix two
   people's programs and equipment. */
async function usedAsTrainer(id) {
  for (const table of ["coach_places", "coach_programs", "coach_trainer_settings", "coach_own_names", "coach_private_exercises"]) {
    if (await get(`SELECT 1 AS x FROM ${table} WHERE trainer_id = ? LIMIT 1`, [id])) return true;
  }
  return false;
}

export async function createAccount({ name, email, password }) {
  const hash = await hashPassword(password);
  return insertWithNewId("account", async (id) => {
    if (await usedAsTrainer(id)) throw Object.assign(new Error("id in use"), { code: "ER_DUP_ENTRY" });
    await run(`INSERT INTO coach_accounts (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, emailKey(email), String(name).trim().slice(0, 120), hash, now()]);
  });
}

/** The account for this email and password, or null; always as slow either way. */
export async function checkLogin(email, password) {
  const a = await accountByEmail(email);
  const ok = await verifyPassword(String(password || ""), a ? a.password_hash : await DUMMY);
  if (!a || !ok) return null;
  await run(`UPDATE coach_accounts SET last_login_at = ? WHERE id = ?`, [now(), a.id]);
  return a;
}

const tokenHash = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");

/** A new session for an account: the token for the cookie, and how long it lasts. */
export async function startSession(accountId, remember) {
  const token = crypto.randomBytes(32).toString("base64url");
  const ms = remember ? LONG : SHORT;
  await run(`INSERT INTO coach_sessions (token_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)`,
    [tokenHash(token), accountId, now(), new Date(Date.now() + ms).toISOString()]);
  return { token, maxAge: remember ? ms : null };
}

/** The account signed in with this token, or null. */
export async function accountOfSession(token) {
  if (!token) return null;
  const s = await get(`SELECT * FROM coach_sessions WHERE token_hash = ?`, [tokenHash(token)]);
  if (!s) return null;
  if (s.expires_at < now()) { await run(`DELETE FROM coach_sessions WHERE token_hash = ?`, [s.token_hash]); return null; }
  return get(`SELECT * FROM coach_accounts WHERE id = ?`, [s.account_id]);
}

export const endSession = (token) => token ? run(`DELETE FROM coach_sessions WHERE token_hash = ?`, [tokenHash(token)]) : null;

/** An account as the app sees a signed-in person: a trainer, marked as Coach's own. */
export const asUser = (a) => ({ id: a.id, name: a.name, email: a.email, role: "trainer", coachAccount: true,
  ...(Number(a.must_change_password) ? { mustChangePassword: true } : {}) });

/* ------------------------------------------------- a forgotten password

   Studio's way (its /api/auth/forgot-password and account-emails.js; stage
   four, Glenn, 18 Oct 2026): a temporary password, easy to type on a phone
   (temp-password.js), emailed; the old one stops working and every session
   ends; the next sign-in asks for their own before anything else. Only the
   hash is kept, so if the email can't go, the password goes to the server's
   log, as Studio's does, rather than being lost. */

/* Three asks per account and twenty per address in fifteen minutes, Studio's numbers. */
const resets = new Map();
export function resetAllowed(ip, email) {
  const t = Date.now();
  for (const [k, max] of [[`ip:${ip}`, 20], [`em:${emailKey(email)}`, 3]]) {
    const list = (resets.get(k) || []).filter(x => t - x < 15 * 60 * 1000);
    resets.set(k, list);
    if (list.length >= max) return Math.ceil((list[0] + 15 * 60 * 1000 - t) / 1000);
  }
  for (const k of [`ip:${ip}`, `em:${emailKey(email)}`]) resets.get(k).push(t);
  return 0;
}

/** The email, built apart from the sending (Studio's credentialsEmail, for an asked-for reset). */
export function resetEmail({ name, email, temp, origin }) {
  const first = String(name || "").trim().split(" ")[0] || "there";
  const link = String(origin || "").replace(/\/$/, "");
  const text = [
    `Hi ${first},`, "",
    "A new password was asked for on Coach's sign-in page, so your old one no longer works.", "",
    `Sign in with:  ${email}`, `Temporary password:  ${temp}`, link ? `\n${link}` : "", "",
    "Sign in with this temporary one and choose your own.",
    "If you did not ask for this, someone typed your email on Coach's sign-in page. Sign in with this one and choose your own all the same.",
    "", "Trainability Coach",
  ].join("\n");
  const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const html = `<div style="font-family:Roboto,Arial,sans-serif;color:#172A3A;font-size:15px;line-height:1.5">
<p>Hi ${esc(first)},</p>
<p>A new password was asked for on Coach's sign-in page, so your old one no longer works.</p>
<p style="background:#E8F4FA;border-radius:10px;padding:12px 14px">Sign in with: <strong>${esc(email)}</strong><br>Temporary password: <strong style="font-family:Menlo,monospace">${esc(temp)}</strong></p>
${link ? `<p><a href="${esc(link)}" style="color:#007BA7">${esc(link)}</a></p>` : ""}
<p>Sign in with this temporary one and choose your own.</p>
<p style="color:#5B6B78">If you did not ask for this, someone typed your email on Coach's sign-in page. Sign in with this one and choose your own all the same.</p>
<p>Trainability Coach</p></div>`;
  return { subject: "Your password was reset", text, html };
}

/** A temporary password for this account, emailed (or logged if it can't be). */
export async function resetPassword(account, origin) {
  const temp = tempPassword();
  await run(`UPDATE coach_accounts SET password_hash = ?, must_change_password = 1 WHERE id = ?`, [await hashPassword(temp), account.id]);
  await run(`DELETE FROM coach_sessions WHERE account_id = ?`, [account.id]);
  const result = await sendEmail({ to: account.email, ...resetEmail({ name: account.name, email: account.email, temp, origin }) });
  if (!result.sent) {
    console.log(`Temporary password for ${account.email}: ${temp} (${EMAIL_CONFIGURED() ? `email not sent: ${result.reason}` : "no email set up, so it is here instead"})`);
  }
  return result;
}

/**
 * Their own password chosen (Studio's /api/auth/password): at least the
 * minimum, not the one they have now; the current one asked for unless they
 * signed in with a temporary one. Other sessions end; this one stays. Returns
 * null or { status, error, code }.
 */
export async function changePassword(account, { currentPassword, newPassword }, keepToken) {
  if (typeof newPassword !== "string" || newPassword.length < PASSWORD_MIN || !newPassword.trim()) {
    return { status: 400, error: `New password must be at least ${PASSWORD_MIN} characters.`, code: "weak_password" };
  }
  if (newPassword.length > 200) return { status: 400, error: "New password can be at most 200 characters.", code: "weak_password" };
  if (await verifyPassword(newPassword, account.password_hash)) {
    return { status: 400, error: "Choose a password different from the one you have now.", code: "same_password" };
  }
  if (!Number(account.must_change_password) && !await verifyPassword(String(currentPassword || ""), account.password_hash)) {
    return { status: 401, error: "Your current password is incorrect." };
  }
  await run(`UPDATE coach_accounts SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [await hashPassword(newPassword), account.id]);
  await run(`DELETE FROM coach_sessions WHERE account_id = ? AND token_hash != ?`, [account.id, tokenHash(keepToken)]);
  return null;
}

/**
 * A Coach account joined to its owner's Studio account (stage three; Glenn,
 * 18 Oct 2026: "if they have an account on Studio, it's just linked"). From
 * now on they sign in with Studio's password, as Studio's user, so everything
 * this account made here becomes that user's: their places and equipment,
 * programs, own names and private exercises, settings, and clients still
 * kept in Coach (they move into Studio only when the trainer says so, since
 * the business can see Studio's clients). Where the Studio user already has
 * one of a kind (a setting, an own name for the same word), theirs is kept.
 * The account's sessions end; it no longer signs in here.
 */
export async function link(account, studioUser) {
  const from = account.id, to = studioUser.id;
  if (from !== to) {
    for (const table of ["coach_places", "coach_place_equipment", "coach_programs", "coach_private_exercises", "coach_clients"]) {
      await run(`UPDATE ${table} SET trainer_id = ? WHERE trainer_id = ?`, [to, from]);
    }
    /* One of each per trainer: theirs wins, the account's goes. */
    for (const [table, key] of [["coach_trainer_settings", "name"], ["coach_own_names", "name_key"]]) {
      const had = new Set((await all(`SELECT ${key} AS k FROM ${table} WHERE trainer_id = ?`, [to])).map(r => r.k));
      for (const r of await all(`SELECT ${key} AS k FROM ${table} WHERE trainer_id = ?`, [from])) {
        if (had.has(r.k)) await run(`DELETE FROM ${table} WHERE trainer_id = ? AND ${key} = ?`, [from, r.k]);
        else await run(`UPDATE ${table} SET trainer_id = ? WHERE trainer_id = ? AND ${key} = ?`, [to, from, r.k]);
      }
    }
    await run(`UPDATE coach_limitations SET written_by = ?, written_by_name = ? WHERE written_by = ?`, [to, String(studioUser.name || account.name).slice(0, 120), from]);
  }
  await run(`UPDATE coach_accounts SET studio_user_id = ?, linked_at = ? WHERE id = ?`, [to, now(), from]);
  await run(`DELETE FROM coach_sessions WHERE account_id = ?`, [from]);
}

/* Sign-in and sign-up tries in fifteen minutes, then a wait: ten for one
   email, fifty from one address (a gym's trainers can share one). */
const tries = new Map();
export function tooMany(key) {
  const t = Date.now(), list = (tries.get(key) || []).filter(x => t - x < 15 * 60 * 1000);
  tries.set(key, list);
  return list.length >= (key.startsWith("ip:") ? 50 : 10) ? Math.ceil((list[0] + 15 * 60 * 1000 - t) / 1000) : 0;
}
export function counted(key) { tries.set(key, [...(tries.get(key) || []), Date.now()]); }
export function forget(key) { tries.delete(key); }
/* Sessions past their end, cleared now and then. */
export const sweep = () => run(`DELETE FROM coach_sessions WHERE expires_at < ?`, [now()]);
