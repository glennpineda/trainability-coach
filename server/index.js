import express from "express";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as billy from "./billy.js";
import * as db from "./db.js";
import * as equipment from "./equipment.js";

/**
 * Coach's server: the built page, and a relay to Studio for signing in and
 * for the signed-in trainer's clients.
 *
 * Coach keeps no accounts and no clients. Every Trainability account lives in
 * Studio's database, so the four sign-in routes below are passed through to
 * Studio's API as they are, and the same email and password work in both
 * apps. The client list is read from Studio too (/api/clients below).
 *
 * Relayed rather than called from the browser, so Coach can run as its own
 * app on its own domain without Studio having to allow it cross-origin. The
 * session cookie Studio sets comes back through here and is stored by the
 * browser against Coach's own domain: a Coach sign-in is a real Studio
 * session, just held separately from the one in Studio's tab.
 */

/* server/.env, for local runs — the same place Studio keeps its own. Built
   into Node, read by this file's location rather than the working directory,
   and it never overrides a variable the host has already set, so Airo's
   settings win. */
try { process.loadEnvFile(path.join(path.dirname(fileURLToPath(import.meta.url)), ".env")); } catch { /* no server/.env: the host's environment only */ }

const PORT = Number(process.env.PORT || 4800);
/* Studio's public address, e.g. https://trainabilitystudio.com. In development
   Studio's API runs on 4242 (`npm run server` in TrainabilityWeb3). */
const STUDIO_ORIGIN = (process.env.STUDIO_ORIGIN || "http://localhost:4242").replace(/\/+$/, "");
const SESSION_COOKIE = "ts_session";

/* Which version this is, from the same package.json the page is built from,
   so the page and its host cannot disagree. Never a reason not to start. */
const PKG = (() => { try { return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")); } catch { return {}; } })();

const RELAYED = new Set(["/auth/login", "/auth/logout", "/auth/me", "/auth/forgot-password"]);

const app = express();
app.disable("x-powered-by");
/* One proxy in front on the host, so req.ip is the visitor rather than it. */
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0) || false);
/* Billy's questions carry a photo or a PDF, base64 inside the JSON, so his
   route takes up to 32 MB (Claude's own limit for one request); everything
   else stays small. The first parser to read a body marks it read, so the
   small one leaves his alone. */
app.use("/api/assistant", express.json({ limit: "32mb" }));
app.use("/api", express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "coach", version: PKG.version || "unknown", ...(PKG.codename ? { codename: PKG.codename } : {}), node: process.versions.node, studio: STUDIO_ORIGIN, database: db.dialect() }));

/* Only Studio's session cookie is passed on, never anything else the browser
   holds for Coach's domain. */
