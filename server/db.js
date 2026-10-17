import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

/**
 * Coach's own database: one interface, two backends, as in Studio
 * (server/db.js there, which this follows).
 *
 *   MySQL / MariaDB — on the host. GoDaddy gives each app a database of its
 *            own and names it with DB_HOST, DB_PORT, DB_NAME, DB_USER and
 *            DB_PASSWORD; Coach's is new and holds nothing of Studio's
 *            (Glenn, 16 Oct 2026).
 *   SQLite — everywhere else: a file next to this module, built into Node, so
 *            a Mac or a cloud session with none of those set never reaches
 *            the live one.
 *
 * Every table is named `coach_…`, so none can be taken for Studio's. The SQL is
 * written to run on both: ids made in code, VARCHAR keys, timestamps set
 * explicitly, and no upsert syntax (`save` reads, then inserts or updates).
 */

const DIR = path.dirname(fileURLToPath(import.meta.url));
const env = {
  host: () => process.env.DB_HOST,
  port: () => Number(process.env.DB_PORT) || 3306,
  user: () => process.env.DB_USER,
  password: () => process.env.DB_PASSWORD,
  database: () => process.env.DB_NAME,
};

export const dialect = () => (env.host() ? "mysql" : "sqlite");
const sqlitePath = () => process.env.COACH_SQLITE_PATH || path.join(DIR, "coach.sqlite");

/** Where it points, with no secret in it, for the log and /api/health. */
export function describe() {
  return dialect() === "mysql"
    ? `mysql ${env.user()}@${env.host()}:${env.port()}/${env.database()}${process.env.DB_SSL ? " (TLS)" : ""}`
    : `sqlite ${sqlitePath()}`;
}

let pool = null;
async function mysql() {
  if (pool) return pool;
  const m = await import("mysql2/promise");
  /* DB_SSL=true where the server asks for TLS (a MySQL 8.4 account will):
     Studio's db.js has the long story. */
  const ssl = process.env.DB_SSL && !/^(false|off)$/i.test(process.env.DB_SSL) ? {} : undefined;
  pool = m.default.createPool({
    host: env.host(), port: env.port(), user: env.user(), password: env.password(), database: env.database(),
    waitForConnections: true, connectionLimit: 5, timezone: "Z", ...(ssl ? { ssl } : {}),
  });
  return pool;
}

let sqlite = null;
function lite() {
  if (!sqlite) {
    sqlite = new DatabaseSync(sqlitePath());
    sqlite.exec("PRAGMA journal_mode = WAL");
  }
  return sqlite;
}

/** Rows for a SELECT. */
export async function all(sql, params = []) {
  if (dialect() === "mysql") return (await (await mysql()).query(sql, params))[0];
  return lite().prepare(sql).all(...params);
}

/** The first row, or null. */
export async function get(sql, params = []) {
  return (await all(sql, params))[0] ?? null;
}

/** INSERT, UPDATE, DELETE. */
export async function run(sql, params = []) {
  if (dialect() === "mysql") return (await (await mysql()).query(sql, params))[0];
  return lite().prepare(sql).run(...params);
}

/**
 * The tables, made if missing, on every start. Adding a table is adding a
 * statement here; a change to an existing one will want a step of its own.
 */
