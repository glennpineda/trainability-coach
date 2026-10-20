/**
 * A stand-in for Studio's API, for a cloud session, which can't run Studio's
 * fixture (20 Oct 2026, written to take the manual's pictures there): one
 * trainer, fixture-style and never a real person (alex@fixture.test /
 * fixture-pass), six clients, a week of their sessions around today, and two
 * places with their rooms. The answers copy Studio's own shapes (its
 * auth.js publicUser, people.js clientRow, /api/appointments,
 * /api/locations), and a client's Last session is worked out from the
 * sessions as Studio's people.js does: the latest scheduled or completed one
 * on or before today.
 *
 *   node scripts/standin-studio.mjs          (port 4242)
 *   STUDIO_ORIGIN=http://localhost:4242 DB_HOST= COACH_SQLITE_PATH=<scratch> npm run server
 *   SHOT_URL=http://localhost:4800/ SHOT_EMAIL=alex@fixture.test SHOT_PASSWORD=fixture-pass \
 *     CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run screenshots
 *
 * Only what the pictures and Home need; on Glenn's Mac, Studio's fixture
 * stays the real test.
 */
import http from "node:http";
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const TODAY = day(0);
const USER = { id: "usr100tst100", name: "Alex Morgan", email: "alex@fixture.test", role: "trainer", isAdmin: false, isStaff: false, isPrimary: false,
  defaultPlaceId: "plc100tst100", theme: "system", tone: "", contrast: "system", motion: "system", wideScreen: false, color: "full", textSize: "medium", mustChangePassword: false, photoUrl: null };
const PASSWORD = "fixture-pass";
const places = [{ id: "plc100tst100", name: "Trainability Downtown" }, { id: "plc200tst200", name: "Trainability Eastgate" }];
const studios = [{ id: "std1", placeId: "plc100tst100", name: "Studio One" }, { id: "std2", placeId: "plc100tst100", name: "Studio Two" }, { id: "std3", placeId: "plc200tst200", name: "Studio One" }];
const people = [
  ["cl1", "Avery", "Lane", "female"], ["cl2", "Jordan", "Reyes", "male"], ["cl3", "Sam", "Park", "male"],
  ["cl4", "Priya", "Shah", "female"], ["cl5", "Morgan", "Ellis", "nonbinary"], ["cl6", "Casey", "Brooks", "female"],
];
let n = 0;
const appt = (clientId, d, startH, status = "scheduled", studioId = "std1") => ({ id: `apt${++n}`, date: day(d), start: startH * 60, duration: 60, status, trainerId: USER.id, clientId, studioId, isAssessment: false });
const appointments = [
  appt("cl1", -7, 7, "completed"), appt("cl1", -2, 7, "completed"), appt("cl1", 0, 7), appt("cl1", 3, 7),
  appt("cl2", -5, 9, "completed"), appt("cl2", 0, 9, "scheduled", "std2"), appt("cl2", 5, 9),
  appt("cl3", -3, 17, "completed"), appt("cl3", 0, 17, "scheduled", "std3"), appt("cl3", 2, 17, "cancelled"),
  appt("cl4", -10, 12, "completed"), appt("cl4", 1, 12),
  appt("cl5", 4, 18),
];
const clients = people.map(([id, firstName, lastName, gender], i) => {
  const theirs = appointments.filter(a => a.clientId === id && ["scheduled", "completed"].includes(a.status)).map(a => a.date).sort();
  const past = theirs.filter(d => d <= TODAY);
  return { id, firstName, lastName, gender, email: `${firstName.toLowerCase()}@example.test`, phone: `555000${1000 + i}`, pronouns: "", dateOfBirth: `19${80 + i}-0${(i % 9) + 1}-15`,
    trainerIds: [USER.id], archivedBy: [], linkedAt: { [USER.id]: day(-90 - i * 20) }, createdAt: day(-200), homePlaceId: i % 2 ? "plc200tst200" : "plc100tst100", placeIds: [],
    lastSessionOn: past[past.length - 1] || null, latestSessionOn: theirs[theirs.length - 1] || null, photoUrl: null };
});
const signedIn = (req) => /ts_session=standin/.test(req.headers.cookie || "");
http.createServer((req, res) => {
  let body = ""; req.on("data", c => body += c); req.on("end", () => {
    const send = (s, o, h = {}) => { res.writeHead(s, { "Content-Type": "application/json", ...h }); res.end(JSON.stringify(o)); };
    const b = (() => { try { return JSON.parse(body || "{}"); } catch { return {}; } })();
    const url = req.url.split("?")[0];
    if (url === "/api/auth/door") return send(200, b.email === USER.email ? { door: "password", also: false } : { door: "code" });
    if (url === "/api/auth/login") return b.email === USER.email && b.password === PASSWORD
      ? send(200, { user: USER }, { "Set-Cookie": "ts_session=standin; Path=/; HttpOnly; SameSite=Lax" })
      : send(401, { error: "Incorrect email or password", code: "bad_credentials" });
    if (url === "/api/auth/logout") return send(200, { ok: true }, { "Set-Cookie": "ts_session=; Path=/; Max-Age=0" });
    if (!signedIn(req)) return send(401, { error: "Not signed in", code: "unauthenticated" });
    if (url === "/api/auth/me") return send(200, { user: USER });
    if (url.startsWith("/api/auth/")) return send(200, { user: { ...USER, ...b } });
    if (url === "/api/clients") return send(200, { clients });
    if (url === "/api/appointments") return send(200, { appointments, blocks: [] });
    if (url === "/api/locations") return send(200, { places, studios });
    send(404, { error: "Not here" });
  });
}).listen(4242, () => console.log("stand-in Studio on 4242"));
