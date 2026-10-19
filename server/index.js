import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as billy from "./billy.js";
import * as db from "./db.js";
import * as equipment from "./equipment.js";
import * as limitations from "./limitations.js";
import * as library from "./library.js";
import * as reviews from "./reviews.js";
import * as store from "./iq-store.js";
import * as edit from "./iq-edit.js";
import * as principles from "./principles.js";
import * as books from "./books.js";
import * as trainerSettings from "./trainer-settings.js";
import * as programs from "./programs.js";
import * as accounts from "./accounts.js";
import * as coachClients from "./coach-clients.js";
import * as today from "./today.js";
import * as messages from "./messages.js";
import * as push from "./push.js";
import * as measurements from "./measurements.js";
import * as fitnessTests from "./fitness-tests.js";
import { previousOf } from "../src/lib/measures.js";
import { seriesOf } from "../src/lib/fitness-tests.js";
import { newId } from "./ids.js";
import { chooseStorage, refreshStorage, storageState } from "./durable-home.js";
import { FLAGS, JOINTS } from "./coach-iq.js";

/**
 * Coach's server: the built page, and a relay to Studio for signing in and
 * for the signed-in trainer's clients.
 *
 * Coach keeps no accounts and no clients. Every Trainability account lives in
 * Studio's database, so the five sign-in routes below are passed through to
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

/* The sign-in routes Studio answers for Coach. /auth/door is the one sign-in
   screen's first question, which way in an email takes (Glenn, 17 Oct 2026);
   /auth/password is choosing one's own after a temporary one (build 1.0.52). */
const RELAYED = new Set(["/auth/door", "/auth/login", "/auth/logout", "/auth/me", "/auth/forgot-password", "/auth/password",
  /* Accessibility, shared with Studio (Glenn, 18 Oct 2026: "Shared with
     Studio"): a Trainability trainer's six are saved on their Studio account,
     so both apps look the same. A Coach account's are answered here first. */
  "/auth/theme", "/auth/tone", "/auth/contrast", "/auth/motion", "/auth/color", "/auth/text-size"]);

const app = express();
app.disable("x-powered-by");
/* One proxy in front on the host, so req.ip is the visitor rather than it. */
app.set("trust proxy", Number(process.env.TRUST_PROXY || 0) || false);
/* Billy's questions carry a photo or a PDF, base64 inside the JSON, so his
   route takes up to 32 MB (Claude's own limit for one request); everything
   else stays small. The first parser to read a body marks it read, so the
   small one leaves his alone. */
app.use("/api/assistant", express.json({ limit: "32mb" }));
/* A video's still, taken in the browser, comes with the end of its upload. */
app.use("/api/attachments", express.json({ limit: "1mb" }));
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

/* A cookie of the browser's, by name. */
function cookieOf(req, name) {
  const hit = String(req.headers.cookie || "").split(";").map(s => s.trim()).find(s => s.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : "";
}

/* The Coach account signed in on this request (accounts.js), or null. */
async function coachAccount(req) {
  const token = cookieOf(req, accounts.COOKIE);
  return token ? accounts.accountOfSession(token) : null;
}

/* Who is signed in: a Coach account (its own session cookie, checked here),
   else whoever Studio says, asked with this request's Studio session. */
async function signedIn(req) {
  const own = await coachAccount(req);
  if (own) return accounts.asUser(own);
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
  /* A Coach account's clients are kept in Coach (coach-clients.js), in the
     same shape. */
  if (user?.coachAccount) return coachClients.clientsOf(user.id);
  const r = await studio(req, "/clients");
  if (!r.ok) throw new StudioRefused(r.status, await r.text());
  const { clients = [] } = await r.json();
  /* A linked Coach account's clients not yet moved into Studio (stage
     three) are still theirs, kept here: listed with the rest. */
  const kept = await coachClients.clientsOf(user.id);
  return [...studioShape(clients, user), ...kept].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
}

/* Studio's clients, cut to this account's own list and to what Coach shows. */
function studioShape(clients, user) {
  return clients
    .filter(c => !c.bookingOnly && !c.deskOnly && (c.trainerIds || []).includes(user.id))
    .map(c => ({
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      pronouns: c.pronouns || "",
      gender: c.gender || "",
      dateOfBirth: c.dateOfBirth || "",
      /* The day they joined this trainer's list, not the day the record
         was made: somebody handed on from a colleague is new here. */
      since: c.linkedAt?.[user.id] || c.createdAt || "",
      lastSessionOn: c.lastSessionOn || null,
      latestSessionOn: c.latestSessionOn || null,
      /* Studio's link to their photo (/api/photos/client/<id>?v=…), which
         Coach answers by asking Studio (the photo route below). */
      photoUrl: c.photoUrl || null,
      archived: (c.archivedBy || []).includes(user.id),
      /* Their gym in Studio: their home gym, else a membership still going
         (Studio's homePlaceId and placeIds), for where a program is done. */
      studioPlaceId: c.homePlaceId || (c.placeIds || []).find(p => !(c.archivedPlaceIds || []).includes(p)) || null,
      /* Other trainers they are still training with. */
      sharedWith: (c.trainerIds || []).filter(t => t !== user.id && !(c.archivedBy || []).includes(t)).length,
    }));
}

app.get("/api/clients", async (req, res) => {
  try {
    const user = await signedIn(req);
    const clients = await myClients(req, user);
    res.set("Cache-Control", "private, no-store");
    /* toMove: how many are a linked Coach account's, still kept here, for
       the Clients page to offer moving them into Studio. */
    res.json({ clients, ...(user.coachAccount ? {} : { toMove: (await coachClients.rowsOf(user.id)).length }) });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, "GET /clients", err);
  }
});

/* A client added in Studio, the way Studio's Add client does it (see POST
   /api/clients): { done, clientId }, or { status, refused } with Studio's
   words. Studio's own refusals are thrown as StudioRefused. */
async function studioAdd(req, user, f) {
  const ask = async (route, body) => {
    const r = await studio(req, route, { method: "POST", body });
    if (!r.ok) throw new StudioRefused(r.status, await r.text());
    return r.json();
  };
  /* Studio's four, asked first in its words, so a half-filled form isn't
     matched on what little it has. */
  const missing = [["firstName", "First name"], ["lastName", "Last name"], ["email", "Email"], ["phone", "Phone"]].filter(([k]) => !f[k]).map(([, l]) => l);
  if (missing.length) {
    const list = missing.length < 2 ? missing[0] : `${missing.slice(0, -1).join(", ")} and ${missing.at(-1)}`;
    return { status: 400, refused: { error: `${list} ${missing.length === 1 ? "is" : "are"} required`, code: "missing_fields", fields: missing } };
  }
  let done, clientId;
  const { match } = await ask("/clients/match", { email: f.email, phone: f.phone });
  /* Linked on its own only when the email is the same: a phone alone is
     often a family's or twins', and linking the wrong person would show
     this trainer somebody else's record. */
  const sameEmail = !!match?.email && match.email.toLowerCase() === f.email.toLowerCase();
  if (match?.id && !sameEmail) {
    return { status: 409, refused: { code: "phone_taken", name: `${match.firstName || ""} ${match.lastName || ""}`.trim(),
      error: `${`${match.firstName || ""} ${match.lastName || ""}`.trim() || "Another client"} already has that phone number. If this is them, use the email they gave us; if it's someone else, use a different phone number.` } };
  }
  if (match?.id) {
    const mine = (match.trainerIds || []).includes(user.id);
    const archivedHere = (match.archivedBy || []).includes(user.id);
    if (mine && !archivedHere) {
      done = "already";
    } else {
      await ask(`/clients/${encodeURIComponent(match.id)}/link`, { trainerId: user.id, email: f.email, phone: f.phone });
      done = mine ? "back" : "linked";
    }
    clientId = match.id;
  } else {
    const before = new Set((await myClients(req, user)).map(c => c.id));
    await ask("/clients", f);
    clientId = (await myClients(req, user)).find(c => !before.has(c.id))?.id || null;
    done = "added";
  }
  return { done, clientId };
}

/*
 * A new client, added from Coach and kept in Studio (Glenn, 18 Oct 2026:
 * "The Coach trainer should be able to add new clients from Coach … I'm ok
 * saving the clients on Studio's db"). Coach keeps no copy: Studio's own
 * routes, with the trainer's own session, the way Studio's Add client does
 * it. First /clients/match by email and phone; somebody Studio already has is
 * put on this trainer's list (/clients/:id/link, which also brings back one
 * they had archived) rather than made twice (Glenn: "Link automatically"),
 * when it is the same email; a phone alone is put to the trainer,
 * and anybody else is made (/clients) on this trainer's list. Studio's checks
 * (the four things a client must have, a complete email, a phone it can
 * text) and its refusals come back as they are. The answer is the trainer's
 * list again, with which client it was and what happened.
 */
app.post("/api/clients", async (req, res) => {
  try {
    const user = await signedIn(req);
    const b = req.body || {};
    /* A Coach account's client is kept in Coach (coach-clients.js). */
    if (user.coachAccount) {
      const out = await coachClients.addClient(user.id, clientFields(b));
      if (out.error) return res.status(out.code === "phone_taken" ? 409 : 400).json(out);
      res.set("Cache-Control", "private, no-store");
      return res.json({ ...out, clients: await myClients(req, user) });
    }
    const f = {
      firstName: String(b.firstName || "").trim().slice(0, 90), lastName: String(b.lastName || "").trim().slice(0, 90),
      email: String(b.email || "").trim().slice(0, 190), phone: String(b.phone || "").trim().slice(0, 40),
      ...(b.dateOfBirth ? { dateOfBirth: String(b.dateOfBirth).slice(0, 10) } : {}),
      ...(b.gender ? { gender: String(b.gender).trim().slice(0, 40) } : {}),
      ...(b.pronouns ? { pronouns: String(b.pronouns).trim().toLowerCase().slice(0, 30) } : {}),
    };
    const out = await studioAdd(req, user, f);
    if (out.refused) return res.status(out.status).json(out.refused);
    const { done, clientId } = out;
    res.set("Cache-Control", "private, no-store");
    res.json({ done, clientId, clients: await myClients(req, user) });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, "POST /clients", err);
  }
});

/* A client's details changed, or the client archived or put back, from
   Coach: Studio's own PATCH /clients/:id and POST /clients/:id/archive with
   the trainer's session, so Studio's rules hold (Glenn, 18 Oct 2026: "for the
   Coach user, this is seemless and they don't need to know where it's
   stored"). Only a client on this trainer's own list; the answer is the list
   again. */
const clientFields = (b = {}) => {
  const f = {};
  for (const [k, max] of [["firstName", 90], ["lastName", 90], ["email", 190], ["phone", 40], ["gender", 40], ["pronouns", 30]]) {
    if (b[k] !== undefined) f[k] = String(b[k] ?? "").trim().slice(0, max);
  }
  if (f.pronouns) f.pronouns = f.pronouns.toLowerCase();
  if (b.dateOfBirth !== undefined) f.dateOfBirth = b.dateOfBirth ? String(b.dateOfBirth).slice(0, 10) : null;
  return f;
};
async function onClient(req, res, what, send, own) {
  try {
    const user = await signedIn(req);
    if (!(await myClients(req, user)).some(c => c.id === req.params.id)) return res.status(404).json({ error: "Not found", code: "not_found" });
    /* A client kept in Coach (a Coach account's, or a linked one's not yet
       moved) is changed in Coach (coach-clients.js). */
    if (user.coachAccount || await coachClients.isKept(user.id, req.params.id)) {
      const wrong = await own(user);
      if (wrong) return res.status(wrong.code === "duplicate_client" ? 409 : 400).json(wrong);
    } else {
      const r = await send(user);
      if (!r.ok) throw new StudioRefused(r.status, await r.text());
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ clientId: req.params.id, clients: await myClients(req, user) });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, what, err);
  }
}
app.patch("/api/clients/:id", (req, res) => onClient(req, res, "PATCH /clients",
  () => studio(req, `/clients/${encodeURIComponent(req.params.id)}`, { method: "PATCH", body: clientFields(req.body) }),
  (user) => coachClients.editClient(user.id, req.params.id, clientFields(req.body))));