function studioCookie(header = "") {
  const hit = header.split(";").map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`));
  return hit || "";
}

/* One request to Studio's API, carrying only Studio's session cookie and the
   visitor's address. */
function studio(req, route, { method = "GET", body } = {}) {
  const cookie = studioCookie(req.headers.cookie);
  return fetch(`${STUDIO_ORIGIN}/api${route}`, {
    method,
    headers: {
      ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      ...(cookie ? { Cookie: cookie } : {}),
      "User-Agent": req.headers["user-agent"] || "Trainability Coach",
      "X-Forwarded-For": req.ip,
    },
    body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
}

const unreachable = (res, what, err) => {
  console.error(`Studio relay failed for ${what}: ${err.message}`);
  res.status(502).json({ error: "Couldn't reach Trainability. Try again in a minute.", code: "studio_unreachable" });
};

/**
 * The signed-in trainer's own clients, read from Studio each time it is asked.
 *
 * Coach keeps no copy, so there is nothing to fall out of step: a client added
 * or archived in Studio shows here on the next load. Studio's /api/clients
 * already limits the list to what this account may see; a master or admin is
 * also sent the clients of everybody they manage, so the list is cut here to
 * the people on this account's own list. And only what Coach shows goes to the
 * browser: no card, notes, address or message settings.
 */
/* Studio's answer when it was not a yes, kept to be passed on as it is. */
class StudioRefused extends Error {
  constructor(status, body) { super(`Studio answered ${status}`); this.status = status; this.body = body; }
}

/* Who is signed in, asked of Studio with this request's session. */
async function signedIn(req) {
  const r = await studio(req, "/auth/me");
  if (!r.ok) throw new StudioRefused(r.status, await r.text());
  return (await r.json()).user;
}

/**
 * The signed-in trainer's own clients, read from Studio each time it is asked.
 *
 * Coach keeps no copy, so there is nothing to fall out of step: a client added
 * or archived in Studio shows here on the next load. Studio's /api/clients
 * already limits the list to what this account may see; a master or admin is
 * also sent the clients of everybody they manage, so the list is cut here to
 * the people on this account's own list. And only what Coach shows goes on:
 * no card, notes, address or message settings, to the browser or to Billy.
 */
async function myClients(req, user) {
  const r = await studio(req, "/clients");
  if (!r.ok) throw new StudioRefused(r.status, await r.text());
  const { clients = [] } = await r.json();
  return clients
    .filter(c => !c.bookingOnly && !c.deskOnly && (c.trainerIds || []).includes(user.id))
    .map(c => ({
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      pronouns: c.pronouns || "",
      dateOfBirth: c.dateOfBirth || "",
      /* The day they joined this trainer's list, not the day the record
         was made: somebody handed on from a colleague is new here. */
      since: c.linkedAt?.[user.id] || c.createdAt || "",
      lastSessionOn: c.lastSessionOn || null,
      latestSessionOn: c.latestSessionOn || null,
      archived: (c.archivedBy || []).includes(user.id),
      /* Other trainers they are still training with. */
      sharedWith: (c.trainerIds || []).filter(t => t !== user.id && !(c.archivedBy || []).includes(t)).length,
    }));
}

app.get("/api/clients", async (req, res) => {
  try {
    const clients = await myClients(req, await signedIn(req));
    res.set("Cache-Control", "private, no-store");
    res.json({ clients });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, "GET /clients", err);
  }
});

/* The trainer's equipment, the first part of their personal memory
   (server/equipment.js). Each person's own: the trainer is whoever Studio
   says is signed in, never an id the browser sends. */
const asSignedIn = (what, fn) => async (req, res) => {
  try {
    await fn(req, res, await signedIn(req));
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    if (err?.code === "studio_unreachable" || err?.name === "TypeError" || err?.name === "TimeoutError") return unreachable(res, what, err);
    console.error(`${what} failed: ${err.message}`);
    res.status(500).json({ error: "That didn't save. Try again in a minute.", code: "failed" });
  }
};

app.get("/api/equipment", asSignedIn("GET /equipment", async (_req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await equipment.equipmentOf(user.id));
}));

app.put("/api/equipment/categories/:key", asSignedIn("PUT /equipment/categories", async (req, res, user) => {
  const has = req.body?.has;
  if (!equipment.isCategory(req.params.key)) return res.status(404).json({ error: "Not found", code: "not_found" });
  if (has !== true && has !== false && has !== null) return res.status(400).json({ error: "Say yes, no, or not answered.", code: "invalid" });
  await equipment.setCategory(user.id, req.params.key, has);
  res.json(await equipment.equipmentOf(user.id));
}));

app.post("/api/equipment/items", asSignedIn("POST /equipment/items", async (req, res, user) => {
  const wrong = equipment.checkItem(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.setItem(user.id, req.body);
  res.json(await equipment.equipmentOf(user.id));
}));

app.delete("/api/equipment/items/:id", asSignedIn("DELETE /equipment/items", async (req, res, user) => {
  await equipment.removeItem(user.id, req.params.id);
  res.json(await equipment.equipmentOf(user.id));
}));

/* Whether Billy is here at all, so the header can leave his button out. Asked
   by somebody signed in, like every other question about Coach's setup. */
app.get("/api/assistant", async (req, res) => {
  try {
    await signedIn(req);
    res.set("Cache-Control", "private, no-store");
    res.json({ available: billy.configured(), model: billy.configured() ? billy.model() : null });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, "GET /assistant", err);
  }
});

/**
 * One question to Billy, as whoever is signed in (server/billy.js). The
 * conversation is the browser's to keep and comes whole each time; nothing of
 * it is stored here.
 */
app.post("/api/assistant", async (req, res) => {
  let user;
  try {
    user = await signedIn(req);
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    return unreachable(res, "POST /assistant", err);
  }
  if (!billy.configured()) {
    return res.status(503).json({ error: "Billy isn't set up on this server yet.", code: "not_configured" });
  }
  const history = req.body?.messages;
  const wrong = billy.checkHistory(history);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  try {
    const out = await billy.answer(user, history, {
      my_clients: async () => ({ clients: await myClients(req, user) }),
      my_equipment: async () => equipment.equipmentOf(user.id),
      /* Only what the trainer has just told him (Glenn, 16 Oct 2026: "Yes"),
         marked as Billy's, on view on their equipment page to correct. */
      remember_equipment: async (input) => {
        if (input?.kind === "category") {
          if (!equipment.isCategory(input.category)) return { error: "That isn't one of the checklist's kinds of equipment." };
          await equipment.setCategory(user.id, input.category, !!input.has, "billy");
        } else {
          const piece = { name: input?.name, category: input?.category, has: input?.has, where: input?.where || "" };
          const wrong = equipment.checkItem(piece);
          if (wrong) return { error: wrong };
          await equipment.setItem(user.id, piece, "billy");
        }
        return { saved: true };
      },
    });
    res.set("Cache-Control", "private, no-store");
    res.json({ reply: out.reply, messages: out.messages, model: out.model, usage: out.usage });
  } catch (err) {
    console.error(`Billy failed: ${err.status || ""} ${err.message}`);
    /* A refused key is the server's problem, not the trainer's: said so, in
       words they can pass on. */
    const status = err.status === 401 || err.status === 403 ? 503 : err.status === 413 ? 413 : err.status === 429 ? 429 : 502;
    res.status(status).json({
      error: status === 503 ? "Billy isn't working right now: this server's key for him was refused. Tell whoever runs the app."
        : status === 413 ? "That file is too big for Billy. Try a smaller photo or a shorter PDF."
        : status === 429 ? "Billy is getting a lot of questions just now. Try again in a minute."
        : "Billy couldn't answer just now. Try again in a minute.",
      code: "assistant_failed",
    });
  }
});

app.all(/^\/api\/.*/, async (req, res) => {
  const route = req.path.replace(/^\/api/, "");
  if (!RELAYED.has(route)) return res.status(404).json({ error: "Not found", code: "not_found" });
  try {
    const upstream = await studio(req, route, { method: req.method, body: req.body });
    /* Studio's Set-Cookie, kept host-only: no Domain attribute is ever passed
       through, so the cookie belongs to Coach's domain alone. */
    for (const c of upstream.headers.getSetCookie?.() || []) {
      if (c.startsWith(`${SESSION_COOKIE}=`)) res.append("Set-Cookie", c.replace(/;\s*Domain=[^;]*/i, ""));
    }
    const retry = upstream.headers.get("retry-after");
    if (retry) res.set("Retry-After", retry);
    res.status(upstream.status).type("application/json").send(await upstream.text());
  } catch (err) {
    unreachable(res, `${req.method} ${route}`, err);
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

/* The database's tables first: a request that arrived before them would find
   none. A database that cannot be reached is said in the log, and the app
   still starts, so sign-in and the Clients tab keep working. */
try {
  await db.migrate();
  console.log(`Database: ${db.describe()}`);
} catch (err) {
  console.error(`Database not ready (${db.describe()}): ${err.message}`);
}
app.listen(PORT, () => console.log(`Coach on http://localhost:${PORT}, signing in through ${STUDIO_ORIGIN}`));
