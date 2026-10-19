/**
 * A name as it is compared: lowercase, no hyphens or punctuation, plurals
 * made singular, so "Band-assisted pull-ups" and "band assisted pull up"
 * are the same name (ideas audit, 13). Shared by the library and the
 * Equipment page, which knows a piece by any of its names.
 */
export const nameKey = (name) => String(name).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
  .split(" ").map(w => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w)).join(" ");
