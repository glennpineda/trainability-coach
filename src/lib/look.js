/*
 * Accessibility: how the page looks (Glenn, 18 Oct 2026: "Can you copy all
 * the accessibility settings into Coach from Studio as well?"). Studio's six
 * (its src/components/Appearance.jsx and theme.jsx): light or dark, the
 * theme's color, contrast, color, motion and text size, with its names and
 * values, so one account's choices mean the same in both apps. A Trainability
 * trainer's are Studio's own, read and saved through it (Glenn: "Shared with
 * Studio"); a Coach account's are kept in Coach.
 *
 * On <html>, as Studio writes them: data-theme (light or dark where one was
 * chosen), data-tone, data-contrast, data-motion, data-color, and the font
 * size. Studio's stylesheet answers "Same as device" with media queries; Coach
 * writes the answer as well, so its stylesheet asks one attribute each:
 * data-scheme (light or dark, as it is now), data-hc (high contrast is on)
 * and data-still (keep things still). index.html does the same from what this
 * browser last had, before anything else draws.
 */

export const DEFAULT_LOOK = { theme: "system", tone: "", contrast: "system", motion: "system", color: "full", textSize: "medium" };

/* Studio's choices (its server/people.js), each a route of its own to save. */
export const CHOICES = {
  theme: ["system", "light", "dark"],
  tone: ["", "purple", "blue", "orange", "green"],
  contrast: ["system", "standard", "more"],
  motion: ["system", "reduced", "full"],
  color: ["full", "reduced"],
  textSize: ["small", "medium", "large", "xlarge"],
};
export const ROUTE = { theme: "/auth/theme", tone: "/auth/tone", contrast: "/auth/contrast", motion: "/auth/motion", color: "/auth/color", textSize: "/auth/text-size" };

/* Studio's sizes (its TEXT_SCALE): Medium is the browser's own 16px. */
const TEXT_SCALE = { small: "87.5%", medium: "", large: "112.5%", xlarge: "125%" };
const TONES = CHOICES.tone.filter(Boolean);
const KEY = "cx-look";

/** A user's look, from what Studio (or Coach, for a Coach account) says. */
export function lookOf(user) {
  if (!user) return null;
  const pick = (k) => (CHOICES[k].includes(user[k]) ? user[k] : DEFAULT_LOOK[k]);
  return { theme: pick("theme"), tone: pick("tone"), contrast: pick("contrast"), motion: pick("motion"), color: pick("color"), textSize: pick("textSize") };
}

const media = (q) => typeof window !== "undefined" && !!window.matchMedia?.(q).matches;

/** "Same as device" answered: data-scheme, data-hc and data-still, from the choices on <html>. */
export function resolveLook() {
  if (typeof document === "undefined") return;
  const el = document.documentElement, d = el.dataset;
  d.scheme = d.theme === "dark" || d.theme === "light" ? d.theme : media("(prefers-color-scheme: dark)") ? "dark" : "light";
  if (d.contrast === "more" || (d.contrast !== "standard" && media("(prefers-contrast: more)"))) d.hc = "on"; else delete d.hc;
  if (d.motion === "reduced" || (d.motion !== "full" && media("(prefers-reduced-motion: reduce)"))) d.still = "on"; else delete d.still;
}

/* The device changing its mind (dark at sunset) is answered at once. */
if (typeof window !== "undefined" && window.matchMedia) {
  for (const q of ["(prefers-color-scheme: dark)", "(prefers-contrast: more)", "(prefers-reduced-motion: reduce)"]) {
    window.matchMedia(q).addEventListener?.("change", resolveLook);
  }
}

/** A look on the page: null puts it back as the device has it. */
export function applyLook(look) {
  const el = document.documentElement, d = el.dataset;
  const set = (k, v) => { if (v) d[k] = v; else delete d[k]; };
  set("theme", look?.theme === "light" || look?.theme === "dark" ? look.theme : null);
  set("tone", TONES.includes(look?.tone) ? look.tone : null);
  set("contrast", look?.contrast === "more" || look?.contrast === "standard" ? look.contrast : null);
  set("motion", look?.motion === "reduced" || look?.motion === "full" ? look.motion : null);
  set("color", look?.color === "reduced" ? "reduced" : null);
  el.style.fontSize = TEXT_SCALE[look?.textSize] || "";
  resolveLook();
}

/* Kept on this browser for the next time the page opens, so index.html can
   put it on before anything is drawn (Studio's rememberLook); forgotten on
   signing out, since the sign-in screen belongs to whoever picks the device
   up next. */
export function rememberLook(look) {
  try { look ? localStorage.setItem(KEY, JSON.stringify(look)) : localStorage.removeItem(KEY); } catch { /* not kept */ }
}

/** The Accessibility line in the account menu: light or dark, and only what differs from the ordinary (Studio's appearanceSummary). */
export function lookSummary(look) {
  return [
    { system: "Matches this device", light: "Light", dark: "Dark" }[look.theme] || "Matches this device",
    TONES.includes(look.tone) ? TONE_CHIP[look.tone] : null,
    look.contrast === "more" ? "High contrast" : null,
    look.color === "reduced" ? "Reduced color" : null,
    look.motion === "reduced" ? "Reduced motion" : look.motion === "full" ? "Full motion" : null,
    look.textSize && look.textSize !== "medium" ? `${TEXT_SIZE_CHIP[look.textSize]} text` : null,
  ].filter(Boolean).join(" · ");
}

/* The chips' words, Studio's. */
export const THEME_CHIP = { system: "Same as device", light: "Light", dark: "Dark" };
export const TONE_CHIP = { "": "Default", purple: "Purple", blue: "Blue", orange: "Orange", green: "Green" };
export const CONTRAST_CHIP = { system: "Same as device", standard: "Standard", more: "High" };
export const COLOR_CHIP = { full: "Full", reduced: "Reduced" };
export const MOTION_CHIP = { system: "Same as device", reduced: "Reduced", full: "Full" };
export const TEXT_SIZE_CHIP = { small: "Small", medium: "Medium", large: "Large", xlarge: "X Large" };
