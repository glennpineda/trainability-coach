import express from "express";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Coach's server: the built page, and a relay to Studio for signing in.
 *
 * Coach keeps no accounts. Every Trainability account lives in Studio's
 * database, so the four sign-in routes below are passed through to Studio's
 * API as they are, and the same email and password work in both apps.
 *
 * Relayed rather than called from the browser, so Coach can run as its own
 * app on its own domain without Studio having to allow it cross-origin. The
 * session cookie Studio sets comes back through here and is stored by the
 * browser against Coach's own domain: a Coach sign-in is a real Studio
 * session, just held separately from the one in Studio's tab.
 */

const PORT = Number(process.env.PORT || 4800);
/* Studio's public address, e.g. https://trainabilitystudio.com. In development
   Studio's API runs on 4242 (`npm run server` in TrainabilityWeb3). */
const STUDIO_ORIGIN = (process.env.STUDIO_ORIGIN || "http://localhost:4242").replace(/\/+$/, "");
const SESSION_COOKIE = "ts_session";

const RELAYED = new Set(["/auth/login", "/auth/logout", "/auth/me", "/auth/forgot-password"]);

const app = express();
app.disable("x-powered-by");
/* One proxy in front on the host, so req.ip is the visitor rather than it. */
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0) || false);
app.use("/api", express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "coach", studio: STUDIO_ORIGIN }));

/* Only Studio's session cookie is passed on, never anything else the browser
   holds for Coach's domain. */
function studioCookie(header = "") {
  const hit = header.split(";").map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`));
  return hit || "";
}

app.all(/^\/api\/.*/, async (req, res) => {
  const route = req.path.replace(/^\/api/, "");
  if (!RELAYED.has(route)) return res.status(404).json({ error: "Not found", code: "not_found" });
  try {
    const cookie = studioCookie(req.headers.cookie);
    const upstream = await fetch(`${STUDIO_ORIGIN}/api${route}`, {
      method: req.method,
      headers: {
        ...(req.method === "GET" ? {} : { "Content-Type": "application/json" }),
        ...(cookie ? { Cookie: cookie } : {}),
        "User-Agent": req.headers["user-agent"] || "Trainability Coach",
        "X-Forwarded-For": req.ip,
      },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body ?? {}),
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    /* Studio's Set-Cookie, kept host-only: no Domain attribute is ever passed
       through, so the cookie belongs to Coach's domain alone. */
    for (const c of upstream.headers.getSetCookie?.() || []) {
      if (c.startsWith(`${SESSION_COOKIE}=`)) res.append("Set-Cookie", c.replace(/;\s*Domain=[^;]*/i, ""));
    }
    const retry = upstream.headers.get("retry-after");
    if (retry) res.set("Retry-After", retry);
    res.status(upstream.status).type("application/json").send(await upstream.text());
  } catch (err) {
    console.error(`Studio relay failed for ${req.method} ${route}: ${err.message}`);
    res.status(502).json({ error: "Couldn't reach Trainability. Try again in a minute.", code: "studio_unreachable" });
  }
});

/* The built page, on hosts that run this one process (GoDaddy Airo). The
   fallback refuses /api so an unknown endpoint stays a JSON 404. */
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
} else {
  console.warn(`No dist/ at ${DIST} — serving the API relay only. Run "npm run build" to serve the page too.`);
}

app.listen(PORT, () => console.log(`Coach on http://localhost:${PORT}, signing in through ${STUDIO_ORIGIN}`));