app.post("/api/clients/:id/archive", (req, res) => onClient(req, res, "POST /clients/archive",
  (user) => studio(req, `/clients/${encodeURIComponent(req.params.id)}/archive`, { method: "POST", body: { trainerId: user.id, archived: req.body?.archived !== false } }),
  (user) => coachClients.archiveClient(user.id, req.params.id, req.body?.archived !== false).then(() => null)));

/*
 * A linked Coach account's clients, still kept here, moved into Studio (stage
 * three), only when the trainer says so: the business can see Studio's
 * clients (Glenn, 18 Oct 2026: "someone that creates an account on Coach
 * doesn't necessarily have to be part of the business on Studio"). Each goes
 * through Studio's own add steps (studioAdd: somebody Studio has by the same
 * email is put on the list, not made twice), one archived here is archived
 * there too, and their programs and limitations follow them to Studio's id.
 * One Studio won't take (the same phone as another client, or refused) stays
 * here and is named, with why.
 */
app.post("/api/clients/move", async (req, res) => {
  try {
    const user = await signedIn(req);
    if (user.coachAccount) return res.status(400).json({ error: "Link your Trainability account first.", code: "not_linked" });
    let moved = 0;
    const kept = [];
    for (const r of await coachClients.rowsOf(user.id)) {
      const name = `${r.first_name} ${r.last_name}`.trim();
      const f = { firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone,
        ...(r.date_of_birth ? { dateOfBirth: r.date_of_birth } : {}), ...(r.gender ? { gender: r.gender } : {}), ...(r.pronouns ? { pronouns: r.pronouns } : {}) };
      try {
        const out = await studioAdd(req, user, f);
        if (out.refused) { kept.push({ name, why: out.refused.error }); continue; }
        if (!out.clientId) { kept.push({ name, why: "Trainability didn't say which client it was." }); continue; }
        if (Number(r.archived)) {
          await studio(req, `/clients/${encodeURIComponent(out.clientId)}/archive`, { method: "POST", body: { trainerId: user.id, archived: true } });
        }
        await coachClients.moved(user.id, r.id, out.clientId, name);
        moved++;
      } catch (err) {
        if (!(err instanceof StudioRefused)) throw err;
        let why = "Trainability didn't take them.";
        try { why = JSON.parse(err.body).error || why; } catch { /* not JSON */ }
        kept.push({ name, why });
      }
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ moved, kept, clients: await myClients(req, user), toMove: (await coachClients.rowsOf(user.id)).length });
  } catch (err) {
    if (err instanceof StudioRefused) return res.status(err.status).type("application/json").send(err.body);
    unreachable(res, "POST /clients/move", err);
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

/* The signed-in trainer's own settings (trainer-settings.js): their units. */
app.get("/api/my-settings", asSignedIn("GET /my-settings", async (_req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await trainerSettings.settingsOf(user.id));
}));

app.put("/api/my-settings", asSignedIn("PUT /my-settings", async (req, res, user) => {
  if (req.body?.units !== undefined && !await trainerSettings.setUnits(user.id, req.body.units)) {
    return res.status(400).json({ error: "Choose imperial or metric.", code: "invalid" });
  }
  res.json(await trainerSettings.settingsOf(user.id));
}));

/*
 * Studio's places, as places of the trainer's here (Glenn, 18 Oct 2026: "if
 * the trainer is connected to a place in Studio, let's get that information
 * from Studio as well", then "make sure all the places within that business
 * … syncs with the trainer here as well"). /locations, which any signed-in
 * account may read, lists them; `defaultPlaceId` on /auth/me is the
 * trainer's own. Asked at most every ten minutes per trainer (`force` asks
 * now); if Studio can't be reached the places stay as they were.
 */
const studioPlaceAsked = new Map();
async function syncStudioPlace(req, user, { force = false } = {}) {
  if (user?.coachAccount) return;
  if (!force && Date.now() - (studioPlaceAsked.get(user.id) || 0) < 10 * 60 * 1000) return;
  try {
    const r = await studio(req, "/locations");
    if (!r.ok) return;
    const { places = [] } = await r.json();
    await equipment.syncStudioPlaces(user.id, places, user.defaultPlaceId || null);
    studioPlaceAsked.set(user.id, Date.now());
  } catch (err) {
    console.warn("Studio's places couldn't be read:", err.message);
  }
}

const isPrimaryMaster = (user) => !!(user?.isPrimary && user?.role === "master");

/* A trainer's equipment and, for the Primary Master, every place in Studio
   with what is set there for everybody (`everyone`; null if Studio's places
   couldn't be read). */
async function equipmentFor(req, user) {
  const out = await equipment.equipmentOf(user.id);
  if (!isPrimaryMaster(user)) return out;
  try {
    const r = await studio(req, "/locations");
    if (!r.ok) return { ...out, everyone: null };
    const { places = [] } = await r.json();
    return { ...out, everyone: await equipment.everyonesPlaces(places) };
  } catch (err) {
    console.warn("Studio's places couldn't be read:", err.message);
    return { ...out, everyone: null };
  }
}

/*
 * Today on Home (server/today.js): the trainer's own sessions today and over
 * the next 7 days, read from Studio's schedule each time, as Studio's Today
 * tab reads them. `date` is the browser's own today, so the day turns at the
 * trainer's midnight. A Coach account has no schedule: `schedule: false`.
 */
app.get("/api/today", asSignedIn("GET /today", async (req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  if (user.coachAccount) return res.json({ schedule: false });
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : new Date().toISOString().slice(0, 10);
  const ask = async (route) => {
    const r = await studio(req, route);
    if (!r.ok) throw new StudioRefused(r.status, await r.text());
    return r.json();
  };
  const [{ appointments = [] }, locations, clients, mine] = await Promise.all([
    ask("/appointments"), ask("/locations").catch(() => ({})), myClients(req, user), programs.list(user.id)]);
  const ids = [...new Set(appointments.filter(a => a.trainerId === user.id && a.clientId).map(a => a.clientId))];
  const limits = new Map();
  if (ids.length) {
    const rows = await db.all(`SELECT client_id, COUNT(*) AS n FROM coach_limitations WHERE client_id IN (${ids.map(() => "?").join(", ")}) GROUP BY client_id`, ids);
    for (const r of rows) limits.set(r.client_id, Number(r.n));
  }
  res.json({ schedule: true, ...today.todayOf({ today: date, trainerId: user.id, appointments, locations, clients, programs: mine, limits }) });
}));

/* ------------------------------------------------------------ notifications

   Studio's five calls (its /api/push), for the signed-in trainer's own
   devices (server/push.js). GET says whether there is anything to turn on:
   no key, or nothing this account can be told about, and the account menu
   shows nothing. */
const pushRoute = (what, fn) => asSignedIn(what, async (req, res, user) => {
  try { await fn(req, res, user); } catch (err) {
    if (err.status && err.code?.startsWith("push_")) return res.status(err.status).json({ error: err.message, code: err.code });
    throw err;
  }
});
app.get("/api/push", pushRoute("GET /push", async (_req, res, user) => {
  const kinds = push.kindChoices(user);
  res.set("Cache-Control", "private, no-store");
  res.json({ publicKey: kinds.length ? push.publicKey() : null, kinds });
}));
app.post("/api/push/lookup", pushRoute("POST /push/lookup", async (req, res, user) => res.json(await push.lookup(user, req.body?.endpoint))));
app.put("/api/push", pushRoute("PUT /push", async (req, res, user) =>
  res.json(await push.subscribe(user, { subscription: req.body?.subscription, kinds: req.body?.kinds, userAgent: req.get("user-agent") }))));
app.post("/api/push/off", pushRoute("POST /push/off", async (req, res, user) => res.json(await push.unsubscribe(user, req.body?.endpoint))));
app.post("/api/push/test", pushRoute("POST /push/test", async (req, res, user) => res.json(await push.pushTest(user, req.body?.endpoint))));

/* ------------------------------------------------------------ messages */

/*
 * Messages (server/messages.js; Glenn, 18 Oct 2026). The trainer's side is
 * here, with their own session; the client's is Studio's client page, which
 * asks through the client link below. Only a client kept in Trainability can
 * be written to: the client page is where they read it, and a client kept in
 * Coach has none.
 */
const STUDIO_PUBLIC = (process.env.STUDIO_PUBLIC_URL || STUDIO_ORIGIN).replace(/\/+$/, "");
const studioClientsOf = async (req, user) => {
  if (user.coachAccount) return [];
  const kept = new Set((await coachClients.rowsOf(user.id)).map(r => r.id));
  return (await myClients(req, user)).filter(c => !kept.has(c.id));
};
const sendFailure = (res, err) => res.status(err.status).json({ error: err.message, code: err.code });

app.get("/api/messages", asSignedIn("GET /messages", async (req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  if (user.coachAccount) return res.json({ available: false, conversations: [], unread: 0 });
  const clients = await studioClientsOf(req, user);
  const photos = new Map(clients.map(c => [c.id, c.photoUrl || null]));
  const conversations = (await messages.trainerConversations(user.id, new Set(photos.keys())))
    .map(c => ({ ...c, photoUrl: photos.get(c.clientId) || null }));
  res.json({ available: true, conversations, unread: conversations.reduce((n, c) => n + c.unread, 0) });
}));

/* One client's conversation, read now; `messages: []` before the first. */
app.get("/api/messages/:client", asSignedIn("GET /messages/client", async (req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  const client = (await studioClientsOf(req, user)).find(c => c.id === req.params.client);
  if (!client) return res.status(404).json({ error: "Not found", code: "not_found" });
  const thread = await messages.trainerThread(user.id, client.id);
  res.json({ client: { id: client.id, firstName: client.firstName, lastName: client.lastName, photoUrl: client.photoUrl || null }, ...(thread || { id: null, clientReadAt: null, messages: [] }) });
}));

app.post("/api/messages/:client", asSignedIn("POST /messages/client", async (req, res, user) => {
  const clients = await studioClientsOf(req, user);
  const client = clients.find(c => c.id === req.params.client);
  if (!client) {
    if (await coachClients.isKept(user.id, req.params.client)) {
      return res.status(409).json({ error: "Messages reach clients on Trainability's client page. Move this client into Trainability first, on the Clients page.", code: "not_in_trainability" });
    }
    return res.status(404).json({ error: "Not found", code: "not_found" });
  }
  const attachmentIds = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  const bad = messages.checkMessage({ text: req.body?.text, attachments: attachmentIds });
  if (bad) return res.status(400).json({ error: bad, code: "invalid" });
  try {
    const sent = await messages.sendFromTrainer(user, client, { text: req.body.text, attachmentIds });
    if (sent.notify) {
      /* Not waited for: the trainer's message is sent whether or not the email goes. */
      messages.notifyClient(sent.conversationId, {
        email: client.email, clientFirst: client.firstName, trainerName: user.name,
        inboxUrl: `${STUDIO_PUBLIC}/me#messages`, origin: process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`,
      }).catch(err => console.error(`Message notice failed: ${err.message}`));
    }
    res.json(await messages.trainerThread(user.id, client.id));
  } catch (err) {
    if (err.status) return sendFailure(res, err);
    throw err;
  }
}));

/* A picture or a video, sent in pieces as Studio's ad videos are, then kept
   waiting in the composer until the message goes. */
app.post("/api/attachments/begin", asSignedIn("POST /attachments/begin", async (req, res, user) => {
  if (user.coachAccount) return res.status(403).json({ error: "Not available", code: "forbidden" });
  try { res.json(await messages.beginUpload({ kind: req.body?.kind, bytes: req.body?.bytes })); } catch (err) { if (err.status) return sendFailure(res, err); throw err; }
}));
app.post("/api/attachments/:upload/chunk", express.raw({ type: "application/octet-stream", limit: "8mb" }), asSignedIn("POST /attachments/chunk", async (req, res) => {
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: "That piece arrived empty", code: "empty_chunk" });
  try { res.json(await messages.appendUpload(req.params.upload, req.body)); } catch (err) { if (err.status) return sendFailure(res, err); throw err; }
}));
app.post("/api/attachments/:upload/finish", asSignedIn("POST /attachments/finish", async (req, res, user) => {
  try { res.json(await messages.finishUpload(req.params.upload, user.id, req.body || {})); } catch (err) { if (err.status) return sendFailure(res, err); throw err; }
}));
/* A program of theirs for this client, kept as a copy to attach. */
app.post("/api/attachments/program", asSignedIn("POST /attachments/program", async (req, res, user) => {
  const program = await programs.programOf(user.id, String(req.body?.programId || ""));
  if (!program) return res.status(404).json({ error: "That program isn't one of yours.", code: "not_found" });
  const full = await programs.full(user.id, program, { withCheck: false });
  res.json(await messages.programAttachment(user.id, full, await trainerSettings.unitsOf(user.id)));
}));

/* A set of a client's measurements, kept as a copy to attach, with the one
   from the day before it was taken for the changes. */
app.post("/api/attachments/measurements", asSignedIn("POST /attachments/measurements", async (req, res, user) => {
  const row = await measurements.measurementById(String(req.body?.measurementId || ""));
  if (!row) return res.status(404).json({ error: "Those measurements are no longer there.", code: "not_found" });
  const client = (await myClients(req, user)).find(c => c.id === row.client_id);
  if (!client) return res.status(404).json({ error: "Those measurements are no longer there.", code: "not_found" });
  const list = await measurements.measurementsOf(row.client_id, user.id);
  const at = list.findIndex(m => m.id === row.id);
  res.json(await messages.measurementsAttachment(user.id, {
    set: list[at], previous: previousOf(list, list[at]), clientName: `${client.firstName} ${client.lastName}`.trim(),
    units: await trainerSettings.unitsOf(user.id),
  }));
}));

/* A fitness test result kept as a copy to attach, with the one of the same
   test (and exercise, jump or hold) from an earlier day for the change. */
app.post("/api/attachments/test", asSignedIn("POST /attachments/test", async (req, res, user) => {
  const row = await fitnessTests.testById(String(req.body?.testId || ""));
  const client = row && (await myClients(req, user)).find(c => c.id === row.client_id);
  if (!row || !client) return res.status(404).json({ error: "That test result is no longer there.", code: "not_found" });
  const all = await fitnessTests.testsOf(row.client_id, user.id);
  const test = all.find(t => t.id === row.id);
  const list = all.filter(t => seriesOf(t) === seriesOf(test));
  res.json(await messages.testAttachment(user.id, {
    test, previous: list.find(t => t.takenOn < test.takenOn) || null, clientName: `${client.firstName} ${client.lastName}`.trim(),
    units: await trainerSettings.unitsOf(user.id),
  }));
}));

/* An attachment for the trainer: its details (a program's copy in full), or its file. */
app.get("/api/attachments/:id", asSignedIn("GET /attachments", async (req, res, user) => {
  const a = await messages.attachmentFor(req.params.id, { trainerId: user.id });
  if (!a) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.set("Cache-Control", "private, no-store");
  res.json(messages.attachmentShape(a));
}));
const sendAttachmentFile = (res, a) => {
  if (a.kind !== "picture" && a.kind !== "video") return res.status(404).json({ error: "Not found", code: "not_found" });
  res.set("Content-Type", a.mime);
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Content-Disposition", "inline");
  /* sendFile answers the range requests a <video> makes as it plays. */
  res.sendFile(messages.attachmentPath(a.id), { headers: { "Cache-Control": "private, max-age=3600" } }, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Not found", code: "not_found" });
  });
};
app.get("/api/attachments/:id/file", asSignedIn("GET /attachments/file", async (req, res, user) => {
  const a = await messages.attachmentFor(req.params.id, { trainerId: user.id });
  if (!a) return res.status(404).json({ error: "Not found", code: "not_found" });
  sendAttachmentFile(res, a);
}));

/*
 * The client link: Studio's client page asking for a client's messages,
 * server to server. Studio has checked who the client is (their own sign-in
 * on its client page) and says so in `clientId`; the secret both apps hold
 * (`COACH_LINK_SECRET`) is what lets it. Without the secret set, it is off.
 * Pictures and videos come back as signed links good for an hour, so the
 * client's browser loads them from Coach without a Coach session.
 */
const LINK_SECRET = () => process.env.COACH_LINK_SECRET || "";
function linked(req, res) {
  const secret = LINK_SECRET();
  if (!secret) { res.status(503).json({ error: "The client link is not set up.", code: "not_configured" }); return null; }
  const given = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given), b = Buffer.from(secret);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.status(401).json({ error: "Not allowed", code: "not_allowed" }); return null; }
  const clientId = String(req.query.clientId || req.body?.clientId || "");
  if (!clientId) { res.status(400).json({ error: "Which client?", code: "invalid" }); return null; }
  res.set("Cache-Control", "private, no-store");
  return clientId;
}
const coachOrigin = (req) => process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
const forClient = (req, thread) => ({
  ...thread,
  messages: thread.messages.map(m => ({ ...m, attachments: m.attachments.map(a => (a.kind === "picture" || a.kind === "video")
    ? { ...a, url: messages.signedFileUrl(coachOrigin(req), a.id, LINK_SECRET()) } : a) })),
});
const linkRoute = (what, fn) => async (req, res) => {
  try { await fn(req, res); } catch (err) {
    console.error(`${what} failed: ${err.message}`);
    res.status(500).json({ error: "That didn't work. Try again in a minute.", code: "failed" });
  }
};

app.get("/api/client-link/conversations", linkRoute("client-link conversations", async (req, res) => {
  const clientId = linked(req, res);
  if (!clientId) return;
  res.json({ conversations: await messages.clientConversations(clientId) });
}));
app.get("/api/client-link/conversations/:id", linkRoute("client-link thread", async (req, res) => {
  const clientId = linked(req, res);
  if (!clientId) return;
  const c = await messages.conversationById(req.params.id);
  if (!c || c.client_id !== clientId) return res.status(404).json({ error: "Not found", code: "not_found" });
  const thread = await messages.clientThread(c);
  /* A program in full, for the client page to lay out like the printed one. */
  for (const m of thread.messages) {
    m.attachments = await Promise.all(m.attachments.map(async a => (a.kind === "program"
      ? messages.attachmentShape(await messages.attachmentFor(a.id, { clientId })) : a)));
  }
  res.json(forClient(req, thread));
}));
app.post("/api/client-link/conversations/:id/messages", linkRoute("client-link reply", async (req, res) => {
  const clientId = linked(req, res);
  if (!clientId) return;
  const c = await messages.conversationById(req.params.id);
  if (!c || c.client_id !== clientId) return res.status(404).json({ error: "Not found", code: "not_found" });
  const bad = messages.checkMessage({ text: req.body?.text });
  if (bad) return res.status(400).json({ error: bad === "Write a message or attach something." ? "Write a message." : bad, code: "invalid" });
  await messages.sendFromClient(c, { clientName: req.body?.clientName, text: req.body.text });
  /* Their trainer's devices told, if they asked (push.js, client_message):
     who, and the start of it. A tap opens the conversation. Not waited for. */
  const words = String(req.body.text).trim().replace(/\s+/g, " ");
  push.pushTo(c.trainer_id, "client_message", {
    title: String(req.body?.clientName || c.client_name || "A client"),
    body: words.length > 140 ? `${words.slice(0, 139)}…` : words,
    url: `/?open=messages&client=${encodeURIComponent(c.client_id)}`, tag: `msg-${c.id}`,
  }).catch(() => {});
  res.json(forClient(req, await messages.clientThread(c)));
}));
/* A file for the client's browser, by a signed link from the client link. */
app.get("/api/files/:id", linkRoute("signed file", async (req, res) => {
  if (!messages.checkSignature(req.params.id, req.query.exp, req.query.sig, LINK_SECRET())) return res.status(404).json({ error: "Not found", code: "not_found" });
  const a = await messages.sentAttachment(req.params.id);
  if (!a) return res.status(404).json({ error: "Not found", code: "not_found" });
  sendAttachmentFile(res, a);
}));

app.get("/api/equipment", asSignedIn("GET /equipment", async (req, res, user) => {
  await syncStudioPlace(req, user);
  res.set("Cache-Control", "private, no-store");
  res.json(await equipmentFor(req, user));
}));

/* A client's limitations (server/limitations.js): only for a client on the
   signed-in trainer's own list, which is the same as being one of their
   trainers; anyone else is told there is no such client. */
const ownClient = async (req, res, user, clientId) => {
  const mine = (await myClients(req, user)).some(c => c.id === clientId);
  if (!mine) res.status(404).json({ error: "Not found", code: "not_found" });
  return mine;
};

app.get("/api/coach-iq/conditions", asSignedIn("GET /coach-iq/conditions", async (_req, res) => {
  res.json({ conditions: limitations.conditionsList(), facts: FLAGS, joints: JOINTS });
}));

/* Where a client trains, from Studio: their gym there, read from Studio each
   time so a change there shows at once, as the trainer's place linked to it
   (with the equipment the Primary Master set for it), for a new program's
   form. null when Studio has none. */
app.get("/api/clients/:client/place", asSignedIn("GET /clients/place", async (req, res, user) => {
  const client = (await myClients(req, user)).find(c => c.id === req.params.client);
  if (!client) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.set("Cache-Control", "private, no-store");
  if (!client.studioPlaceId) return res.json({ place: null });
  await syncStudioPlace(req, user, { force: true });
  res.json({ place: await equipment.placeForStudio(user.id, client.studioPlaceId) });
}));

/* What the trainer's programs for a client say about their level, for a new
   program's form (programs.historyOf). */
app.get("/api/clients/:client/level", asSignedIn("GET /clients/level", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  res.set("Cache-Control", "private, no-store");
  const { level, why, programs: count, trend } = await programs.historyOf(user.id, req.params.client);
  res.json({ level, why: why || null, programs: count, trend });
}));

app.get("/api/clients/:client/limitations", asSignedIn("GET /clients/limitations", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  res.set("Cache-Control", "private, no-store");
  res.json({ limitations: await limitations.limitationsOf(req.params.client, user.id) });
}));

app.post("/api/clients/:client/limitations", asSignedIn("POST /clients/limitations", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  const wrong = limitations.checkLimitation(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await limitations.addLimitation(req.params.client, user, req.body);
  res.json({ limitations: await limitations.limitationsOf(req.params.client, user.id) });
}));

app.delete("/api/limitations/:id", asSignedIn("DELETE /limitations", async (req, res, user) => {
  const row = await limitations.clientOf(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found", code: "not_found" });
  if (!await ownClient(req, res, user, row.client_id)) return;
  const done = await limitations.deleteLimitation(req.params.id, user.id);
  if (done === "not_yours") return res.status(403).json({ error: "Only the trainer who wrote it can delete it.", code: "not_yours" });
  res.json({ limitations: await limitations.limitationsOf(row.client_id, user.id) });
}));

/* A client's measurements (server/measurements.js): as limitations, only
   for a client on the trainer's own list; seen by all their trainers,
   changed and deleted only by the one who took them. With the trainer's
   units, for the page to show and type them in. */
const measurementsAnswer = async (clientId, user) => ({
  measurements: await measurements.measurementsOf(clientId, user.id), units: await trainerSettings.unitsOf(user.id),
});
app.get("/api/clients/:client/measurements", asSignedIn("GET /clients/measurements", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  res.set("Cache-Control", "private, no-store");
  res.json(await measurementsAnswer(req.params.client, user));
}));
app.post("/api/clients/:client/measurements", asSignedIn("POST /clients/measurements", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  const checked = measurements.check(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error, code: "invalid" });
  await measurements.add(req.params.client, user, checked);
  res.json(await measurementsAnswer(req.params.client, user));
}));
const ownMeasurement = async (req, res, user) => {
  const row = await measurements.measurementById(req.params.id);
  if (!row) { res.status(404).json({ error: "Not found", code: "not_found" }); return null; }
  return await ownClient(req, res, user, row.client_id) ? row : null;
};
app.put("/api/measurements/:id", asSignedIn("PUT /measurements", async (req, res, user) => {
  const row = await ownMeasurement(req, res, user);
  if (!row) return;
  const checked = measurements.check(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error, code: "invalid" });
  const done = await measurements.update(row.id, user.id, checked);
  if (done === "not_yours") return res.status(403).json({ error: "Only the trainer who took them can change them.", code: "not_yours" });
  res.json(await measurementsAnswer(row.client_id, user));
}));
app.delete("/api/measurements/:id", asSignedIn("DELETE /measurements", async (req, res, user) => {
  const row = await ownMeasurement(req, res, user);
  if (!row) return;
  const done = await measurements.remove(row.id, user.id);
  if (done === "not_yours") return res.status(403).json({ error: "Only the trainer who took them can delete them.", code: "not_yours" });
  res.json(await measurementsAnswer(row.client_id, user));
}));

/* A client's fitness tests (server/fitness-tests.js), as measurements: only
   for a client on the trainer's list, seen by all their trainers, changed
   and deleted only by the one who did them. */
const testsAnswer = async (clientId, user) => ({
  tests: await fitnessTests.testsOf(clientId, user.id), units: await trainerSettings.unitsOf(user.id),
});
app.get("/api/clients/:client/tests", asSignedIn("GET /clients/tests", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  res.set("Cache-Control", "private, no-store");
  res.json(await testsAnswer(req.params.client, user));
}));
app.post("/api/clients/:client/tests", asSignedIn("POST /clients/tests", async (req, res, user) => {
  if (!await ownClient(req, res, user, req.params.client)) return;
  const checked = fitnessTests.check(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error, code: "invalid" });
  await fitnessTests.add(req.params.client, user, checked.row);
  res.json(await testsAnswer(req.params.client, user));
}));
const ownTest = async (req, res, user) => {
  const row = await fitnessTests.testById(req.params.id);
  if (!row) { res.status(404).json({ error: "Not found", code: "not_found" }); return null; }
  return await ownClient(req, res, user, row.client_id) ? row : null;
};
app.put("/api/tests/:id", asSignedIn("PUT /tests", async (req, res, user) => {
  const row = await ownTest(req, res, user);
  if (!row) return;
  const checked = fitnessTests.check(req.body);
  if (checked.error) return res.status(400).json({ error: checked.error, code: "invalid" });
  const done = await fitnessTests.update(row.id, user.id, checked.row);
  if (done === "not_yours") return res.status(403).json({ error: "Only the trainer who did the test can change it.", code: "not_yours" });
  res.json(await testsAnswer(row.client_id, user));
}));
app.delete("/api/tests/:id", asSignedIn("DELETE /tests", async (req, res, user) => {
  const row = await ownTest(req, res, user);
  if (!row) return;
  const done = await fitnessTests.remove(row.id, user.id);
  if (done === "not_yours") return res.status(403).json({ error: "Only the trainer who did the test can delete it.", code: "not_yours" });
  res.json(await testsAnswer(row.client_id, user));
}));

/* A place of the trainer's own, or a 404: never another trainer's. */
const ownPlace = async (req, res, user) => {
  const place = await equipment.placeOf(user.id, req.params.place);
  if (!place) res.status(404).json({ error: "Not found", code: "not_found" });
  return place;
};

app.post("/api/places", asSignedIn("POST /places", async (req, res, user) => {
  const wrong = equipment.checkPlaceName(req.body?.name);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.addPlace(user.id, req.body.name);
  res.json(await equipmentFor(req, user));
}));

app.patch("/api/places/:place", asSignedIn("PATCH /places", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const place = await equipment.placeOf(user.id, req.params.place);
  if (place?.fromStudio) return res.status(400).json({ error: "This place's name comes from Studio. Change it there.", code: "from_studio" });
  const wrong = equipment.checkPlaceName(req.body?.name);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.renamePlace(user.id, req.params.place, req.body.name);
  res.json(await equipmentFor(req, user));
}));

app.delete("/api/places/:place", asSignedIn("DELETE /places", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const refused = await equipment.archivePlace(user.id, req.params.place);
  if (refused === "last") return res.status(400).json({ error: "Keep at least one place.", code: "last_place" });
  if (refused === "studio") return res.status(400).json({ error: "This place comes from Studio, so it stays while Studio has it.", code: "from_studio" });
  res.json(await equipmentFor(req, user));
}));

app.put("/api/places/:place/categories/:key", asSignedIn("PUT /places/categories", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const has = req.body?.has;
  if (!equipment.isCategory(req.params.key)) return res.status(404).json({ error: "Not found", code: "not_found" });
  if (has !== true && has !== false && has !== null) return res.status(400).json({ error: "Say yes, no, or not answered.", code: "invalid" });
  if (await equipment.lockedAnswer(user.id, req.params.place, "category", req.params.key)) return res.status(400).json({ error: SET_FOR_EVERYONE, code: "set_for_everyone" });
  await equipment.setCategory(user.id, req.params.place, req.params.key, has);
  res.json(await equipmentFor(req, user));
}));

app.post("/api/places/:place/items", asSignedIn("POST /places/items", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const wrong = equipment.checkItem(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  if (await equipment.lockedAnswer(user.id, req.params.place, "item", req.body.name)) return res.status(400).json({ error: SET_FOR_EVERYONE, code: "set_for_everyone" });
  await equipment.setItem(user.id, req.params.place, req.body);
  res.json(await equipmentFor(req, user));
}));

app.delete("/api/equipment/items/:id", asSignedIn("DELETE /equipment/items", async (req, res, user) => {
  await equipment.removeItem(user.id, req.params.id);
  res.json(await equipmentFor(req, user));
}));

const SET_FOR_EVERYONE = "The Primary Master has set this for everyone at this place. Ask them to change it.";

/* The equipment at a place in Studio, set by the Primary Master for every
   trainer whose place it is; anyone else is told there is no such thing. */
const asSetter = (what, fn) => asSignedIn(what, async (req, res, user) => {
  if (!isPrimaryMaster(user)) return res.status(404).json({ error: "Not found", code: "not_found" });
  return fn(req, res, user);
});
const everyonesPlace = async (req, res) => {
  const place = await equipment.everyonesPlace(req.params.place);
  if (!place) res.status(404).json({ error: "Not found", code: "not_found" });
  return place;
};

app.put("/api/everyone/places/:place/categories/:key", asSetter("PUT /everyone/places/categories", async (req, res, user) => {
  if (!await everyonesPlace(req, res)) return;
  const has = req.body?.has;
  if (!equipment.isCategory(req.params.key)) return res.status(404).json({ error: "Not found", code: "not_found" });
  if (has !== true && has !== false && has !== null) return res.status(400).json({ error: "Say yes, no, or not answered.", code: "invalid" });
  await equipment.setCategory(equipment.EVERYONE, req.params.place, req.params.key, has, "primary");
  res.json(await equipmentFor(req, user));
}));

app.post("/api/everyone/places/:place/items", asSetter("POST /everyone/places/items", async (req, res, user) => {
  if (!await everyonesPlace(req, res)) return;
  const wrong = equipment.checkItem(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.setItem(equipment.EVERYONE, req.params.place, req.body, "primary");
  res.json(await equipmentFor(req, user));
}));

app.delete("/api/everyone/items/:id", asSetter("DELETE /everyone/items", async (req, res, user) => {
  await equipment.removeItem(equipment.EVERYONE, req.params.id, "primary");
  res.json(await equipmentFor(req, user));
}));

/* Coach IQ's library, searched by name, and the exercises part of the
   trainer's memory: their own names and private exercises (library.js). */
app.get("/api/coach-iq/exercises", asSignedIn("GET /coach-iq/exercises", async (req, res) => {
  res.json({ exercises: library.searchLibrary(String(req.query.q || "").slice(0, 120)).map(library.brief) });
}));

app.get("/api/my-exercises", asSignedIn("GET /my-exercises", async (_req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await library.exercisesOf(user.id));
}));

app.post("/api/my-exercises/names", asSignedIn("POST /my-exercises/names", async (req, res, user) => {
  const wrong = await library.checkName(user.id, req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await library.saveName(user.id, req.body);
  res.json(await library.exercisesOf(user.id));
}));

/* Tie one of their names to an exercise, or untie it (exerciseId null). */
app.patch("/api/my-exercises/names/:id", asSignedIn("PATCH /my-exercises/names", async (req, res, user) => {
  const had = await library.nameById(user.id, req.params.id);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const body = { name: had.name, exerciseId: req.body?.exerciseId || null };
  const wrong = await library.checkName(user.id, body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await library.saveName(user.id, body);
  res.json(await library.exercisesOf(user.id));
}));

app.delete("/api/my-exercises/names/:id", asSignedIn("DELETE /my-exercises/names", async (req, res, user) => {
  await library.deleteName(user.id, req.params.id);
  res.json(await library.exercisesOf(user.id));
}));

/* A private exercise. Made from a name still to sort out (fromName), it
   takes that name and is tied to it. */
app.post("/api/my-exercises/own", asSignedIn("POST /my-exercises/own", async (req, res, user) => {
  const wrong = library.checkPrivate(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  const from = req.body.fromName ? await library.nameById(user.id, req.body.fromName) : null;
  if (req.body.fromName && !from) return res.status(404).json({ error: "Not found", code: "not_found" });
  const id = await library.addPrivate(user.id, req.body);
  if (from) await library.saveName(user.id, { name: from.name, exerciseId: id });
  res.json(await library.exercisesOf(user.id));
}));

const ownExercise = async (res, user, id) => {
  const mine = await library.privateOf(user.id, id);
  if (!mine) res.status(404).json({ error: "Not found", code: "not_found" });
  return mine;
};

app.patch("/api/my-exercises/own/:id", asSignedIn("PATCH /my-exercises/own", async (req, res, user) => {
  if (!await ownExercise(res, user, req.params.id)) return;
  const wrong = library.checkPrivate(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await library.updatePrivate(user.id, req.params.id, req.body);
  res.json(await library.exercisesOf(user.id));
}));

app.delete("/api/my-exercises/own/:id", asSignedIn("DELETE /my-exercises/own", async (req, res, user) => {
  if (!await ownExercise(res, user, req.params.id)) return;
  await library.archivePrivate(user.id, req.params.id);
  res.json(await library.exercisesOf(user.id));
}));

/* Suggested to Glenn for the shared library (PUT), or taken back (DELETE). */
app.put("/api/my-exercises/own/:id/suggestion", asSignedIn("PUT /my-exercises/own/suggestion", async (req, res, user) => {
  if (!await ownExercise(res, user, req.params.id)) return;
  const note = req.body?.note ?? "";
  if (typeof note !== "string" || note.length > 300) return res.status(400).json({ error: "Keep the note short.", code: "invalid" });
  await library.suggestPrivate(user, req.params.id, note);
  res.json(await library.exercisesOf(user.id));
}));

app.delete("/api/my-exercises/own/:id/suggestion", asSignedIn("DELETE /my-exercises/own/suggestion", async (req, res, user) => {
  if (!await ownExercise(res, user, req.params.id)) return;
  await library.suggestPrivate(user, req.params.id, null);
  res.json(await library.exercisesOf(user.id));
}));

/* The review of Coach IQ (ideas audit, 24), for the Primary Master alone,
   as Studio decides who that is (its isPrimaryMaster); anyone else is told
   there is nothing here. */
const asPrimary = (what, fn) => asSignedIn(what, async (req, res, user) => {
  if (!(user?.isPrimary && user?.role === "master")) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.set("Cache-Control", "private, no-store");
  await fn(req, res, user);
});

app.get("/api/coach-iq/review", asPrimary("GET /coach-iq/review", async (_req, res) => {
  const conditions = limitations.conditionsForReview();
  res.json({
    ...library.reviewSummary(),
    conditions: { total: conditions.length, approved: conditions.filter(c => c.status === "reviewed").length, flagged: conditions.filter(c => c.mark?.mark === "flag").length },
    principles: principles.principlesSummary(),
    suggestions: await library.suggestions(),
  });
}));

app.get("/api/coach-iq/review/families/:id", asPrimary("GET /coach-iq/review/families", async (req, res) => {
  const family = library.reviewFamily(req.params.id);
  if (!family) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.json(family);
}));

app.get("/api/coach-iq/review/conditions", asPrimary("GET /coach-iq/review/conditions", async (_req, res) => {
  res.json({ conditions: limitations.conditionsForReview() });
}));

app.get("/api/coach-iq/review/principles", asPrimary("GET /coach-iq/review/principles", async (_req, res) => {
  res.json({ principles: principles.principlesForReview() });
}));

/* Approve, Flag or take back (mark "clear"), with a comment. */
app.put("/api/coach-iq/review/:kind/:target", asPrimary("PUT /coach-iq/review", async (req, res, user) => {
  const { kind, target } = req.params;
  const known = kind === "exercise" ? library.isExercise(target) : kind === "condition" ? limitations.isCondition(target)
    : kind === "principle" ? principles.isPrinciple(target) : false;
  if (!known) return res.status(404).json({ error: "Not found", code: "not_found" });
  const { mark, comment = "" } = req.body || {};
  if (!reviews.MARKS.includes(mark)) return res.status(400).json({ error: "Approve, flag, or take it back.", code: "invalid" });
  if (typeof comment !== "string" || comment.length > 1000) return res.status(400).json({ error: "Keep the comment under 1,000 characters.", code: "invalid" });
  if (mark === "flag" && !comment.trim()) return res.status(400).json({ error: "Say what's wrong, so it can be fixed.", code: "invalid" });
  /* The mark goes into the library itself now it lives in the app: an
     approval makes it reviewed, dated today; a flag, or taking an approval
     back, makes it a draft again. */
  const doc = kind === "exercise" ? library.exerciseById(target) : kind === "principle" ? principles.principleByKey(target)
    : store.current().conditions.find(c => c.key === target);
  const had = reviews.markOf(kind, target);
  const status = mark === "approve" ? { status: "reviewed", reviewed: new Date().toISOString().slice(0, 10) }
    : mark === "flag" || had?.mark === "approve" ? { status: "draft", reviewed: null } : null;
  if (status && doc.status !== "retired" && (doc.status !== status.status || doc.reviewed !== status.reviewed)) {
    const words = { approve: "Approved", flag: "Flagged", clear: "Took back the approval of" }[mark];
    try {
      await store.change([{ kind, id: target, after: { ...doc, ...status } }], user, `${words} ${doc.name || doc.label || doc.title}`);
    } catch (err) { return refused(res, err); }
  }
  await reviews.setMark(kind, target, { mark, comment }, user);
  res.json({ mark: reviews.markOf(kind, target) });
}));

/* ------------------------------------------------- editing the library
   The library lives in the app (iq-store.js): every change is checked with
   Coach IQ's rules, refused with the reasons if it would break, and kept in
   its history to undo. The Primary Master's alone, like the review. */
/* A new id for the library, one it doesn't hold already. */
const freshId = (kind) => {
  let id;
  do id = newId(kind); while (library.exerciseById(id) || library.familyById(id));
  return id;
};
const refused = (res, err, headline = "That would break the library, so nothing was saved.") => {
  if (!(err instanceof store.Refused)) throw err;
  res.status(400).json({ error: headline, problems: err.problems, code: "refused" });
};

app.get("/api/coach-iq/library/vocabulary", asPrimary("GET /coach-iq/library/vocabulary", async (_req, res) => {
  res.json(edit.vocabulary());
}));

/* A version changed; with `easier`, the versions one step easier too. */
app.put("/api/coach-iq/library/exercises/:id", asPrimary("PUT /coach-iq/library/exercises", async (req, res, user) => {
  const had = library.exerciseById(req.params.id);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const after = edit.versionFrom(req.body, had);
  const others = Array.isArray(req.body?.easier) ? edit.easierChanges(store.current().exercises, had.id, req.body.easier) : [];
  try {
    await store.change([{ kind: "exercise", id: had.id, after }, ...others], user, `Changed ${after.name}`);
  } catch (err) { return refused(res, err); }
  res.json(library.reviewFamily(after.movement));
}));

/* A new version in a family. */
app.post("/api/coach-iq/library/exercises", asPrimary("POST /coach-iq/library/exercises", async (req, res, user) => {
  const id = freshId("exercise");
  const after = edit.versionFrom(req.body, null, { id });
  const family = library.familyById(after.movement);
  if (!family) return res.status(400).json({ error: "Choose the family it belongs to.", code: "invalid" });
  try {
    await store.change([{ kind: "exercise", id, after }, ...edit.easierChanges(store.current().exercises, id, req.body?.easier)], user, `Added ${after.name} to ${family.label}`);
  } catch (err) { return refused(res, err); }
  res.json({ id, family: library.reviewFamily(after.movement) });
}));

/* Retire a version (it stays, so programs naming it are understood, but is
   never offered), or bring one back. */
app.put("/api/coach-iq/library/exercises/:id/retired", asPrimary("PUT /coach-iq/library/exercises/retired", async (req, res, user) => {
  const had = library.exerciseById(req.params.id);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const retire = req.body?.retired === true;
  const after = retire ? { ...had, status: "retired" } : { ...had, status: "draft", reviewed: null };
  if (!retire) delete after.replacedBy;
  try {
    await store.change([{ kind: "exercise", id: had.id, after }], user, `${retire ? "Retired" : "Brought back"} ${had.name}`);
  } catch (err) { return refused(res, err); }
  res.json(library.reviewFamily(had.movement));
}));

app.put("/api/coach-iq/library/families/:id", asPrimary("PUT /coach-iq/library/families", async (req, res, user) => {
  const had = library.familyById(req.params.id);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const after = edit.familyFrom(req.body, had);
  try {
    await store.change([{ kind: "family", id: req.params.id, after }], user, `Changed the family ${after.label}`);
  } catch (err) { return refused(res, err); }
  res.json(library.reviewFamily(req.params.id));
}));

/* A new family, with its first version: a family can't be empty. */
app.post("/api/coach-iq/library/families", asPrimary("POST /coach-iq/library/families", async (req, res, user) => {
  const familyId = freshId("family"), id = freshId("exercise");
  const family = edit.familyFrom(req.body?.family);
  const version = edit.versionFrom({ ...req.body?.version, movement: familyId }, null, { id });
  try {
    await store.change([{ kind: "family", id: familyId, after: family }, { kind: "exercise", id, after: version },
      ...edit.easierChanges(store.current().exercises, id, req.body?.version?.easier)], user, `Added the family ${family.label}, with ${version.name}`);
  } catch (err) { return refused(res, err); }
  res.json({ id: familyId, family: library.reviewFamily(familyId) });
}));

app.put("/api/coach-iq/library/conditions/:key", asPrimary("PUT /coach-iq/library/conditions", async (req, res, user) => {
  const had = store.current().conditions.find(c => c.key === req.params.key);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const after = edit.conditionFrom(req.body, had);
  try {
    await store.change([{ kind: "condition", id: had.key, after }], user, `Changed the condition ${after.label}`);
  } catch (err) { return refused(res, err); }
  res.json({ conditions: limitations.conditionsForReview() });
}));

app.post("/api/coach-iq/library/conditions", asPrimary("POST /coach-iq/library/conditions", async (req, res, user) => {
  const after = edit.conditionFrom(req.body);
  if (!after.key) return res.status(400).json({ error: "Give the condition a name.", code: "invalid" });
  if (limitations.isCondition(after.key)) return res.status(400).json({ error: "There is a condition by that name already.", code: "invalid" });
  try {
    await store.change([{ kind: "condition", id: after.key, after }], user, `Added the condition ${after.label}`);
  } catch (err) { return refused(res, err); }
  res.json({ conditions: limitations.conditionsForReview() });
}));

/* The principles (build 1.0.16): changed, or a new topic added, in Markdown
   as the files have it. */
app.put("/api/coach-iq/library/principles/:key", asPrimary("PUT /coach-iq/library/principles", async (req, res, user) => {
  const had = principles.principleByKey(req.params.key);
  if (!had) return res.status(404).json({ error: "Not found", code: "not_found" });
  const after = edit.principleFrom(req.body, had);
  try {
    await store.change([{ kind: "principle", id: had.key, after }], user, `Changed the principles on ${after.title}`);
  } catch (err) { return refused(res, err); }
  res.json({ principles: principles.principlesForReview() });
}));

app.post("/api/coach-iq/library/principles", asPrimary("POST /coach-iq/library/principles", async (req, res, user) => {
  const after = edit.principleFrom(req.body);
  if (!after.key) return res.status(400).json({ error: "Give the topic a title.", code: "invalid" });
  if (principles.isPrinciple(after.key)) return res.status(400).json({ error: "There is a topic by that name already.", code: "invalid" });
  try {
    await store.change([{ kind: "principle", id: after.key, after }], user, `Added the principles on ${after.title}`);
  } catch (err) { return refused(res, err); }
  res.json({ principles: principles.principlesForReview() });
}));

/* ---------------------------------------------------- reading a book
   (books.js): the Primary Master's, like the rest of Review Coach IQ. The
   PDF comes as the request's own body, streamed to the files folder. */
app.get("/api/coach-iq/books", asPrimary("GET /coach-iq/books", async (_req, res) => {
  res.json({ books: await books.list(), available: billy.configured(), model: books.model() });
}));

app.post("/api/coach-iq/books", asPrimary("POST /coach-iq/books", async (req, res, user) => {
  if (!/^application\/pdf\b/i.test(req.headers["content-type"] || "")) return res.status(400).json({ error: "Choose a PDF.", code: "invalid" });
  if (Number(req.headers["content-length"]) > books.MAX_BYTES) return res.status(413).json({ error: "That PDF is over 100 MB. Split it into two and upload the parts as two books.", code: "too_big" });
  const out = await books.upload(req, user, decodeURIComponent(String(req.headers["x-file-name"] || "")));
  if (out.error) return res.status(400).json({ error: out.error, code: "invalid" });
  res.json({ id: out.id, books: await books.list() });
}));

app.get("/api/coach-iq/books/:id", asPrimary("GET /coach-iq/books/one", async (req, res) => {
  const book = await books.book(req.params.id);
  if (!book) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.json(book);
}));

app.post("/api/coach-iq/books/:id/retry", asPrimary("POST /coach-iq/books/retry", async (req, res) => {
  if (!await books.retry(req.params.id)) return res.status(400).json({ error: "Only a book that stopped can be tried again.", code: "invalid" });
  res.json(await books.book(req.params.id));
}));

app.delete("/api/coach-iq/books/:id", asPrimary("DELETE /coach-iq/books", async (req, res) => {
  if (!await books.discard(req.params.id)) return res.status(404).json({ error: "Not found", code: "not_found" });
  res.json({ books: await books.list() });
}));

/* One proposed topic: answer its open points, have them written in, change
   the text, accept it into the principles, or reject it. */
const onProposal = (what, fn) => asPrimary(what, async (req, res, user) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 0) return res.status(404).json({ error: "Not found", code: "not_found" });
  try {
    await fn(req.params.id, n, req.body || {}, user);
  } catch (err) {
    if (err instanceof books.Wrong) return res.status(400).json({ error: err.message, code: "invalid" });
    return refused(res, err, "That would break the library, so nothing was saved.");
  }
  res.json(await books.book(req.params.id));
});

app.put("/api/coach-iq/books/:id/proposals/:n/answers", onProposal("PUT /coach-iq/books/answers", (id, n, body) => books.saveAnswers(id, n, body.answers)));
app.post("/api/coach-iq/books/:id/proposals/:n/write", onProposal("POST /coach-iq/books/write", (id, n, _body, user) => books.startWriteUp(id, n, user)));
app.put("/api/coach-iq/books/:id/proposals/:n/text", onProposal("PUT /coach-iq/books/text", (id, n, body) => books.editWritten(id, n, body)));
app.post("/api/coach-iq/books/:id/proposals/:n/accept", onProposal("POST /coach-iq/books/accept", (id, n, _body, user) => books.accept(id, n, user)));
app.post("/api/coach-iq/books/:id/proposals/:n/reject", onProposal("POST /coach-iq/books/reject", (id, n, _body, user) => books.reject(id, n, user)));

/* A trainer's suggestion, made a version of the library: their names for it
   follow it there, and their own copy is put away. */
app.post("/api/coach-iq/library/suggestions/:id", asPrimary("POST /coach-iq/library/suggestions", async (req, res, user) => {
  const suggestion = await library.suggestionById(req.params.id);
  if (!suggestion) return res.status(404).json({ error: "Not found", code: "not_found" });
  const id = freshId("exercise");
  const after = edit.versionFrom(req.body, null, { id, origin: "trainer" });
  const family = library.familyById(after.movement);
  if (!family) return res.status(400).json({ error: "Choose the family it belongs to.", code: "invalid" });
  try {
    await store.change([{ kind: "exercise", id, after }, ...edit.easierChanges(store.current().exercises, id, req.body?.easier)], user,
      `Added ${after.name} to ${family.label}, suggested by ${suggestion.by || "a trainer"}`);
  } catch (err) { return refused(res, err); }
  await library.acceptSuggestion(suggestion.id, id);
  res.json({ id, family: after.movement, suggestions: await library.suggestions() });
}));

/* What changed, newest first: all of it, or one row's. */
app.get("/api/coach-iq/library/history", asPrimary("GET /coach-iq/library/history", async (req, res) => {
  res.json({ changes: await store.history({ kind: req.query.kind, id: req.query.id, limit: Math.min(Number(req.query.limit) || 50, 200) }) });
}));

app.post("/api/coach-iq/library/history/:id/undo", asPrimary("POST /coach-iq/library/history/undo", async (req, res, user) => {
  try {
    const id = await store.undo(req.params.id, user);
    if (!id) return res.status(404).json({ error: "Not found", code: "not_found" });
  } catch (err) { return refused(res, err, "That change can't be undone just now."); }
  res.json({ changes: await store.history() });
}));

/* The whole library as a file, in the files' own shape: a snapshot to keep,
   and what `npm run iq -- --import <file>` writes back into the code. */
app.get("/api/coach-iq/library/export", asPrimary("GET /coach-iq/library/export", async (_req, res) => {
  res.set("Content-Disposition", `attachment; filename="coach-iq-library-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json(store.exportLibrary());
}));

/* Installation → Where files are saved (server/durable-home.js), the
   Primary Master's, as in Studio: the folder is tried before it is accepted,
   and files already saved are not moved. */
app.get("/api/storage", asPrimary("GET /storage", async (_req, res) => {
  await refreshStorage({ force: true });
  res.json(storageState());
}));

app.put("/api/storage", asPrimary("PUT /storage", async (req, res, user) => {
  const given = req.body?.folder;
  if (given !== undefined && given !== null && typeof given !== "string") {
    return res.status(400).json({ error: "The folder must be a path, in words.", code: "invalid" });
  }
  const before = storageState().folder;
  const out = await chooseStorage(given);
  if (out.error) return res.status(400).json({ error: out.error, code: "invalid" });
  const now = storageState().folder;
  if (now !== before) console.log(`Files are now saved in ${now} (was ${before}), chosen by ${user.name || user.id}`);
  res.json(storageState());
}));

/* ------------------------------------------------- the program designer
   (programs.js). A program is its writer's alone (Glenn, 17 Oct 2026: "Only
   the trainer who wrote it"): anyone else is told there is no such thing.
   Every change answers with the whole program, checked again. */
const notFound = (res) => res.status(404).json({ error: "Not found", code: "not_found" });
const sendProgram = async (res, user, program) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await programs.full(user.id, await programs.programOf(user.id, program.id)));
};

app.get("/api/programs", asSignedIn("GET /programs", async (req, res, user) => {
  await syncStudioPlace(req, user);
  res.set("Cache-Control", "private, no-store");
  res.json({ programs: await programs.list(user.id), goals: programs.goalsList(), ...programs.kindsFor() });
}));

/* A client of theirs and one of their places, or a 400 saying which. */
async function programWorld(req, user, { clientId, placeId }) {
  let client, place;
  if (clientId !== undefined) {
    client = (await myClients(req, user)).find(c => c.id === clientId);
    if (!client) return { error: "Choose one of your clients." };
  }
  if (placeId !== undefined && placeId !== "") {
    place = await equipment.placeOf(user.id, placeId);
    if (!place) return { error: "Choose one of your places." };
  }
  return { client, placeId: placeId === undefined ? undefined : place?.id || "" };
}

app.post("/api/programs", asSignedIn("POST /programs", async (req, res, user) => {
  const wrong = programs.checkDetails(req.body, { creating: true });
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  const world = await programWorld(req, user, { clientId: req.body.clientId ?? "", placeId: req.body.placeId ?? "" });
  if (world.error) return res.status(400).json({ error: world.error, code: "invalid" });
  const id = await programs.create(user.id, world.client, world.placeId, req.body);
  await sendProgram(res, user, { id });
}));

app.get("/api/programs/:id", asSignedIn("GET /programs/one", async (req, res, user) => {
  const program = await programs.programOf(user.id, req.params.id);
  if (!program) return notFound(res);
  res.set("Cache-Control", "private, no-store");
  const out = await programs.full(user.id, program);
  /* The client's gym in Studio, read now: if it has changed since the program
     was made for one of Studio's places (or none), say so, and offer it. A
     place of the trainer's own choosing (a client's home) is left alone. */
  try {
    const client = (await myClients(req, user)).find(c => c.id === program.client_id);
    const here = program.place_id ? await equipment.placeOf(user.id, program.place_id) : null;
    if (client?.studioPlaceId && (!here || here.fromStudio) && here?.studioPlaceId !== client.studioPlaceId) {
      await syncStudioPlace(req, user);
      const gym = await equipment.placeForStudio(user.id, client.studioPlaceId);
      if (gym) out.gym = { placeId: gym.id, text: `${client.firstName}'s gym in Studio is ${gym.name}${here ? `; this program is for ${here.name}` : ""}.`, name: gym.name };
    }
  } catch (err) {
    console.warn("The client's gym couldn't be checked:", err.message);
  }
  res.json(out);
}));

app.patch("/api/programs/:id", asSignedIn("PATCH /programs", async (req, res, user) => {
  const program = await programs.programOf(user.id, req.params.id);
  if (!program) return notFound(res);
  const wrong = programs.checkDetails(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  const world = await programWorld(req, user, { clientId: req.body.clientId, placeId: req.body.placeId });
  if (world.error) return res.status(400).json({ error: world.error, code: "invalid" });
  await programs.update(program, req.body, world);
  await sendProgram(res, user, program);
}));

app.delete("/api/programs/:id", asSignedIn("DELETE /programs", async (req, res, user) => {
  const program = await programs.programOf(user.id, req.params.id);
  if (!program) return notFound(res);
  await programs.archive(program);
  res.json({ programs: await programs.list(user.id) });
}));

app.post("/api/programs/:id/days", asSignedIn("POST /programs/days", async (req, res, user) => {
  const program = await programs.programOf(user.id, req.params.id);
  if (!program) return notFound(res);
  const next = await programs.nextDay(program);
  await programs.addDay(program.id, req.body?.name || next.name, next.kind);
  await sendProgram(res, user, program);
}));

app.patch("/api/program-days/:id", asSignedIn("PATCH /program-days", async (req, res, user) => {
  const program = await programs.programOfDay(user.id, req.params.id);
  if (!program) return notFound(res);
  if (req.body?.move) await programs.moveDay(req.params.id, program.id, Number(req.body.move));
  const wrong = await programs.updateDay(req.params.id, program.id, req.body || {});
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await sendProgram(res, user, program);
}));

app.delete("/api/program-days/:id", asSignedIn("DELETE /program-days", async (req, res, user) => {
  const program = await programs.programOfDay(user.id, req.params.id);
  if (!program) return notFound(res);
  await programs.deleteDay(req.params.id, program.id);
  await sendProgram(res, user, program);
}));

/* What could come next on a day, from Coach IQ. */
app.get("/api/program-days/:id/suggestions", asSignedIn("GET /program-days/suggestions", async (req, res, user) => {
  const program = await programs.programOfDay(user.id, req.params.id);
  if (!program) return notFound(res);
  res.set("Cache-Control", "private, no-store");
  /* Narrowed to what they are working on, when the dialog says (workOn, a
     kind of movement; muscles, comma-separated); otherwise what comes next. */
  const workOn = String(req.query.workOn || "") || null;
  const muscles = String(req.query.muscles || "").split(",").map(m => m.trim()).filter(Boolean).slice(0, 12);
  if (workOn || muscles.length) return res.json(await programs.suggestFor(user.id, program, req.params.id, { workOn, muscles }));
  res.json(await programs.suggestNext(user.id, program, req.params.id));
}));

/* One exercise as the dialog shows it before it goes on this day. */
app.get("/api/program-days/:id/preview", asSignedIn("GET /program-days/preview", async (req, res, user) => {
  const program = await programs.programOfDay(user.id, req.params.id);
  if (!program) return notFound(res);
  const out = await programs.preview(user.id, program, String(req.query.exercise || ""));
  if (!out) return notFound(res);
  res.set("Cache-Control", "private, no-store");
  res.json({ ...out, dose: { ...out.dose, restText: programs.restWords(out.dose.rest) } });
}));

/* An exercise on a day: the library's or one of their own, by its id. */
app.post("/api/program-days/:id/exercises", asSignedIn("POST /program-days/exercises", async (req, res, user) => {
  const program = await programs.programOfDay(user.id, req.params.id);
  if (!program) return notFound(res);
  if (!await programs.canUse(user.id, req.body?.exerciseId)) return res.status(400).json({ error: "Choose an exercise from the library or your own.", code: "invalid" });
  const dose = programs.doseFrom(req.body);
  if (dose.error) return res.status(400).json({ error: dose.error, code: "invalid" });
  await programs.addExercise(program, req.params.id, req.body.exerciseId, dose);
  await sendProgram(res, user, program);
}));

app.patch("/api/program-exercises/:id", asSignedIn("PATCH /program-exercises", async (req, res, user) => {
  const program = await programs.programOfExercise(user.id, req.params.id);
  if (!program) return notFound(res);
  if (req.body?.exerciseId !== undefined && !await programs.canUse(user.id, req.body.exerciseId)) {
    return res.status(400).json({ error: "Choose an exercise from the library or your own.", code: "invalid" });
  }
  if (req.body?.move) await programs.moveExercise(req.params.id, program.id, Number(req.body.move));
  const dose = programs.doseFrom(req.body || {});
  if (dose.error) return res.status(400).json({ error: dose.error, code: "invalid" });
  await programs.updateExercise(req.params.id, program.id, dose, req.body?.exerciseId);
  await sendProgram(res, user, program);
}));

app.delete("/api/program-exercises/:id", asSignedIn("DELETE /program-exercises", async (req, res, user) => {
  const program = await programs.programOfExercise(user.id, req.params.id);
  if (!program) return notFound(res);
  await programs.deleteExercise(req.params.id, program.id);
  await sendProgram(res, user, program);
}));

/* Alternatives for one exercise in a program, fitted to it. */
app.get("/api/program-exercises/:id/swaps", asSignedIn("GET /program-exercises/swaps", async (req, res, user) => {
  const program = await programs.programOfExercise(user.id, req.params.id);
  if (!program) return notFound(res);
  const row = await db.get(`SELECT exercise_id FROM coach_program_exercises WHERE id = ?`, [req.params.id]);
  res.set("Cache-Control", "private, no-store");
  res.json(await programs.swapsFor(user.id, program, row.exercise_id));
}));

/* Finding an exercise to add: their own names first, then their own
   exercises, then the library (library.findExercise, as Billy finds them). */
app.get("/api/programs-find", asSignedIn("GET /programs-find", async (req, res, user) => {
  res.set("Cache-Control", "private, no-store");
  res.json(await library.findExercise(user.id, String(req.query.q || "").slice(0, 120)));
}));

/* Years from a YYYY-MM-DD birthday, or null. */
function ageOf(dateOfBirth) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth || "");
  if (!m) return null;
  const now = new Date();
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age -= 1;
  return age > 0 && age < 120 ? age : null;
}

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
  await syncStudioPlace(req, user);
  const history = req.body?.messages;
  const wrong = billy.checkHistory(history);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  const last = history[history.length - 1];
  const fromDocument = Array.isArray(last?.content) && last.content.some(b => b?.type === "image" || b?.type === "document");
  /* A client of theirs by name or id, or what to ask. */
  const clientNamed = async (name) => {
    const want = String(name || "").trim().toLowerCase();
    const matches = (await myClients(req, user)).filter(c => c.id === name || `${c.firstName} ${c.lastName}`.trim().toLowerCase() === want || c.firstName.toLowerCase() === want);
    if (matches.length !== 1) return { error: matches.length ? "More than one client goes by that name: ask which." : "No client of theirs by that name." };
    return matches[0];
  };
  /* One of their places by name, or their only one, or what to ask. */
  const placeNamed = (places, name) => {
    const place = name
      ? places.find(p => p.name.trim().toLowerCase() === String(name).trim().toLowerCase())
      : places.length === 1 ? places[0] : null;
    return place || { error: `Ask which place this is: ${places.map(p => p.name).join(", ")}.` };
  };
  const units = await trainerSettings.unitsOf(user.id).catch(() => undefined);
  try {
    const out = await billy.answer({ ...user, units }, history, {
      /* Only what designing training needs (ideas audit, 22): no email,
         phone or birthday, but an age. */
      my_clients: async () => ({ clients: (await myClients(req, user)).map(({ email, phone, dateOfBirth, ...c }) => ({ ...c, age: ageOf(dateOfBirth) })) }),
      client_limitations: async (input) => {
        const client = await clientNamed(input?.client);
        if (client.error) return client;
        return limitations.meaningOf(await limitations.limitationsOf(client.id, user.id));
      },
      /* The library, searched in code (ideas audit, 4): their own names
         first, then their private exercises, then the library. */
      find_exercise: async (input) => library.findExercise(user.id, String(input?.name || "").slice(0, 120)),
      /* Only the reviewed principles (principles.js): a draft is not his to
         work from until the Primary Master approves it. */
      /* Their own programs only (programs.js): read, with Coach IQ's check
         and what could come next on each day, never changed by him. */
      my_programs: async (input) => {
        const want = String(input?.program || "").trim().toLowerCase();
        const list = await programs.list(user.id);
        if (!want) return { programs: list.map(p => ({ id: p.id, name: p.name, client: p.clientName, goal: p.goalLabel, days: p.days, exercises: p.exercises })) };
        const hit = list.find(p => p.id === want) || list.filter(p => p.name.toLowerCase() === want || `${p.name} ${p.clientName}`.toLowerCase().includes(want))[0];
        if (!hit) return { error: "No program of theirs by that name.", programs: list.map(p => ({ id: p.id, name: p.name, client: p.clientName })) };
        return programs.forBilly(user.id, await programs.programOf(user.id, hit.id));
      },
      /* Narrowed suggestions for one day of one of their programs, by kind of
         movement and muscles, already passing the place, level and limitations. */
      suggest_exercises: async (input) => {
        const list = await programs.list(user.id);
        const want = String(input?.program || "").trim().toLowerCase();
        const hit = list.find(p => p.id === want) || list.find(p => p.name.toLowerCase() === want || `${p.name} ${p.clientName}`.toLowerCase().includes(want));
        if (!hit) return { error: "No program of theirs by that name.", programs: list.map(p => ({ id: p.id, name: p.name, client: p.clientName })) };
        const program = await programs.programOf(user.id, hit.id);
        const full = await programs.full(user.id, program, { withCheck: false });
        const day = full.days.find(d => d.name.toLowerCase() === String(input?.day || "").trim().toLowerCase()) || (full.days.length === 1 ? full.days[0] : null);
        if (!day) return { error: "Say which day.", days: full.days.map(d => d.name) };
        const out = await programs.suggestFor(user.id, program, day.id, { workOn: input?.workOn || null, muscles: Array.isArray(input?.muscles) ? input.muscles : [] }, 8);
        return { day: day.name, ...out, suggestions: out.suggestions.map(s => ({ name: s.name, id: s.id, level: s.level, why: s.why, dose: s.dose, ...(s.askFirst ? { askFirst: s.askFirst } : {}), ...(s.modifyFor ? { modifyFor: s.modifyFor } : {}) })) };
      },
      coach_principles: async (input) => principles.principlesFor(String(input?.topic || "").slice(0, 80), units),
      /* Only options that pass come back: the place's equipment, the level
         and the client's limitations are checked here, never left to him. */
      find_alternatives: async (input) => {
        if (!library.isExercise(input?.exercise)) return { error: "Find the exercise first, and pass its id." };
        let place = null;
        if (input.place !== undefined || input.anyEquipment !== true) {
          const { places } = await equipment.equipmentOf(user.id);
          place = placeNamed(places, input.place);
          if (place.error) return place;
        }
        let rules = null;
        if (input.client) {
          const client = await clientNamed(input.client);
          if (client.error) return client;
          rules = limitations.rulesOf(await limitations.limitationsOf(client.id, user.id));
        }
        const level = ["beginner", "intermediate", "advanced"].includes(input.level) ? input.level : null;
        return library.alternativesFor(input.exercise, { place, level, rules });
      },
      /* A trainer's own name for an exercise, from their own words only, as
         for equipment: never from a document, and a name they tied
         themselves is retied only once they confirm. */
      remember_exercise_name: async (input) => {
        if (fromDocument) {
          return { needsConfirmation: true, say: "This message came with a document. Nothing in a document is saved: ask them to tell you in their own words, and save it when they do." };
        }
        const body = { name: String(input?.name || ""), exerciseId: input?.exercise || null };
        const wrong = await library.checkName(user.id, body);
        if (wrong) return { error: wrong };
        const before = await library.nameOf(user.id, body.name);
        if (before && before.source === "trainer" && before.exercise_id && before.exercise_id !== (body.exerciseId || "") && input.confirmed !== true) {
          return { needsConfirmation: true, say: "They tied this name to another exercise themselves. Tell them, and change it only if they confirm; then call again with confirmed: true." };
        }
        await library.saveName(user.id, body, "billy");
        return { saved: true, ...(body.exerciseId ? {} : { toSortOut: true }) };
      },
      my_equipment: async () => {
        const { places } = await equipment.equipmentOf(user.id);
        return { places: places.map(p => ({ name: p.name, checklist: p.categories.map(c => ({ kind: c.key, label: c.label, has: c.has })), pieces: p.items })) };
      },
      /* Only what the trainer has just told him (Glenn, 16 Oct 2026: "Yes"),
         marked as Billy's, on view on their equipment page to correct. A
         trainer's own answer is never changed without asking them first
         (ideas audit, 20: "Billy confirms before changing a trainer's own
         answer"). */
      remember_equipment: async (input) => {
        /* Read, never obeyed (ideas audit, 23): nothing reaches a trainer's
           memory from a message that carries a photo or a PDF. They say it in
           their own words, in a message of their own. */
        if (fromDocument) {
          return { needsConfirmation: true, say: "This message came with a document. Nothing in a document is saved: ask them to tell you in their own words, and save it when they do." };
        }
        const place = placeNamed(await equipment.placesOf(user.id), input?.place);
        if (place.error) return place;
        const isKind = input?.kind === "category";
        if (isKind && !equipment.isCategory(input.category)) return { error: "That isn't one of the checklist's kinds of equipment." };
        const piece = { name: input?.name, category: input?.category, has: input?.has, note: input?.note || "" };
        if (!isKind) {
          const wrong = equipment.checkItem(piece);
          if (wrong) return { error: wrong };
        }
        if (await equipment.lockedAnswer(user.id, place.id, isKind ? "category" : "item", isKind ? input.category : input.name)) {
          return { error: "The Primary Master has set this for everyone at this place, so it isn't changed here. Tell them to ask the Primary Master." };
        }
        const before = await equipment.answerFor(place.id, isKind ? "category" : "item", isKind ? input.category : input.name);
        if (before && before.source === "trainer" && before.has !== !!input.has && input.confirmed !== true) {
          return { needsConfirmation: true, place: place.name, current: before.has ? "yes" : "no",
            say: "They answered this themselves before. Tell them what they had said, and change it only if they confirm; then call again with confirmed: true." };
        }
        if (isKind) await equipment.setCategory(user.id, place.id, input.category, !!input.has, "billy");
        else await equipment.setItem(user.id, place.id, piece, "billy");
        return { saved: true, place: place.name };
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

/* ---------------------------------------------------- Coach's own accounts

   Sign-in and sign-up for a trainer who isn't on Trainability's team
   (accounts.js), answered here before anything is relayed to Studio: an email
   with a Coach account signs in here, any other is Studio's as before. */

const sessionCookie = (req, token, maxAge) =>
  `${accounts.COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${req.secure ? "; Secure" : ""}${maxAge ? `; Max-Age=${Math.floor(maxAge / 1000)}` : ""}`;
const clearCookie = (name) => `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
const tryKeys = (req, email) => [`ip:${req.ip}`, `email:${accounts.emailKey(email)}`];
function slowDown(req, res, email) {
  const wait = Math.max(...tryKeys(req, email).map(accounts.tooMany));
  if (!wait) return false;
  res.set("Retry-After", String(wait));
  res.status(429).json({ error: "Too many tries. Wait a few minutes and try again.", code: "rate_limited" });
  return true;
}
/* Studio's answer about an email: "password" for a team account, or null if
   Studio can't be reached (which a Coach account doesn't need). */
async function studioDoor(req, email) {
  try {
    const r = await studio(req, "/auth/door", { method: "POST", body: { email } });
    return r.ok ? (await r.json()).door : null;
  } catch { return null; }
}

/* Which way in an email takes: "coach" for a Coach account, else Studio's
   answer, passed on as it is. */
/* Studio's sign-in, asked for a Coach account being linked: Studio's own
   cookie passed on as the relay does (host-only), and Studio's answer. */
async function studioLogin(req, res, body) {
  const r = await studio(req, "/auth/login", { method: "POST", body });
  for (const c of r.headers.getSetCookie?.() || []) {
    if (c.startsWith(`${SESSION_COOKIE}=`)) res.append("Set-Cookie", c.replace(/;\s*Domain=[^;]*/i, ""));
  }
  const retry = r.headers.get("retry-after");
  if (retry) res.set("Retry-After", retry);
  let json = {};
  try { json = await r.json(); } catch { /* not JSON */ }
  return { ok: r.ok, status: r.status, json };
}

/* Which way in an email takes: "coach" for a Coach account; "link" for one
   whose email now also has a Studio team account (stage three: Studio's
   password links the two); else Studio's answer, passed on as it is. */
app.post("/api/auth/door", async (req, res, next) => {
  try {
    if (await accounts.accountByEmail(req.body?.email)) {
      return res.json({ door: await studioDoor(req, accounts.emailKey(req.body.email)) === "password" ? "link" : "coach" });
    }
  } catch (err) { console.error(`Coach door failed: ${err.message}`); }
  next();
});

app.post("/api/auth/login", async (req, res, next) => {
  const { email, password, remember } = req.body || {};
  let account;
  try { account = await accounts.accountByEmail(email); } catch (err) { console.error(`Coach login failed: ${err.message}`); }
  if (!account) {
    /* Signing in to Studio ends any Coach account's session in this browser. */
    res.append("Set-Cookie", clearCookie(accounts.COOKIE));
    return next();
  }
  if (slowDown(req, res, email)) return;
  /* The email has a Studio team account now too: Studio's password signs in
     and links the two (stage three). Studio's own refusals come back as
     they are. */
  if (await studioDoor(req, accounts.emailKey(email)) === "password") {
    try {
      const out = await studioLogin(req, res, { email, password, remember });
      if (!out.ok) return res.status(out.status).json(out.json);
      await accounts.link(account, out.json.user);
      res.append("Set-Cookie", clearCookie(accounts.COOKIE));
      return res.json({ ...out.json, linked: true });
    } catch (err) {
      return unreachable(res, "POST /auth/login (link)", err);
    }
  }
  const ok = await accounts.checkLogin(email, password);
  if (!ok) {
    for (const k of tryKeys(req, email)) accounts.counted(k);
    return res.status(401).json({ error: "That email and password don't match.", code: "invalid_credentials" });
  }
  accounts.forget(`email:${accounts.emailKey(email)}`);
  const { token, maxAge } = await accounts.startSession(ok.id, !!remember);
  res.append("Set-Cookie", sessionCookie(req, token, maxAge));
  res.append("Set-Cookie", clearCookie(SESSION_COOKIE));
  res.json({ user: accounts.asUser(ok) });
});

/* Linking a Coach account to a Studio account with another email (the
   account menu's Link your Studio account): signed in to Coach's account,
   they sign in to Studio once with that email and password; from then on
   it's Studio's sign-in. */
app.post("/api/auth/link", async (req, res) => {
  try {
    const account = await coachAccount(req);
    if (!account) return res.status(401).json({ error: "Not signed in", code: "not_signed_in" });
    const { email, password } = req.body || {};
    if (slowDown(req, res, email)) return;
    const out = await studioLogin(req, res, { email, password, remember: true });
    if (!out.ok) {
      for (const k of tryKeys(req, email)) accounts.counted(k);
      return res.status(out.status).json(out.json);
    }
    await accounts.link(account, out.json.user);
    res.append("Set-Cookie", clearCookie(accounts.COOKIE));
    res.json({ ...out.json, linked: true });
  } catch (err) {
    unreachable(res, "POST /auth/link", err);
  }
});

/* A new Coach account: name, email and password. Not for an email that
   already has one, nor for a Trainability team account, which signs in with
   Studio's password. Signed in at once. */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password, remember } = req.body || {};
    if (slowDown(req, res, email)) return;
    accounts.counted(`ip:${req.ip}`);
    const wrong = accounts.checkSignup({ name, email, password });
    if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
    if (await accounts.accountByEmail(email)) return res.status(409).json({ error: "There's already a Coach account for that email. Log in instead.", code: "account_exists" });
    if (await studioDoor(req, accounts.emailKey(email)) === "password") {
      return res.status(409).json({ error: "That email already has a Trainability account. Log in with it instead.", code: "team_account" });
    }
    const id = await accounts.createAccount({ name, email, password });
    const { token, maxAge } = await accounts.startSession(id, !!remember);
    res.append("Set-Cookie", sessionCookie(req, token, maxAge));
    res.append("Set-Cookie", clearCookie(SESSION_COOKIE));
    res.json({ user: accounts.asUser(await accounts.accountByEmail(email)) });
  } catch (err) {
    console.error(`Sign-up failed: ${err.message}`);
    res.status(500).json({ error: "Your account couldn't be made just now. Try again in a minute.", code: "failed" });
  }
});

app.get("/api/auth/me", async (req, res, next) => {
  try {
    const own = await coachAccount(req);
    if (own) { res.set("Cache-Control", "private, no-store"); return res.json({ user: accounts.asUser(own) }); }
  } catch (err) { console.error(`Coach me failed: ${err.message}`); }
  next();
});

app.post("/api/auth/logout", async (req, res, next) => {
  const token = cookieOf(req, accounts.COOKIE);
  if (!token) return next();
  try { await accounts.endSession(token); } catch (err) { console.error(`Coach logout failed: ${err.message}`); }
  res.append("Set-Cookie", clearCookie(accounts.COOKIE));
  res.json({ ok: true });
});

/* A Coach account's forgotten password, Studio's way (accounts.resetPassword):
   a temporary one emailed, and the same answer whoever asks, so the page
   can't be used to learn who has an account. Any other email is Studio's. */
app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const account = email ? await accounts.accountByEmail(email) : null;
    if (!account) return next();
    const wait = accounts.resetAllowed(req.ip, email);
    if (wait) {
      res.set("Retry-After", String(wait));
      return res.status(429).json({ error: "Too many attempts. Try again in a few minutes.", code: "rate_limited" });
    }
    await accounts.resetPassword(account, process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`);
    res.json({ ok: true, message: "If that email belongs to an account, a temporary password is on its way to it." });
  } catch (err) {
    console.error(`Coach forgot-password failed: ${err.message}`);
    res.status(500).json({ error: "That could not be sent. Try again in a minute.", code: "failed" });
  }
});

/* Choosing their own password (Studio's /api/auth/password): a Coach
   account's here; a Studio account's is relayed to Studio. */
app.post("/api/auth/password", async (req, res, next) => {
  try {
    const token = cookieOf(req, accounts.COOKIE);
    const account = token ? await accounts.accountOfSession(token) : null;
    if (!account) return next();
    const wrong = await accounts.changePassword(account, req.body || {}, token);
    if (wrong) return res.status(wrong.status).json({ error: wrong.error, ...(wrong.code ? { code: wrong.code } : {}) });
    res.json({ ok: true });
  } catch (err) {
    console.error(`Coach password change failed: ${err.message}`);
    res.status(500).json({ error: "Your password couldn't be changed. Try again in a minute.", code: "failed" });
  }
});

/* A Coach account's Accessibility, one route each as Studio's: { user } back.
   A Trainability trainer's goes on to Studio through the relay below. */
for (const [route, key] of [["theme", "theme"], ["tone", "tone"], ["contrast", "contrast"], ["motion", "motion"], ["color", "color"], ["text-size", "textSize"]]) {
  app.post(`/api/auth/${route}`, async (req, res, next) => {
    try {
      const own = await coachAccount(req);
      if (!own) return next();
      if (!await accounts.setLook(own, key, req.body?.[key])) {
        return res.status(400).json({ error: "That is not one of the choices for how a screen looks", code: "invalid", field: key, allowed: accounts.LOOK[key].allowed });
      }
      res.json({ user: accounts.asUser(await accounts.accountOfSession(cookieOf(req, accounts.COOKIE))) });
    } catch (err) {
      console.error(`Coach ${route} failed: ${err.message}`);
      res.status(500).json({ error: "That didn't save. Try again in a minute.", code: "failed" });
    }
  });
}

/**
 * A photo from Studio, at the same address Studio gives it
 * (/api/photos/trainer/<id> or /client/<id>, ?v= the picture's hash), so the
 * links in Studio's answers work here as they are: the trainer's own in the
 * account menu, and their clients' (Glenn, 19 Oct 2026). Fetched with the
 * trainer's Studio session, so Studio decides who may see whose: a client's
 * face only to those who may see the client, answered as missing to anyone
 * else. Cached as Studio caches it: privately, and for good, since a new
 * picture comes with a new link. A Coach account has no Studio session and
 * gets no photos; their initials show instead.
 */
app.get("/api/photos/:kind/:id", async (req, res) => {
  const { kind, id } = req.params;
  if ((kind !== "trainer" && kind !== "client") || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || !studioCookie(req.headers.cookie)) return res.status(404).end();
  const v = typeof req.query.v === "string" ? `?v=${encodeURIComponent(req.query.v.slice(0, 80))}` : "";
  try {
    const cookie = studioCookie(req.headers.cookie);
    const upstream = await fetch(`${STUDIO_ORIGIN}/api/photos/${kind}/${id}${v}`, {
      headers: { Cookie: cookie, "User-Agent": req.headers["user-agent"] || "Trainability Coach", "X-Forwarded-For": req.ip,
        ...(req.headers["if-none-match"] ? { "If-None-Match": req.headers["if-none-match"] } : {}) },
      redirect: "manual", signal: AbortSignal.timeout(15000),
    });
    if (upstream.status === 304) return res.status(304).end();
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.startsWith("image/")) return res.status(404).end();
    res.set({ "Content-Type": type, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    const etag = upstream.headers.get("etag");
    if (etag) res.set("ETag", etag);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error(`Photo from Studio failed: ${err.message}`);
    res.status(404).end();
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
  await equipment.adoptOldAnswers();
  await reviews.load();
  await store.load();
  await refreshStorage({ force: true });
  await books.resume();
  await accounts.sweep();
  setInterval(() => accounts.sweep().catch(() => {}), 6 * 3600 * 1000).unref();
  console.log(`Database: ${db.describe()}`);
} catch (err) {
  console.error(`Database not ready (${db.describe()}): ${err.message}`);
}
app.listen(PORT, () => console.log(`Coach on http://localhost:${PORT}, signing in through ${STUDIO_ORIGIN}`));
