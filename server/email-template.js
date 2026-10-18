/**
 * The shell Coach's emails are built on: Studio's (its server/email-template.js,
 * emailShell and the pieces it is drawn with), the same layout, palette, type
 * and wording, with Coach's logo in the band and Coach where Studio names
 * itself (Glenn, 18 Oct 2026: "use the same email template but just change the
 * logo and 'Trainability Studio' text in it"). Cut to what Coach sends: no
 * logo editions, letterheads or stop links yet.
 *
 * Inline styles and tables, as Studio's, because an email client is not a
 * browser. The palette is Coach's own (below), in Studio's places.
 */

/* Coach's light theme (src/index.css), frozen, in the places Studio's
   palette goes (Glenn, 18 Oct 2026: "Also use Coach's colors for the email
   template"): Studio's magenta is Coach's cerulean, its violet edge Coach's
   sky, its lilac band Coach's pale blue. */
export const MAIL = {
  paper: "#F3F7FA",      // the page behind the card        --paper
  card: "#FFFFFF",       // the card itself                 --chalk
  line: "#D5DEE5",       // its border                      --iron-line
  rule: "#D5DEE5",       // the rules inside it             --iron-line
  ink: "#172A3A",        //                                 --ink (Navy)
  inkSoft: "#3B4F60",    //                                 --ink-soft
  faint: "#5B6B78",      // the last footer line            --iron
  accent: "#007BA7",     // the password, a figure          --accent (Cerulean)
  fill: "#007BA7",       // the button, white on it          --fill-cerulean
  edge: "#4FA8DC",       // the edge's far end              --sky
  bandTop: "#F5FAFD",    // the band's top
  band: "#E3F1F8",       // the band's bottom, and its flat --accent-soft
};

/* Who signs every email, under the card and at the foot of its plain text. */
export const SIGNER = "Trainability";

export const signedBy = (name, body) => `${body}\n\n- ${name}`;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,Menlo,monospace";

export const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The site the pictures are fetched from: only one a stranger's mail client
 * could reach (Studio's iconUrl), so never localhost; with none, the band
 * shows the name in words.
 */
export function siteOf(origin = process.env.APP_ORIGIN || "") {
  const raw = String(origin || "").trim().replace(/\/$/, "");
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (/^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i.test(url.hostname)) return null;
  return url.origin;
}

const PILL = "border-radius:999px;font-size:15px;font-weight:600;display:inline-block;";
const PILL_FILLED = `background:${MAIL.fill};color:#fff;padding:12px 22px;border:0;${PILL}`;

export const button = (href, label) =>
  `<a href="${esc(href)}" style="${PILL_FILLED}text-decoration:none;">${esc(label)}</a>`;

/** The email's one action, centred. */
export const cta = (href, label) =>
  `<div style="margin:24px 0 12px;text-align:center;"><span style="display:inline-block;margin:0 4px 8px;">${button(href, label)}</span></div>`;

/** An inset block: the details of a sign-in. */
export const panel = (innerHtml, { align = "left", ground = MAIL.paper } = {}) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0;background:${ground};border-radius:10px;">`
  + `<tr><td align="${align}" style="padding:14px 16px;">${innerHtml}</td></tr></table>`;

/** Labelled details, label above value. Values are HTML. */
export const rows = (pairs) => pairs
  .filter(([, v]) => v !== undefined && v !== null && v !== "")
  .map(([k, v]) => `<div style="font-size:13px;color:${MAIL.inkSoft};">${esc(k)}</div>`
    + `<div style="font-size:15px;color:${MAIL.ink};padding-bottom:10px;white-space:pre-line;">${v}</div>`)
  .join("");

/** A code or password to copy. */
export const mono = (text, { size = 17 } = {}) =>
  `<strong style="font-family:${MONO};font-size:${size}px;color:${MAIL.accent};font-weight:700;">${esc(text)}</strong>`;

export const para = (html, { size = 15, color = MAIL.ink, top = 0, bottom = 14 } = {}) =>
  `<p style="margin:${top}px 0 ${bottom}px;font-size:${size}px;line-height:1.55;color:${color};">${html}</p>`;

/**
 * One email, Studio's emailShell: the brand's edge along the top, the logo
 * alone in the band (Coach's mark where Studio has its own), the title,
 * the body and the footer lines (the last fainter), then Trainability signed
 * under the card in its hexagon and wordmark with the copyright under it.
 */
export function emailShell({ name = "Trainability Coach", title, body, footer = [], origin }) {
  const site = siteOf(origin);
  const header = site
    ? `<img src="${esc(`${site}/coach-mark.png`)}" width="64" alt="${esc(name)}" style="display:block;margin:0 auto;width:64px;max-width:64px;height:auto;">`
    : `<div style="font-size:17px;font-weight:600;color:${MAIL.ink};line-height:1.25;">${esc(name)}</div>`;
  const year = new Date().getFullYear();
  const signature = `
  <div style="max-width:560px;margin:18px auto 0;text-align:center;">
    ${site
      ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 4px;border-collapse:collapse;"><tr>`
        + `<td style="padding:0 6px 0 0;vertical-align:middle;"><img src="${esc(`${site}/trainability-logo.png`)}" width="18" height="18" alt="" style="display:block;"></td>`
        + `<td style="vertical-align:middle;"><img src="${esc(`${site}/trainability-wordmark.png`)}" width="126" height="12" alt="${esc(SIGNER)}" style="display:block;"></td>`
        + `</tr></table>`
      : `<div style="font-size:14px;font-weight:600;color:${MAIL.inkSoft};line-height:1.4;">${esc(SIGNER)}</div>`}
    <div style="font-size:11px;color:${MAIL.faint};line-height:1.5;margin-top:2px;">&copy; ${year} ${esc(SIGNER)}. All rights reserved.</div>
  </div>`;
  const footerRows = footer.filter(Boolean).map((line, i, all) => {
    const last = i === all.length - 1;
    return `<p style="margin:0 0 ${last ? 0 : 6}px;font-size:${last ? 11 : 12}px;line-height:1.5;color:${last ? MAIL.faint : MAIL.inkSoft};">${String(line).replace(/&(?!#?\w+;)/g, "&amp;")}</p>`;
  }).join("");
  /* color-scheme:light, as Studio's: Apple Mail and Outlook would otherwise
     invert the light card into their dark mode. */
  return `
<div style="margin:0;padding:24px;background:${MAIL.paper};color-scheme:light;font-family:${FONT};">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:${MAIL.card};border:1px solid ${MAIL.line};border-radius:14px;overflow:hidden;">
    <tr><td height="4" bgcolor="${MAIL.fill}" style="height:4px;line-height:4px;font-size:0;background:${MAIL.fill};background-image:linear-gradient(90deg,${MAIL.fill},${MAIL.edge});">&nbsp;</td></tr>
    <tr><td align="center" bgcolor="${MAIL.band}" style="padding:26px 26px 22px;text-align:center;background:${MAIL.band};background-image:linear-gradient(180deg,${MAIL.bandTop},${MAIL.band});border-bottom:1px solid ${MAIL.rule};">${header}
    </td></tr>
    <tr><td style="padding:26px 26px 8px;">
      ${title ? `<div style="font-size:22px;font-weight:600;color:${MAIL.ink};margin-bottom:18px;text-align:center;line-height:1.3;">${esc(title)}</div>` : ""}
      ${body}
    </td></tr>
    ${footerRows ? `<tr><td align="center" style="padding:16px 26px 22px;text-align:center;border-top:1px solid ${MAIL.rule};">${footerRows}</td></tr>` : ""}
  </table>${signature}
</div>`.trim();
}
