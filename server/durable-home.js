import os from "node:os";
import path from "node:path";
import { accessSync, constants } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { getSetting, setSetting } from "./settings.js";

/**
 * The folder that outlives a deploy, for whatever Coach keeps on disk: the
 * same rules as Studio's (its server/durable-home.js, which this follows).
 *
 * The host (GoDaddy, where Studio is hosted too) runs the app from `/app`,
 * which is rebuilt on every deploy, and gives it one place that is not:
 * **Private Storage, `/private`** (Glenn, 17 Oct 2026: "the directory where we
 * can save files on the host is /private"). So where the app runs from `/app`
 * and `/private` can be written to, that is the home. Both conditions,
 * because a Mac has a `/private` too (it is where `/tmp` lives) and nothing
 * of ours belongs in it. Anywhere else, the home folder.
 *
 * **Or the folder the Primary Master names** on Installation → Where files
 * are saved, kept in `coach_settings` under `storage_folder`, tried before it
 * is accepted, and used ahead of the automatic choice. `COACH_FILES_DIR` on
 * the host wins over all of it: what the host was told is not something a
 * screen should quietly overrule.
 *
 * Coach's files go in a `trainability-coach` folder inside the home, so a
 * home shared with another app never mixes them. Nothing is saved there yet;
 * reading a book in the app and scanned programs will be the first.
 */
export const HOST_APP = "/app";
export const HOST_PRIVATE = "/private";
export const STORAGE_KEY = "storage_folder";
export const FOLDER = "trainability-coach";
/* What is stored when somebody goes back to the automatic folder. Not an
   empty value: an empty one is what a lost setting looks like, and that is
   put right from memory below rather than read as a decision. */
const AUTOMATIC = "automatic";
const REREAD_MS = 60 * 1000;

function canWrite(dir) {
  try { accessSync(dir, constants.W_OK); return true; } catch { return false; }
}

/** The folder chosen when nobody has named one. */
export function automaticHome({ cwd = process.cwd(), writable = canWrite } = {}) {
  const onHost = cwd === HOST_APP || cwd.startsWith(`${HOST_APP}/`);
  if (onHost && writable(HOST_PRIVATE)) return HOST_PRIVATE;
  return os.homedir() || os.tmpdir();
}

/* The named folder, as this process last read it, so the places that ask
   where a file goes can ask without waiting. */
let chosen = null;
let unusable = null;   // a named folder that could not be written to, when last read
let readAt = 0;

const fixed = () => process.env.COACH_FILES_DIR?.trim() || null;

export function durableHome() {
  return chosen || automaticHome();
}

/** Where Coach's own files go: the host's setting, or the home's Coach folder. */
export const filesDir = () => fixed() || path.join(durableHome(), FOLDER);
export const filePath = (name) => path.join(filesDir(), name);

/**
 * Whether a folder may hold the app's files, and why not: `{ folder }` or
 * `{ error }`. It makes the folder, writes a file in it and takes the file
 * away, because "it exists" is not "this app may write there".
 *
 * Never inside the app's own folder: that is rebuilt on a deploy, and its
 * built page is served to anybody.
 */
export async function checkFolder(given, { cwd = process.cwd() } = {}) {
  const typed = String(given || "").trim();
  if (!typed) return { error: "Type the folder's full path." };
  if (typed.length > 300) return { error: "That path is too long." };
  if (!path.isAbsolute(typed)) return { error: "Give the full path, starting with a slash — /private, not private." };
  const folder = path.resolve(typed);
  if (folder === path.parse(folder).root) return { error: "Not the top of the disk. Name a folder inside it." };
  const inside = path.relative(path.resolve(cwd), folder);
  if (inside === "" || (!inside.startsWith("..") && !path.isAbsolute(inside))) {
    return { error: "That is inside the app's own folder, which is rebuilt on every deploy and partly public. Choose a folder outside it." };
  }
  const probe = path.join(folder, FOLDER, `.write-test-${process.pid}`);
  try {
    await mkdir(path.dirname(probe), { recursive: true });
    await writeFile(probe, "ok");
    await rm(probe, { force: true });
  } catch (err) {
    return { error: `The app cannot write to ${folder} (${err.code || err.message}). Nothing was changed.` };
  }
  return { folder };
}

/**
 * Read the named folder again, at most once a minute. Never throws: a
 * database that cannot answer leaves things as they were. A value this
 * process knows and the database has lost is written back: the folder is the
 * host's, not something a lost row should undo.
 */
export async function refreshStorage({ force = false, now = Date.now() } = {}) {
  if (!force && now - readAt < REREAD_MS) return;
  readAt = now;
  try {
    const stored = await getSetting(STORAGE_KEY);
    if (stored === AUTOMATIC) { chosen = null; unusable = null; return; }
    if (stored) {
      if (canWrite(stored)) { chosen = stored; unusable = null; }
      else { chosen = null; unusable = stored; }
      return;
    }
    if (chosen) await setSetting(STORAGE_KEY, chosen);
  } catch { /* as it was */ }
}

/** Name the folder, or go back to the automatic one with nothing given. */
export async function chooseStorage(given) {
  if (!String(given || "").trim()) {
    await setSetting(STORAGE_KEY, AUTOMATIC);
    chosen = null; unusable = null; readAt = Date.now();
    return { folder: null };
  }
  const checked = await checkFolder(given);
  if (checked.error) return checked;
  await setSetting(STORAGE_KEY, checked.folder);
  chosen = checked.folder; unusable = null; readAt = Date.now();
  return checked;
}

/** For the screen: where files go now, and why. */
export function storageState() {
  return {
    folder: durableHome(),
    filesIn: filesDir(),
    chosen,
    unusable,
    automatic: automaticHome(),
    /* Set on the host, it decides, and the screen says so. */
    fixed: fixed(),
  };
}
