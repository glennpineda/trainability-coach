import { useEffect, useState } from "react";

/**
 * Putting the app on a phone's home screen, and knowing when to offer it:
 * Studio's src/lib/install.js, taken as it is (Glenn, 17 Oct 2026: "add the
 * “add to Home Screen” like on Studio at the bottom of the login screen").
 *
 * The page is already installable — manifest.webmanifest, the icons and the
 * Apple tags in index.html do that. What a browser will not do is tell anybody, so
 * this works out whether there is anything to offer and how:
 *
 *   "prompt"  Chrome, Edge and Samsung Internet. They fire beforeinstallprompt
 *             only when the app can be installed and is not already, so the
 *             event arriving is itself the answer. It is kept, and handed
 *             back when somebody taps Install to open the browser's own box.
 *   "ios"     iPhone and iPad. Apple lets no page start an install, and says
 *             nothing either way, so the most there is to offer is the steps.
 *   null      Nothing to offer: already running from the home screen, a
 *             browser with no install at all (Firefox on a desktop), or an app's
 *             built-in browser (Instagram, Gmail) whose Share menu has no Add
 *             to Home Screen.
 *
 * Listened for here, at load, rather than inside a component. The event fires
 * once, early, and a screen mounted a second later has already missed it —
 * main.jsx imports this first for exactly that reason.
 */

let deferred = null;
let installedHere = false;
const listeners = new Set();
const notify = () => listeners.forEach(fn => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    /* Keeps Chrome's own strip from sliding up over the sign-in form on its
       schedule; ours is offered where there is room for it. The install icon
       in the address bar stays either way. */
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedHere = true;
    notify();
  });
}

const matches = (query) => typeof window !== "undefined" && !!window.matchMedia?.(query).matches;

/** Opened from its home-screen icon rather than in a browser tab. */
export function runningInstalled() {
  return matches("(display-mode: standalone)")
    || matches("(display-mode: fullscreen)")
    || matches("(display-mode: minimal-ui)")
    // Safari's own flag, from before it knew display-mode.
    || window.navigator.standalone === true;
}

/* An iPad asks for the desktop site and says Macintosh; the touch screen is
   what gives it away. */
export function appleMobile() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

const IN_APP_BROWSER = /FBAN|FBAV|Instagram|LinkedInApp|Line\/|GSA\/|Snapchat|Twitter/;

/** A phone or tablet: the finger is the pointer. */
export const touchFirst = () => matches("(pointer: coarse)");

function wayToInstall() {
  if (installedHere || runningInstalled()) return null;
  if (deferred) return "prompt";
  if (appleMobile() && !IN_APP_BROWSER.test(navigator.userAgent || "")) return "ios";
  return null;
}

export function useInstall() {
  const [how, setHow] = useState(wayToInstall);

  useEffect(() => {
    const update = () => setHow(wayToInstall());
    listeners.add(update);
    // Chrome can move a tab into the installed window without a reload.
    const standalone = window.matchMedia?.("(display-mode: standalone)");
    standalone?.addEventListener?.("change", update);
    update();
    return () => {
      listeners.delete(update);
      standalone?.removeEventListener?.("change", update);
    };
  }, []);

  /* The event can be used once. Declined, it is gone until the browser decides
     to offer again, so the button goes with it rather than doing nothing. */
  async function install() {
    const event = deferred;
    if (!event) return "unavailable";
    deferred = null;
    event.prompt();
    const { outcome } = await event.userChoice.catch(() => ({ outcome: "dismissed" }));
    notify();
    return outcome;
  }

  return { how, install };
}

/* "Not now" on the sign-in banner. On the device rather than the account:
   installing is a thing done to one phone, and the banner is shown before
   anybody has signed in to have an account to keep it on. */
const HIDDEN_UNTIL = "cx-install-banner-hidden-until";
const HIDE_FOR_DAYS = 30;

export function bannerHidden() {
  try {
    return Number(localStorage.getItem(HIDDEN_UNTIL) || 0) > Date.now();
  } catch {
    return false; // storage blocked: offering again is the harmless side
  }
}

export function hideBanner() {
  try {
    localStorage.setItem(HIDDEN_UNTIL, String(Date.now() + HIDE_FOR_DAYS * 24 * 60 * 60 * 1000));
  } catch {
    /* Storage blocked: it hides for this visit only. */
  }
}
