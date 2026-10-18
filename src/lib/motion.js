const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether to keep things still, as Studio asks it (its useReducedMotion.js):
 * <html data-motion> if anything ever sets it (Coach has no Motion setting of
 * its own yet), else the device's own setting.
 */
export function reducedMotionNow() {
  if (typeof window === "undefined") return false;
  const pick = document.documentElement.dataset.motion;
  if (pick === "reduced") return true;
  if (pick === "full") return false;
  return !!window.matchMedia?.(QUERY).matches;
}

/** Call `onChange` whenever the answer may have changed. Returns the unsubscribe. */
export function watchReducedMotion(onChange) {
  const mq = window.matchMedia?.(QUERY);
  mq?.addEventListener("change", onChange);
  const attr = new MutationObserver(onChange);
  attr.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => { mq?.removeEventListener("change", onChange); attr.disconnect(); };
}
