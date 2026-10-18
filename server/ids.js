/**
 * Record ids, as Studio makes them (its server/db.js): a 3-letter tag for the
 * kind of record, then 3 digits, 3 letters, 3 digits, all lowercase:
 * exr123abc456.
 *
 * The tags are Glenn's to choose, and this is the whole list. Never invent
 * one: a new kind of record means asking him first. None may be one of
 * Studio's own (usr, cli, plc, apt …), so an id says which app it is from.
 */
export const PREFIX = {
  /* Glenn's tags, 16 Oct 2026. */
  exercise: "exr",       // one version in the exercise library; a trainer's private exercise too
  family: "exf",         // an exercise family: a movement, such as Squat
  equipment: "eqp",      // one of a trainer's equipment answers
  ownName: "exx",        // a trainer's own name for an exercise
  place: "tpl",          // a trainer's own place: the studio, a client's home
  limitation: "lim",     // a client's limitation, as their trainer wrote it
  /* Glenn's tag, 17 Oct 2026. */
  review: "iqr",         // the Primary Master's mark on Coach IQ: approve or flag, with a comment
  libraryHistory: "lih", // one change to the library, which lives in the app
  book: "iqb",           // a book read into Coach IQ in the app (Glenn, 17 Oct 2026)
  program: "prg",        // a trainer's program for one client (Glenn, 17 Oct 2026)
  programDay: "prd",     // one day of a program: Day A, Monday …
  programExercise: "pre", // one exercise on a day, with whatever the trainer set for it
  /* Glenn's tag, 18 Oct 2026: the same as Studio's users. */
  account: "usr",        // a Coach account, for a trainer who isn't on Trainability's team
  client: "cli",         // a Coach account's client (the same as Studio's clients)
  /* Glenn's tags, 18 Oct 2026 (Messages). */
  conversation: "cnv",   // a conversation: a trainer and a client, more people one day
  message: "msg",        // one message in a conversation
  attachment: "att",     // a picture, video, program (or, later, measurements) on a message
};

const DIGITS = "0123456789";
const LETTERS = "abcdefghijklmnopqrstuvwxyz";
const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");

export function newId(kind) {
  const prefix = PREFIX[kind];
  if (!prefix) throw new Error(`No id tag for "${kind}": ask Glenn for one before inventing it`);
  return prefix + pick(DIGITS, 3) + pick(LETTERS, 3) + pick(DIGITS, 3);
}

/** Whether an id has the right shape for its kind. */
export const isId = (kind, id) => new RegExp(`^${PREFIX[kind]}\\d{3}[a-z]{3}\\d{3}$`).test(String(id || ""));

/**
 * An insert with a new id, tried again on the rare clash: about 17.6 billion
 * ids per kind is a real birthday risk past ~50,000 rows, so the primary key
 * enforces it and this retries (Studio's `insertWithNewId`).
 */
export async function insertWithNewId(kind, insert) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newId(kind);
    try {
      await insert(id);
      return id;
    } catch (err) {
      const clash = err?.code === "ER_DUP_ENTRY" || /UNIQUE constraint failed|Duplicate entry/i.test(err?.message || "");
      if (!clash || attempt === 2) throw err;
    }
  }
  throw new Error("No free id");
}
