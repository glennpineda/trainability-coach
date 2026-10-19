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
 * statement here; a column added to a table already live goes in COLUMNS
 * below instead.
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
  /* Coach IQ's library itself, once it lives in the app (iq-store.js; Glenn,
     17 Oct 2026). Each family (kind "family", its exf… id), version ("exercise",
     its exr… id) and condition ("condition", its key) is one row, its data the
     same JSON as in coach-iq/exercises.json and conditions.json, which load
     it the first time and stay as its starting copy; pos keeps the files'
     order, new rows going last. */
  `CREATE TABLE IF NOT EXISTS coach_iq_docs (
    kind VARCHAR(16) NOT NULL,
    id VARCHAR(40) NOT NULL,
    pos INTEGER NOT NULL DEFAULT 0,
    data MEDIUMTEXT NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    PRIMARY KEY (kind, id)
  )`,
  /* Every change to the library (lih…, Glenn's tag): what each row it
     touched was before and after, as JSON, who and when. A change made by
     undoing another names it in undoes; the one undone names its undoer. */
  `CREATE TABLE IF NOT EXISTS coach_iq_history (
    id VARCHAR(40) PRIMARY KEY,
    summary VARCHAR(300) NOT NULL,
    changes MEDIUMTEXT NOT NULL,
    changed_by VARCHAR(64) NOT NULL,
    changed_by_name VARCHAR(120) NOT NULL,
    changed_at VARCHAR(32) NOT NULL,
    undoes VARCHAR(40) NOT NULL DEFAULT '',
    undone_by VARCHAR(40) NOT NULL DEFAULT ''
  )`,
  /* A book read into Coach IQ in the app (books.js; iqb…, Glenn's tag, 17
     Oct 2026). The PDF waits in the files folder while it is read and is
     thrown away once it has been; what is kept is ours: notes in our own
     words (one per part, JSON), what the book is (about), and the proposed
     changes to the principles, each with its open points, answers and fate
     (proposals). status: waiting, reading, ready, done, failed or
     discarded; step says what it is doing now. */
  `CREATE TABLE IF NOT EXISTS coach_iq_books (
    id VARCHAR(40) PRIMARY KEY,
    file_name VARCHAR(200) NOT NULL,
    bytes INTEGER NOT NULL DEFAULT 0,
    pages INTEGER NOT NULL DEFAULT 0,
    parts INTEGER NOT NULL DEFAULT 0,
    parts_done INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL,
    step VARCHAR(200) NOT NULL DEFAULT '',
    error VARCHAR(500) NOT NULL DEFAULT '',
    about MEDIUMTEXT NOT NULL,
    notes MEDIUMTEXT NOT NULL,
    proposals MEDIUMTEXT NOT NULL,
    model VARCHAR(64) NOT NULL DEFAULT '',
    tokens_in INTEGER NOT NULL DEFAULT 0,
    tokens_out INTEGER NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(64) NOT NULL,
    uploaded_by_name VARCHAR(120) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    finished_at VARCHAR(32) NULL
  )`,
  /* The program designer (programs.js; Glenn, 17 Oct 2026: "Go"). A program
     (prg…) is one trainer's, for one client of theirs at one of their places,
     seen by nobody else (Glenn: "Only the trainer who wrote it"); its days
     (prd…) and each day's exercises (pre…) are kept in order by pos. On an
     exercise only the exercise is needed (Glenn: "what exercise to do is the
     most important part"); sets, reps, load, effort, tempo, rest (seconds)
     and a note are all optional. superset 1 means done together with the
     one above. client_name is kept for the list and the printed page. */
  `CREATE TABLE IF NOT EXISTS coach_programs (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(200) NOT NULL DEFAULT '',
    place_id VARCHAR(40) NOT NULL DEFAULT '',
    name VARCHAR(120) NOT NULL,
    goal VARCHAR(24) NOT NULL,
    level VARCHAR(16) NOT NULL,
    notes VARCHAR(2000) NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coach_program_days (
    id VARCHAR(40) PRIMARY KEY,
    program_id VARCHAR(40) NOT NULL,
    name VARCHAR(80) NOT NULL,
    notes VARCHAR(1000) NOT NULL DEFAULT '',
    pos INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS coach_program_exercises (
    id VARCHAR(40) PRIMARY KEY,
    program_id VARCHAR(40) NOT NULL,
    day_id VARCHAR(40) NOT NULL,
    exercise_id VARCHAR(40) NOT NULL,
    pos INTEGER NOT NULL DEFAULT 0,
    superset INTEGER NOT NULL DEFAULT 0,
    sets VARCHAR(20) NOT NULL DEFAULT '',
    reps VARCHAR(40) NOT NULL DEFAULT '',
    load_text VARCHAR(60) NOT NULL DEFAULT '',
    effort VARCHAR(60) NOT NULL DEFAULT '',
    tempo VARCHAR(20) NOT NULL DEFAULT '',
    rest_seconds INTEGER NULL,
    note VARCHAR(300) NOT NULL DEFAULT ''
  )`,
  /* A trainer's own settings, by name (trainer-settings.js): so far their
     units, "imperial" or "metric" (Glenn, 17 Oct 2026). One row per trainer
     and name, so no id of its own. */
  `CREATE TABLE IF NOT EXISTS coach_trainer_settings (
    trainer_id VARCHAR(64) NOT NULL,
    name VARCHAR(64) NOT NULL,
    value VARCHAR(200) NOT NULL,
    updated_at VARCHAR(32) NOT NULL,
    PRIMARY KEY (trainer_id, name)
  )`,
  /* Settings for this installation, by name (settings.js): so far, where
     files are saved (durable-home.js). */
  `CREATE TABLE IF NOT EXISTS coach_settings (
    name VARCHAR(64) PRIMARY KEY,
    value VARCHAR(1000) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  /* Coach's own accounts (accounts.js; Glenn, 18 Oct 2026: "anyone creating
     an account at Coach stores it on Coach's db, and if they have an account
     on Studio, it's just linked"), for trainers who aren't on Trainability's
     team. Ids are usr…, Glenn's tag, the same as Studio's users. email is
     kept lowercase. password_hash is Studio's scrypt form. */
  `CREATE TABLE IF NOT EXISTS coach_accounts (
    id VARCHAR(40) PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    last_login_at VARCHAR(32) NULL,
    UNIQUE (email)
  )`,
  /* A Coach account's clients (coach-clients.js; stage two, Glenn, 18 Oct
     2026), kept here because they aren't Trainability's. Ids are cli…, Glenn's
     tag, the same as Studio's clients. Studio's four (names, email, phone)
     must be there; email kept as typed, matched lowercase. */
  `CREATE TABLE IF NOT EXISTS coach_clients (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(40) NOT NULL,
    first_name VARCHAR(90) NOT NULL,
    last_name VARCHAR(90) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    date_of_birth VARCHAR(10) NOT NULL DEFAULT '',
    gender VARCHAR(40) NOT NULL DEFAULT '',
    pronouns VARCHAR(30) NOT NULL DEFAULT '',
    archived INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  /* A Coach account signed in on one device: a random token in the browser's
     cx_session cookie, only its SHA-256 kept here, so a copy of this table
     signs nobody in. */
  /* Messages (server/messages.js; Glenn, 18 Oct 2026). Messages sent from
     Coach are kept in Coach; Studio's client page reads them through the
     client link. One trainer and one client to a conversation for now (the
     id is its own so more can join one day). `*_read_at` is when each side
     last read it; `notified_at` when the client was last emailed about it. */
  /* Notifications on a device (server/push.js; Glenn, 18 Oct 2026), Studio's
     push_subscriptions: one row per trainer and browser, kept by the
     endpoint's hash and the trainer together, so a row needs no id of its
     own. kinds is a comma list of what the device is told about. */
  `CREATE TABLE IF NOT EXISTS coach_push_subscriptions (
    endpoint_hash VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    endpoint VARCHAR(1024) NOT NULL,
    p256dh VARCHAR(255) NOT NULL,
    auth VARCHAR(255) NOT NULL,
    kinds VARCHAR(255) NOT NULL DEFAULT '',
    user_agent VARCHAR(255) NULL,
    created_at VARCHAR(32) NOT NULL,
    last_ok_at VARCHAR(32) NULL,
    failures INTEGER NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    PRIMARY KEY (endpoint_hash, user_id)
  )`,
  /* A client's body measurements (server/measurements.js; Glenn, 18 Oct
     2026), one row per day taken, in kg, % and cm, each optional; seen by
     all the client's trainers, changed only by the one who took them. */
  `CREATE TABLE IF NOT EXISTS coach_measurements (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    trainer_id VARCHAR(64) NOT NULL,
    trainer_name VARCHAR(120) NOT NULL DEFAULT '',
    taken_on VARCHAR(10) NOT NULL,
    weight REAL NULL, body_fat REAL NULL, neck REAL NULL, chest REAL NULL, waist REAL NULL, hips REAL NULL,
    arm_l REAL NULL, arm_r REAL NULL, thigh_l REAL NULL, thigh_r REAL NULL, calf_l REAL NULL, calf_r REAL NULL,
    note VARCHAR(1000) NOT NULL DEFAULT '',
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  /* A client's fitness test results (server/fitness-tests.js; Glenn, 18 Oct
     2026): kind step, rockport or vo2; what was entered as JSON in `data`;
     the result worked out (heart rate, or VO2 max) and the step test's
     rating, with the age and table (sex) it was worked out with. */
  `CREATE TABLE IF NOT EXISTS coach_fitness_tests (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    trainer_id VARCHAR(64) NOT NULL,
    trainer_name VARCHAR(120) NOT NULL DEFAULT '',
    kind VARCHAR(16) NOT NULL,
    taken_on VARCHAR(10) NOT NULL,
    age INTEGER NULL,
    sex VARCHAR(8) NOT NULL DEFAULT '',
    data VARCHAR(1000) NOT NULL DEFAULT '{}',
    result REAL NULL,
    rating VARCHAR(24) NULL,
    rating_ages VARCHAR(12) NULL,
    note VARCHAR(1000) NOT NULL DEFAULT '',
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  /* A client's progress photos (server/progress-photos.js; Glenn, 19 Oct
     2026): one row per day's set, its pictures files in the files folder
     (progress/<id>-<angle>.jpg), `angles` the ones taken. */
  `CREATE TABLE IF NOT EXISTS coach_progress_photos (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(64) NOT NULL,
    trainer_id VARCHAR(64) NOT NULL,
    trainer_name VARCHAR(120) NOT NULL DEFAULT '',
    taken_on VARCHAR(10) NOT NULL,
    angles VARCHAR(64) NOT NULL DEFAULT '',
    note VARCHAR(1000) NOT NULL DEFAULT '',
    created_at VARCHAR(32) NOT NULL,
    updated_at VARCHAR(32) NOT NULL
  )`,
  /* That a client agreed to progress photos being kept ("Trainers, with a
     client opt-in"), recorded once by one of their trainers. */
  `CREATE TABLE IF NOT EXISTS coach_photo_consent (
    client_id VARCHAR(64) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    trainer_name VARCHAR(120) NOT NULL DEFAULT '',
    agreed_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coach_conversations (
    id VARCHAR(40) PRIMARY KEY,
    trainer_id VARCHAR(64) NOT NULL,
    trainer_name VARCHAR(120) NOT NULL DEFAULT '',
    client_id VARCHAR(64) NOT NULL,
    client_name VARCHAR(200) NOT NULL DEFAULT '',
    created_at VARCHAR(32) NOT NULL,
    last_at VARCHAR(32) NOT NULL,
    trainer_read_at VARCHAR(32) NULL,
    client_read_at VARCHAR(32) NULL,
    notified_at VARCHAR(32) NULL
  )`,
  /* author_kind is "trainer" or "client". */
  `CREATE TABLE IF NOT EXISTS coach_messages (
    id VARCHAR(40) PRIMARY KEY,
    conversation_id VARCHAR(40) NOT NULL,
    author_kind VARCHAR(16) NOT NULL,
    author_id VARCHAR(64) NOT NULL,
    author_name VARCHAR(120) NOT NULL DEFAULT '',
    text VARCHAR(4000) NOT NULL DEFAULT '',
    created_at VARCHAR(32) NOT NULL
  )`,
  /* kind: picture, video or program (measurements to come). A picture or a
     video is a file in the files folder (messages/<id>); a program is a copy
     of it as it was sent, in `data` (JSON). message_id is empty while the
     attachment waits in the composer; owner_id is whoever uploaded it. */
  `CREATE TABLE IF NOT EXISTS coach_attachments (
    id VARCHAR(40) PRIMARY KEY,
    message_id VARCHAR(40) NOT NULL DEFAULT '',
    owner_id VARCHAR(64) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    name VARCHAR(200) NOT NULL DEFAULT '',
    mime VARCHAR(60) NOT NULL DEFAULT '',
    bytes INTEGER NOT NULL DEFAULT 0,
    width INTEGER NULL,
    height INTEGER NULL,
    still MEDIUMTEXT NULL,
    data MEDIUMTEXT NULL,
    created_at VARCHAR(32) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS coach_sessions (
    token_hash VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(40) NOT NULL,
    created_at VARCHAR(32) NOT NULL,
    expires_at VARCHAR(32) NOT NULL
  )`,
];

/*
 * Columns added to a table after it first went live, which CREATE TABLE IF
 * NOT EXISTS can't add: each is added once, where it is missing. Newest last.
 */
const COLUMNS = [
  /* The library entry a trainer's suggested exercise became (build 1.0.12). */
  ["coach_private_exercises", "accepted_into", "VARCHAR(40) NOT NULL DEFAULT ''"],
  /* What kind of program, asked before it is made (build 1.0.25; Glenn, 17
     Oct 2026: "ask what kind of program they are think of creating"): its
     kind (programs.js, KINDS), the days a week and the session's minutes
     asked, the areas to focus on (JSON list), and what each day trains. */
  ["coach_programs", "kind", "VARCHAR(24) NOT NULL DEFAULT 'full'"],
  ["coach_programs", "days_per_week", "INTEGER NULL"],
  ["coach_programs", "minutes", "INTEGER NULL"],
  ["coach_programs", "focus", "VARCHAR(200) NOT NULL DEFAULT '[]'"],
  ["coach_program_days", "kind", "VARCHAR(16) NOT NULL DEFAULT 'full'"],
  /* A place that is one of Studio's (build 1.0.34; Glenn, 18 Oct 2026: "if
     the trainer is connected to a place in Studio, let's get that
     information from Studio as well"): Studio's id for it, and 1 while it is
     the trainer's place in Studio (their default place), so its name
     follows Studio's and it can't be renamed or removed here. */
  ["coach_places", "studio_place_id", "VARCHAR(64) NOT NULL DEFAULT ''"],
  ["coach_places", "from_studio", "INTEGER NOT NULL DEFAULT 0"],
  /* A Coach account joined to a Studio account (accounts.js, link; stage
     three, Glenn, 18 Oct 2026): Studio's user id, and when. Linked, it signs
     in with Studio's password and its data is that Studio user's. */
  ["coach_accounts", "studio_user_id", "VARCHAR(64) NOT NULL DEFAULT ''"],
  ["coach_accounts", "linked_at", "VARCHAR(32) NULL"],
  /* Signed in with a temporary password (stage four, as Studio's
     must_change_password): they choose their own before anything else. */
  ["coach_accounts", "must_change_password", "INTEGER NOT NULL DEFAULT 0"],
  /* A Coach account's Accessibility (accounts.js, setLook), Studio's six on
     its users, with its values; a Trainability trainer's are Studio's own. */
  ["coach_accounts", "theme", "VARCHAR(8) NOT NULL DEFAULT 'system'"],
  ["coach_accounts", "tone", "VARCHAR(8) NOT NULL DEFAULT ''"],
  ["coach_accounts", "contrast", "VARCHAR(8) NOT NULL DEFAULT 'system'"],
  ["coach_accounts", "motion", "VARCHAR(8) NOT NULL DEFAULT 'system'"],
  ["coach_accounts", "color", "VARCHAR(8) NOT NULL DEFAULT 'full'"],
  ["coach_accounts", "text_size", "VARCHAR(8) NOT NULL DEFAULT 'medium'"],
  /* Wide screen, as Studio's users.wide_screen (Glenn, 19 Oct 2026). */
  ["coach_accounts", "wide_screen", "INTEGER NOT NULL DEFAULT 0"],
  /* Whose a program, measurements, a test or photos on an attachment are, so
     it can only be sent to that client (Run 1, A-1); empty on a picture or a
     video, which may go to anybody. */
  ["coach_attachments", "client_id", "VARCHAR(64) NOT NULL DEFAULT ''"],
  /* The angles a progress photo set has a small copy of (<id>-<angle>.t.jpg; Run 1, O-8). */
  ["coach_progress_photos", "thumbs", "VARCHAR(40) NOT NULL DEFAULT ''"],
  /* An exercise's technique beyond straight sets: drop, pyramid-up,
     pyramid-down or pyramid-double, and a drop set's number of drops
     (src/lib/techniques.js; Glenn, 19 Oct 2026). */
  ["coach_program_exercises", "technique", "VARCHAR(16) NOT NULL DEFAULT ''"],
  ["coach_program_exercises", "drops", "INTEGER NULL"],
  /* Measurements' later four (Glenn, 18 Oct 2026: "shoulder to the
     measurements too, … heart rate (optional), blood pressure (optional)"):
     cm, bpm and mmHg. */
  ["coach_measurements", "shoulders", "REAL NULL"],
  ["coach_measurements", "heart_rate", "REAL NULL"],
  ["coach_measurements", "bp_sys", "REAL NULL"],
  ["coach_measurements", "bp_dia", "REAL NULL"],
];

/*
 * Indexes on what the app looks things up by (Run 1, O-1 and O-2): the
 * schema had only primary keys and UNIQUEs, so every list of a client's
 * measurements, a program's days or a conversation's messages read the whole
 * table. With 12,000 messages the Messages list took 1.3 to 2.2 seconds;
 * with these, about 7 ms. Added where missing on start, like COLUMNS.
 */
const INDEXES = [
  ["coach_messages", ["conversation_id", "created_at"]],
  ["coach_attachments", ["message_id"]],
  ["coach_conversations", ["trainer_id", "client_id"]],
  ["coach_conversations", ["client_id"]],
  ["coach_measurements", ["client_id"]],
  ["coach_fitness_tests", ["client_id"]],
  ["coach_progress_photos", ["client_id"]],
  ["coach_limitations", ["client_id"]],
  ["coach_programs", ["trainer_id", "client_id"]],
  ["coach_program_days", ["program_id"]],
  ["coach_program_exercises", ["program_id"]],
  ["coach_program_exercises", ["day_id"]],
  ["coach_clients", ["trainer_id"]],
  ["coach_sessions", ["account_id"]],
  ["coach_places", ["trainer_id"]],
  ["coach_place_equipment", ["trainer_id"]],
  ["coach_place_equipment", ["place_id"]],
  ["coach_private_exercises", ["trainer_id"]],
  ["coach_own_names", ["trainer_id"]],
  ["coach_push_subscriptions", ["user_id"]],
];
const indexName = (table, cols) => `ix_${table.replace(/^coach_/, "")}_${cols.join("_")}`;

async function hasIndex(table, name) {
  if (dialect() === "mysql") {
    return !!(await get(`SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`, [table, name]));
  }
  return (await all(`PRAGMA index_list(${table})`)).some(i => i.name === name);
}

async function hasColumn(table, column) {
  if (dialect() === "mysql") {
    return !!(await get(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column]));
  }
  return (await all(`PRAGMA table_info(${table})`)).some(c => c.name === column);
}

export async function migrate() {
  for (const sql of SCHEMA) await run(sql);
  for (const [table, column, definition] of COLUMNS) {
    if (!await hasColumn(table, column)) await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  for (const [table, cols] of INDEXES) {
    const name = indexName(table, cols);
    if (!await hasIndex(table, name)) await run(`CREATE INDEX ${name} ON ${table} (${cols.join(", ")})`);
  }
}
