import { get, run } from "./db.js";
import { UNITS, DEFAULT_UNITS } from "../src/lib/units.js";

/**
 * A trainer's own settings in Coach, kept by name in `coach_trainer_settings`
 * against their Studio id. So far, their units (Glenn, 17 Oct 2026: "Each
 * trainer only", imperial until they choose): how weights and distances are
 * shown to them, in Coach IQ and by Billy (src/lib/units.js).
 */

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
  return { units: await unitsOf(trainerId) };
}
