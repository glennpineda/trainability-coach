/**
 * Scroll the page: the app's own panel where it scrolls inside itself (from
 * a small tablet up, the card of Studio's app shell, Shell.jsx), else the
 * window (a phone). Either way, the one that isn't scrolling ignores it.
 */
export function scrollPageTo(options = { top: 0 }) {
  document.querySelector(".cx-app-scroll")?.scrollTo(options);
  window.scrollTo(options);
}
