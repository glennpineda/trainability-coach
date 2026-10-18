import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { DEFAULT_UNITS } from "../lib/units";

/**
 * The signed-in trainer's units (src/lib/units.js), asked for once and shared
 * by every screen that shows a weight or a distance, so changing them in the
 * account menu redraws the rest at once. Imperial until the answer comes.
 */
let units = DEFAULT_UNITS;
let asked = null;
const listeners = new Set();
const tell = () => { for (const fn of listeners) fn(units); };

function ask() {
  asked ||= apiRequest("GET", "/my-settings")
    .then(s => { units = s.units || DEFAULT_UNITS; tell(); })
    .catch(() => { asked = null; });
  return asked;
}

export function useUnits() {
  const [now, setNow] = useState(units);
  useEffect(() => {
    listeners.add(setNow);
    ask();
    setNow(units);
    return () => listeners.delete(setNow);
  }, []);
  const choose = async (next) => {
    const before = units;
    units = next; tell();
    try { units = (await apiRequest("PUT", "/my-settings", { units: next })).units; }
    catch { units = before; }
    tell();
  };
  return [now, choose];
}
