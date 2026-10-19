import { get, run } from "./db.js";
import { UNITS, DEFAULT_UNITS } from "../src/lib/units.js";

/**
 * A trainer's own settings in Coach, kept by name in `coach_trainer_settings`
 * against their Studio id. So far, their units (Glenn, 17 Oct 2026: "Each
 * trainer only", imperial until they choose): how weights and distances are
 * shown to them, in Coach IQ and by Billy (src/lib/units.js). And how often
 * their clients' measurements are due, in weeks (Glenn, 19 Oct 2026: "about
 * every 5 weeks, this should be a setting on the profile settings"), 0 for
 * off: the Clients list says "Measurements due" when it has been that long.
 */

export const MEASURE_EVERY_DEFAULT = 5;
export const MEASURE_EVERY_MAX = 12;

async function put(trainerId, name, value) {
  const stamp = new Date().toISOString();
  const had = await get(`SELECT name FROM coach_trainer_settings WHERE trainer_id = ? AND name = ?`, [trainerId, name]);
  if (had) await run(`UPDATE coach_trainer_settings SET value = ?, updated_at = ? WHERE trainer_id = ? AND name = ?`, [value, stamp, trainerId, name]);
  else await run(`INSERT INTO coach_trainer_settings (trainer_id, name, value, updated_at) VALUES (?, ?, ?, ?)`, [trainerId, name, value, stamp]);
}

export async function measureEveryOf(trainerId) {
  const row = await get(`SELECT value FROM coach_trainer_settings WHERE trainer_id = ? AND name = 'measure_every'`, [trainerId]);
  const n = Number(row?.value);
  return row && Number.isInteger(n) && n >= 0 && n <= MEASURE_EVERY_MAX ? n : MEASURE_EVERY_DEFAULT;
}
export async function setMeasureEvery(trainerId, weeks) {
  const n = Number(weeks);
  if (!Number.isInteger(n) || n < 0 || n > MEASURE_EVERY_MAX) return false;
  await put(trainerId, "measure_every", String(n));
  return true;
}

export async function unitsOf(trainerId) {
  const row = await get(`SELECT value FROM coach_trainer_settings WHERE trainer_id = ? AND name = 'units'`, [trainerId]);
  return UNITS.includes(row?.value) ? row.value : DEFAULT_UNITS;
}

export async function setUnits(trainerId, units) {
  if (!UNITS.includes(units)) return false;
  const stamp = new Date().toISOString();
  const had = await get(`SELECT name FROM coach_trainer_settings WHERE trainer_id = ? AND name = 'units'`, [trainerId]);
  if (had) await run(`UPDATE coach_trainer_settings SET value = ?, updated_at = ? WHERE trainer_id = ? AND name = 'units'`, [units, stamp, trainerId]);
  else await run(`INSERT INTO coach_trainer_settings (trainer_id, name, value, updated_at) VALUES (?, 'units', ?, ?)`, [trainerId, units, stamp]);
  return true;
}

/** Everything a trainer has set, for the page. */
export async function settingsOf(trainerId) {
  return { units: await unitsOf(trainerId), measureEvery: await measureEveryOf(trainerId) };
}
