import nodemailer from "nodemailer";

/**
 * Sending email: Studio's server/email.js, cut to what Coach needs so far (a
 * Coach account's temporary password; stage four, Glenn, 18 Oct 2026). The
 * same two ways out and the same settings as Studio, so the host is set up
 * the same way:
 *
 *   SMTP_HOST, SMTP_USER, SMTP_PASS (SMTP_PORT, 465 by default): any host
 *   that lets a process reach a mail server.
 *   EMAIL_GATEWAY=on: GoDaddy Node.js Hosting's own gateway, for a host that
 *   doesn't route SMTP at all; EMAIL_GATEWAY_FROM asks it for a sender.
 *   EMAIL_ALLOWLIST: while set, only those addresses are emailed (testing).
 *   MESSAGES_OFF=on: nothing is sent at all.
 *
 * Never throws: the caller is told whether it went, and why not.
 */

const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const gatewayEnabled = () => /^(1|true|on|yes)$/i.test(process.env.EMAIL_GATEWAY || "");
export const EMAIL_CONFIGURED = () => smtpConfigured() || gatewayEnabled();
const messagesOff = () => /^(1|true|on|yes)$/i.test(process.env.MESSAGES_OFF || "");
const allowlist = () => (process.env.EMAIL_ALLOWLIST || "").split(",").map(a => a.trim().toLowerCase()).filter(Boolean);
export const looksLikeEmail = (raw) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(raw || "").trim());

let transport = null;
function mailer() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port,
      // 465 is implicit TLS; 587 starts plaintext and upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      pool: true, maxConnections: 2, maxMessages: 50,
    });
  }
  return transport;
}

// Loopback inside the container; the platform fixes the address.
const GATEWAY_URL = "http://127.0.0.1:2525/api/email/send";
const gatewayFrom = () => {
  const raw = (process.env.EMAIL_GATEWAY_FROM || "").trim();
  if (!raw) return null;
  if (!looksLikeEmail(raw)) { console.error(`EMAIL_GATEWAY_FROM is not an email address (${raw}): letting the gateway choose.`); return null; }
  return raw;
};
async function postGateway(payload) {
  const res = await fetch(GATEWAY_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30_000) });
  const body = await res.json().catch(() => ({ success: false, error: `non-JSON response (HTTP ${res.status})` }));
  if (!res.ok || !body.success) { const err = new Error(body.error || `HTTP ${res.status}`); err.refused = true; throw err; }
  return body.messageId;
}
/* As Studio's: the sender asked for first, then the gateway's own after a
   refusal (never after a timeout, which may already have sent). */
async function viaGateway({ to, subject, html, text, fromName }) {
  const message = { to: [to], subject, text: text || undefined, html: html || undefined };
  const from = gatewayFrom();
  if (!from) return postGateway(message);
  const name = String(fromName || "").replace(/["<>\r\n]/g, "").trim();
  for (const sender of name ? [`"${name}" <${from}>`, from] : [from]) {
    try { return await postGateway({ ...message, from: sender }); }
    catch (err) { if (!err.refused) throw err; console.error(`email gateway refused the sender ${sender} (${err.message})`); }
  }
  return postGateway(message);
}

/** One message out: { sent: true } or { sent: false, reason }. */
export async function sendEmail({ to, subject, html, text, fromName = "Trainability Coach" }) {
  if (messagesOff()) { console.log(`[messages off] held back an email to ${to}: ${subject}`); return { sent: false, reason: "messages are off" }; }
  if (!EMAIL_CONFIGURED()) return { sent: false, reason: "email not configured" };
  if (!looksLikeEmail(to)) return { sent: false, reason: "no usable email address" };
  const list = allowlist();
  if (list.length && !list.includes(String(to).trim().toLowerCase())) return { sent: false, reason: "not on EMAIL_ALLOWLIST" };
  try {
    if (smtpConfigured()) {
      const from = `"${String(fromName).replace(/["<>\r\n]/g, "")}" <${process.env.SMTP_USER}>`;
      await mailer().sendMail({ from, to, subject, html, text });
    } else {
      await viaGateway({ to, subject, html, text, fromName });
    }
    return { sent: true };
  } catch (err) {
    console.error(`Email to ${to} not sent: ${err.message}`);
    return { sent: false, reason: err.message };
  }
}
