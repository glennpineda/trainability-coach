import { get, run } from "./db.js";

/**
 * Settings for this installation of Coach, kept by name in `coach_settings`,
 * as Studio keeps its own (its server/settings.js). A setting is a name and a
 * value; the name is its key, so it needs no id of its own.
 */

export async function getSetting(key) {
  const row = await get(`SELECT value FROM coach_settings WHERE name = ?`, [key]);
  return row ? row.value : null;
}

/* Read, then insert or update: no upsert syntax, so it runs on both
   databases (db.js). */
export async function setSetting(key, value) {
  const stamp = new Date().toISOString();
  const had = await get(`SELECT name FROM coach_settings WHERE name = ?`, [key]);
  if (had) await run(`UPDATE coach_settings SET value = ?, updated_at = ? WHERE name = ?`, [String(value), stamp, key]);
  else await run(`INSERT INTO coach_settings (name, value, updated_at) VALUES (?, ?, ?)`, [key, String(value), stamp]);
}
