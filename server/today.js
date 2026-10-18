/*
 * The trainer's day, and their next 7 days, from Studio's schedule (Glenn,
 * 18 Oct 2026: "Let's do the Today tab"). Copied from Studio's Today tab
 * (src/tabs/TodayTab.jsx): the same two lists, the same order and the same
 * flags on a client's row — their first session, new (their first three with
 * this trainer), and nothing booked after this one. Studio's money, cards and
 * session counts stay in Studio. Coach adds what it knows: the client's
 * current program and how many limitations are written for them.
 *
 * Read only: Coach books, moves and cancels nothing.
 */

const DAYS = 7;
const NEW_UNTIL = 3;   // a client's first three sessions with a trainer, as Studio counts them

/** An ISO day `n` days on. */
export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const byTime = (a, b) => a.date.localeCompare(b.date) || a.start - b.start;
const going = (a) => a.status !== "cancelled";

/* "Place · Room", as Studio's whereLabel writes it. */
function whereOf(locations = {}) {
  const rooms = new Map((locations.studios || []).map(s => [s.id, s]));
  const places = new Map((locations.places || []).map(p => [p.id, p]));
  return (roomId) => {
    const s = rooms.get(roomId);
    if (!s) return "";
    const p = places.get(s.placeId);
    return p ? `${p.name} · ${s.name}` : s.name;
  };
}

/**
 * The rows for `today` and the six days after it.
 *
 * `appointments` is Studio's whole schedule as this account sees it; only the
 * trainer's own are kept. `clients` is their list (myClients), `programs`
 * their programs (programs.list), `limits` a Map of client id → how many
 * limitations are written for them.
 */
export function todayOf({ today, trainerId, appointments = [], locations, clients = [], programs = [], limits = new Map() }) {
  const mine = appointments.filter(a => a.trainerId === trainerId && a.date).sort(byTime);
  const until = addDays(today, DAYS - 1);
  const where = whereOf(locations);
  const clientOf = new Map(clients.map(c => [c.id, c]));
  /* Their current program: the one changed last. */
  const programOf = new Map();
  for (const p of [...programs].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))) {
    if (!programOf.has(p.clientId)) programOf.set(p.clientId, { id: p.id, name: p.name });
  }
  const row = (a) => {
    const c = a.clientId ? clientOf.get(a.clientId) : null;
    const out = {
      id: a.id, date: a.date, start: a.start, duration: a.duration, status: a.status,
      isAssessment: !!a.isAssessment, where: where(a.studioId),
      client: c ? { id: c.id, firstName: c.firstName, lastName: c.lastName } : null,
      /* Booked with somebody not on this trainer's list (or not a client). */
      private: !a.clientId,
    };
    if (!c || !going(a)) return out;
    const theirs = mine.filter(x => x.clientId === a.clientId && going(x));
    /* Every earlier one still on counts, an assessment too (Studio, Run 11). */
    const before = theirs.filter(x => byTime(x, a) < 0).length;
    return {
      ...out,
      firstSession: before === 0,
      newClient: before > 0 && before < NEW_UNTIL,
      /* Shown until the session is over, which the browser's clock decides. */
      nothingAfter: !theirs.some(x => byTime(x, a) > 0),
      program: programOf.get(c.id) || null,
      limitations: limits.get(c.id) || 0,
    };
  };
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i)).map(date => ({
    date, appointments: mine.filter(a => a.date === date).map(row),
  }));
  /* The next one after today, for a day with nothing in it. */
  const next = mine.find(a => a.date > today && going(a)) || null;
  const nc = next?.clientId ? clientOf.get(next.clientId) : null;
  return {
    days,
    next: next ? { date: next.date, start: next.start, firstName: nc?.firstName || "" } : null,
    until,
  };
}
