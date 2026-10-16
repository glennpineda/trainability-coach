import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import badgeMark from "../assets/coach-badge-light.svg";
import badgeMarkDark from "../assets/coach-badge-dark.svg";
import coachIcon from "../assets/coach-app-icon.png";
import studioIcon from "../assets/studio-app-icon.png";
import { CoachWordmark } from "./CoachWordmark";
import { AccountMenu } from "./AccountMenu";
import { BillyButton, BillyPanel } from "../billy/Billy";
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
 * The mark sits in the corner in a 36px badge, with COACH beside it.
 *
 * Pointed at with a mouse, or tapped, it folds out the apps panel underneath: Coach (ticked, where you
 * are) and Studio, a tap away, each with a line on what it is for. Every Coach account is a Studio account, so both are
 * always there. Open, the badge stops being a badge on top of a panel and
 * becomes the top of it: one fill, one outline (.cx-logo-badge-open).
 */
export function Header({ user, onLogout, billy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  /* Under a mouse the panel opens as the pointer arrives, as if clicked
     (Glenn, 16 Oct 2026), and folds up a moment after it leaves both the
     logo and the panel — the moment is so crossing from one to the other,
     or brushing past the edge, does not shut it. A touch screen has no
     hover, so there it is a tap, and a keyboard opens it with Enter. */
  const leaveTimer = useRef(0);
  const byHover = useRef(false);
  const onPointerEnter = (e) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    if (!open) { byHover.current = true; setOpen(true); }
  };
  const onPointerLeave = (e) => {
    if (e.pointerType !== "mouse" || !byHover.current) return;
    leaveTimer.current = setTimeout(() => { byHover.current = false; setOpen(false); }, 250);
  };
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  /* A click on a logo the pointer has already opened leaves it open, rather
     than shutting what the person is about to use. */
  const onLogoClick = (e) => {
    if (byHover.current && e.detail > 0) return;
    byHover.current = false;
    setOpen(v => !v);
  };

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
    byHover.current = false;
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
        {/* The logo and its panel are one place to the pointer: entering
            either keeps it open, leaving both starts it closing. */}
        <div onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
        <button
          ref={btnRef}
          type="button"
          onClick={onLogoClick}
          className={`cx-logo-badge${open ? " cx-logo-badge-open" : ""}`}
          aria-expanded={open}
          aria-controls="cx-apps"
          aria-label={open ? "Hide the Trainability apps" : "Trainability apps: switch between Coach and Studio"}
          title={open ? "Hide" : "Switch apps"}
        >
          {/* The logo kit's two badges: cerulean on light, white on dark. */}
          <picture className="flex-none">
            <source srcSet={badgeMarkDark} media="(prefers-color-scheme: dark)" />
            <img src={badgeMark} alt="" style={{ width: BADGE, height: BADGE, display: "block" }} />
          </picture>
          <span className="cx-logo-label">
            <CoachWordmark label="" className="h-[15px] sm:h-[17px] w-auto" style={{ color: "var(--wordmark)" }} />
          </span>
        </button>
        </div>

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
          {/* Billy, when this server has him (useBilly). */}
          {billy?.available && <BillyButton billy={billy} />}
          <AccountMenu user={user} onLogout={onLogout} />
        </div>
        {billy?.available && <BillyPanel billy={billy} />}

        {drawn && (
          <div id="cx-apps" className={`cx-appdrawer${slid && open ? " cx-appdrawer-open" : ""}`} aria-hidden={!open}
            onPointerEnter={onPointerEnter} onPointerLeave={onPointerLeave}>
            <div ref={panelRef} className="cx-apppanel" role="group" aria-labelledby="cx-apps-title">
              <div id="cx-apps-title" className="text-xs uppercase tracking-wide px-2 pt-1 pb-2" style={{ color: "var(--iron)" }}>
                Trainability apps
              </div>
              {/* The app you are in: the tick says so, and a screen reader is told by aria-current. */}
              <button type="button" className="cx-app-row" aria-current="page" aria-label="Coach, the app you are in: programs, progress, and nutrition" onClick={() => close({ restoreFocus: true })}>
                <img src={coachIcon} alt="" className="flex-none" style={{ width: 40, height: 40, borderRadius: 10 }} />
                <span className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">Coach</span>
                  <span className="block text-sm" style={{ color: "var(--iron)" }}>Programs, progress, and nutrition</span>
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