const SCHEMA = [
  /* A trainer's personal memory, its first part: their equipment (Glenn,
     16 Oct 2026, coach-iq/README.md). `kind` is "category" for the short
     checklist (dumbbells, machines …) and "item" for a particular piece a
     program asked about (a low row machine). `has` is 1 or 0; a category
     nobody has answered has no row. `source` says who wrote it down: the
     trainer on the page, or Billy from what they told him. */
  `CREATE TABLE IF NOT EXISTS coach_equipment (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    name_key VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    has INTEGER NOT NULL,
    where_note VARCHAR(200) NOT NULL DEFAULT '',
    source VARCHAR(16) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    UNIQUE (trainer_id, kind, name_key)
  )`,
  /* Places inside a trainer's memory (ideas audit, 18), and their equipment
     answers, which replace coach_equipment above: its rows are moved into
     each trainer's first place on start (equipment.js, adoptOldAnswers) and
     it is otherwise left alone. */
  `CREATE TABLE IF NOT EXISTS coach_places (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    name VARCHAR(80) NOT NULL,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coach_place_equipment (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    place_id VARCHAR(40) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    name_key VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(40) NOT NULL,
    piece_key VARCHAR(40) NOT NULL DEFAULT '',
    has INTEGER NOT NULL,
    note VARCHAR(200) NOT NULL DEFAULT '',
    source VARCHAR(16) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    UNIQUE (place_id, kind, name_key)
  )`,
  /* Every change to an answer, so a correction is never a loss (ideas
     audit, 20). has is 1, 0, or -1 for taken back. */
  `CREATE TABLE IF NOT EXISTS coach_equipment_history (
    equipment_id VARCHAR(40) NOT NULL,
    changed_at VARCHAR(32) NOT NULL,
    has INTEGER NOT NULL,
    source VARCHAR(16) NOT NULL
  )`,
  /* A client's limitations, as their trainer wrote them (ideas audit, 22):
     plain everyday words, never a diagnosis, tied to Coach IQ's conditions
     and facts; seen by all of the client's trainers, deleted only by the one
     who wrote it. conditions, facts and joints are JSON lists. */
  `CREATE TABLE IF NOT EXISTS coach_limitations (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    text VARCHAR(300) NOT NULL,
    conditions VARCHAR(400) NOT NULL DEFAULT '[]',
    facts VARCHAR(400) NOT NULL DEFAULT '[]',
    joints VARCHAR(200) NOT NULL DEFAULT '[]',
    written_by VARCHAR(64) NOT NULL,
    written_by_name VARCHAR(120) NOT NULL,
    created_at VARCHAR(32) NOT NULL
  )`,
  /* A trainer's own names for exercises (ideas audit, 3): exercise_id is a
     library version or one of their private exercises, or '' for a name
     still to sort out. source is "trainer" or "billy", as for equipment. */
  `CREATE TABLE IF NOT EXISTS coach_own_names (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    name_key VARCHAR(120) NOT NULL,
    exercise_id VARCHAR(40) NOT NULL DEFAULT '',
    source VARCHAR(16) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    UNIQUE (trainer_id, name_key)
  )`,
  /* A trainer's private exercises, for what the library doesn't have (ideas
     audit, 3): exr… ids like the library's, so one can join it unchanged.
     needs and primary_muscles are JSON lists; suggested_at is set when the
     trainer suggests it for the shared library. Archived, never deleted. */
  `CREATE TABLE IF NOT EXISTS coach_private_exercises (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    family_id VARCHAR(40) NOT NULL DEFAULT '',
    needs VARCHAR(400) NOT NULL DEFAULT '[]',
    primary_muscles VARCHAR(400) NOT NULL DEFAULT '[]',
    note VARCHAR(300) NOT NULL DEFAULT '',
    suggested_at VARCHAR(32) NULL,
    suggest_note VARCHAR(300) NOT NULL DEFAULT '',
    suggested_by_name VARCHAR(120) NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(32) NOT NULL
  )`,
  /* The Primary Master's review of Coach IQ (ideas audit, 24): a mark on one
     exercise version (kind "exercise", an exr… id) or one condition (kind
     "condition", its key). mark is "approve", "flag", or "clear" for taken
     back. Every mark is kept; the latest for a target is the one that
     counts, so the rows are its history too. In the app at once; written
     into the library's files when they are next committed (Glenn, 17 Oct
     2026: "App now, file later"). */
  `CREATE TABLE IF NOT EXISTS coach_iq_reviews (
    id VARCHAR(40) PRIMARY KEY,
    kind VARCHAR(16) NOT NULL,
    target VARCHAR(40) NOT NULL,
    mark VARCHAR(16) NOT NULL,
    comment VARCHAR(1000) NOT NULL DEFAULT '',
    reviewer_id VARCHAR(64) NOT NULL,
    reviewer_name VARCHAR(120) NOT NULL,
    created_at VARCHAR(32) NOT NULL
  )`,
];

export async function migrate() {
  for (const sql of SCHEMA) await run(sql);
}
