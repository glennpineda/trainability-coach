import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { DEFAULT_UNITS } from "../lib/units";

/**
 * The signed-in trainer's own settings (server/trainer-settings.js), asked
 * for once and shared by every screen that uses them, so a change in the
 * account menu redraws the rest at once: their units (src/lib/units.js),
 * imperial until the answer comes, and how many weeks apart their clients'
 * measurements are due (0 for off), 5 until it comes.
 */
let settings = { units: DEFAULT_UNITS, measureEvery: 5 };
let asked = null;
const listeners = new Set();
const tell = () => { for (const fn of listeners) fn(settings); };

function ask() {
  asked ||= apiRequest("GET", "/my-settings")
    .then(s => { settings = { ...settings, ...s }; tell(); })
    .catch(() => { asked = null; });
  return asked;
}

/** `[settings, change]`: `change({ name: value })` shows it at once and keeps it, or puts it back. */
export function useMySettings() {
  const [now, setNow] = useState(settings);
  useEffect(() => {
    listeners.add(setNow);
    ask();
    setNow(settings);
    return () => listeners.delete(setNow);
  }, []);
  const change = async (next) => {
    const before = settings;
    settings = { ...settings, ...next }; tell();
    try { settings = { ...settings, ...await apiRequest("PUT", "/my-settings", next) }; }
    catch { settings = before; }
    tell();
  };
  return [now, change];
}

export function useUnits() {
  const [s, change] = useMySettings();
  return [s.units || DEFAULT_UNITS, (units) => change({ units })];
}
