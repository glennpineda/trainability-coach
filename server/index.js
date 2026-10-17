import express from "express";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as billy from "./billy.js";
import * as db from "./db.js";
import * as equipment from "./equipment.js";
import * as limitations from "./limitations.js";
import * as library from "./library.js";
import * as reviews from "./reviews.js";
import { chooseStorage, refreshStorage, storageState } from "./durable-home.js";
import { FLAGS, JOINTS } from "./coach-iq.js";

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
  res.json(await equipment.equipmentOf(user.id));
}));

app.patch("/api/places/:place", asSignedIn("PATCH /places", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const wrong = equipment.checkPlaceName(req.body?.name);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.renamePlace(user.id, req.params.place, req.body.name);
  res.json(await equipment.equipmentOf(user.id));
}));

app.delete("/api/places/:place", asSignedIn("DELETE /places", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  if (!await equipment.archivePlace(user.id, req.params.place)) {
    return res.status(400).json({ error: "Keep at least one place.", code: "last_place" });
  }
  res.json(await equipment.equipmentOf(user.id));
}));

app.put("/api/places/:place/categories/:key", asSignedIn("PUT /places/categories", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const has = req.body?.has;
  if (!equipment.isCategory(req.params.key)) return res.status(404).json({ error: "Not found", code: "not_found" });
  if (has !== true && has !== false && has !== null) return res.status(400).json({ error: "Say yes, no, or not answered.", code: "invalid" });
  await equipment.setCategory(user.id, req.params.place, req.params.key, has);
  res.json(await equipment.equipmentOf(user.id));
}));

app.post("/api/places/:place/items", asSignedIn("POST /places/items", async (req, res, user) => {
  if (!await ownPlace(req, res, user)) return;
  const wrong = equipment.checkItem(req.body);
  if (wrong) return res.status(400).json({ error: wrong, code: "invalid" });
  await equipment.setItem(user.id, req.params.place, req.body);
  res.json(await equipment.equipmentOf(user.id));
}));

app.delete("/api/equipment/items/:id", asSignedIn("DELETE /equipment/items", async (req, res, user) => {
  await equipment.removeItem(user.id, req.params.id);
  res.json(await equipment.equipmentOf(user.id));
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

/* Approve, Flag or take back (mark "clear"), with a comment. */
app.put("/api/coach-iq/review/:kind/:target", asPrimary("PUT /coach-iq/review", async (req, res, user) => {
  const { kind, target } = req.params;
  const known = kind === "exercise" ? library.isExercise(target) : kind === "condition" ? limitations.isCondition(target) : false;
  if (!known) return res.status(404).json({ error: "Not found", code: "not_found" });
  const { mark, comment = "" } = req.body || {};
  if (!reviews.MARKS.includes(mark)) return res.status(400).json({ error: "Approve, flag, or take it back.", code: "invalid" });
  if (typeof comment !== "string" || comment.length > 1000) return res.status(400).json({ error: "Keep the comment under 1,000 characters.", code: "invalid" });
  if (mark === "flag" && !comment.trim()) return res.status(400).json({ error: "Say what's wrong, so it can be fixed.", code: "invalid" });
  await reviews.setMark(kind, target, { mark, comment }, user);
  res.json({ mark: reviews.markOf(kind, target) });
}));

/* Every mark that counts, as a file to write into the library with
   `npm run iq -- --apply <file>` (Glenn: "App now, file later"). */
app.get("/api/coach-iq/review/export", asPrimary("GET /coach-iq/review/export", async (_req, res) => {
  res.set("Content-Disposition", `attachment; filename="coach-iq-reviews-${new Date().toISOString().slice(0, 10)}.json"`);
  res.json({ exported: new Date().toISOString(), marks: reviews.exportMarks() });
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
  try {
    const out = await billy.answer(user, history, {
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
  await refreshStorage({ force: true });
  console.log(`Database: ${db.describe()}`);
} catch (err) {
  console.error(`Database not ready (${db.describe()}): ${err.message}`);
}
app.listen(PORT, () => console.log(`Coach on http://localhost:${PORT}, signing in through ${STUDIO_ORIGIN}`));
