import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import badgeMark from "../assets/coach-badge-light.svg";
import badgeMarkDark from "../assets/coach-badge-dark.svg";
import coachIcon from "../assets/coach-app-icon.png";
import studioIcon from "../assets/studio-app-icon.png";
import { CoachWordmark } from "./CoachWordmark";
import { AccountMenu } from "./AccountMenu";
import { STUDIO_URL } from "../lib/api";

/* A badge's square, as in Studio's header: the logo is drawn at it so
   everything in the row stands the same height. */
const BADGE = 36;
/* How long the apps panel takes to slide, in and out (.cx-appdrawer). */
const SLIDE_MS = 220;

const ROLE = { master: "Master", admin: "Admin" };

/**
 * The bar across the top, Studio's header in Coach's colors.
 *
 * The mark sits in the corner in a 36px badge, with COACH beside it. Under the
 * pointer the badge opens out, as Studio's does: the mark becomes the app's
 * own icon (the tile on a home screen) and its name slides out beside it.
 *
 * Pressed, it folds out the apps panel underneath: Coach, where you are, and
 * Studio, a tap away. Every Coach account is a Studio account, so both are
 * always there. Open, the badge stops being a badge on top of a panel and
 * becomes the top of it: one fill, one outline (.cx-logo-badge-open).
 */
export function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  /* Put on the page a frame before it slides, so there is a closed state to
     slide from, and kept for the length of the slide after it closes. */
  const [drawn, setDrawn] = useState(false);
  const [slid, setSlid] = useState(false);
  useEffect(() => {
    if (open) {
      setDrawn(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setSlid(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setSlid(false);
    const t = setTimeout(() => setDrawn(false), SLIDE_MS);
    return () => clearTimeout(t);
  }, [open]);

  /* Escape, or a press anywhere else, folds it back up. Escape gives focus
     back to the badge, so a keyboard is not dropped at the top of the page. */
  const close = useCallback(({ restoreFocus } = {}) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const inside = (t) => panelRef.current?.contains(t) || btnRef.current?.contains(t);
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); close({ restoreFocus: true }); } };
    const onDown = (e) => { if (!inside(e.target)) close(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [open, close]);

  return (
    <header className="cx-headbar">
      <div className="relative flex items-center max-w-5xl mx-auto" style={{ minHeight: BADGE }}>
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`cx-logo-badge${open ? " cx-logo-badge-open" : ""}`}
          aria-expanded={open}
          aria-controls="cx-apps"
          aria-label={open ? "Hide the Trainability apps" : "Trainability apps: switch between Coach and Studio"}
          title={open ? "Hide" : "Switch apps"}
        >
          {/* Two marks in one slot, swapped in CSS: the plain mark at rest, the
              app's own icon opened out. */}
          {/* The logo kit's two badges: cerulean on light, white on dark. */}
          <picture className="cx-logo-rest flex-none">
            <source srcSet={badgeMarkDark} media="(prefers-color-scheme: dark)" />
            <img src={badgeMark} alt="" style={{ width: BADGE, height: BADGE, display: "block" }} />
          </picture>
          <img src={coachIcon} alt="" className="cx-logo-open flex-none" style={{ width: BADGE, height: BADGE, borderRadius: 9 }} />
          <span className="cx-logo-label">
            <CoachWordmark label="" className="h-[15px] sm:h-[17px] w-auto" style={{ color: "var(--wordmark)" }} />
          </span>
        </button>

        {/* Which app this is, beside the mark, in the logo's own lettering. */}
        <span className="flex items-center" style={{ marginLeft: BADGE + 10, color: "var(--wordmark)" }}>
          <CoachWordmark className="h-[15px] sm:h-[17px] w-auto" />
        </span>

        <div className="flex-1" />

        {/* Studio's badges: an Admin's or a Master's account says so, its name
            opening out under the pointer (a trainer has none); then you, with
            your account menu, in the corner. */}
        <div className="cx-badge-row">
          {ROLE[user.role] && (
            <span className="relative inline-flex flex-none">
              <span
                className={`cx-badge${user.isPrimary ? " cx-badge-primary" : ""}`}
                style={user.isPrimary
                  ? { background: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: "var(--gold-deep)" }
                  : user.role === "master"
                    ? { background: "linear-gradient(135deg, var(--gold-pale-light), var(--gold-pale))", color: "var(--gold-deep)" }
                    : { background: "var(--accent-soft)", color: "var(--accent)" }}
                tabIndex={0}
              >
                <ShieldCheck size={18} className="flex-none" aria-hidden="true" />
                <span className="cx-badge-label text-sm font-medium">{user.isPrimary ? "Primary Master" : ROLE[user.role]}</span>
              </span>
              {user.isPrimary && (
                <Sparkles size={14} aria-hidden="true" className="absolute pointer-events-none"
                  style={{ top: -4, right: -4, color: "var(--gold)", filter: "drop-shadow(0 0 2px var(--chalk))" }} />
              )}
            </span>
          )}
          <AccountMenu user={user} onLogout={onLogout} />
        </div>

        {drawn && (
          <div id="cx-apps" className={`cx-appdrawer${slid && open ? " cx-appdrawer-open" : ""}`} aria-hidden={!open}>
            <div ref={panelRef} className="cx-apppanel" role="group" aria-labelledby="cx-apps-title">
              <div id="cx-apps-title" className="text-xs uppercase tracking-wide px-2 pt-1 pb-2" style={{ color: "var(--iron)" }}>
                Trainability apps
              </div>
              <button type="button" className="cx-app-row" aria-current="page" onClick={() => close({ restoreFocus: true })}>
                <img src={coachIcon} alt="" className="flex-none" style={{ width: 40, height: 40, borderRadius: 10 }} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">Coach</span>
                  <span className="block text-sm" style={{ color: "var(--iron)" }}>You&apos;re here</span>
                </span>
                <Check size={20} className="flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
              </button>
              <a href={STUDIO_URL} className="cx-app-row">
                <img src={studioIcon} alt="" className="flex-none" style={{ width: 40, height: 40, borderRadius: 10 }} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Studio</span>
                  <span className="block text-sm" style={{ color: "var(--iron)" }}>Schedule, sessions, and payments</span>
                </span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
