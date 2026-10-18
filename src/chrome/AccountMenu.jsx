import React, { useEffect, useRef, useState } from "react";
import { Accessibility, Bell, BookOpen, ChevronDown, ClipboardCheck, Dumbbell, Link2, LogOut, Settings, ShieldCheck, Sparkles } from "lucide-react";
import { LinkDialog } from "../auth/LinkDialog";
import { AccessibilityDialog } from "./AccessibilityDialog";
import { NotificationsDialog, currentSubscription } from "./NotificationsDialog";
import { apiRequest } from "../lib/api";
import { lookOf, lookSummary } from "../lib/look";
import { VERSION_LABEL } from "../version";
import { Avatar } from "./Avatar";
import { useUnits } from "../hooks/useUnits";

const ROLE = { master: "Master", admin: "Admin", staff: "Front desk", trainer: "Trainer" };

/**
 * You, in the corner: your photo or initials with a chevron, opening a menu
 * with who is signed in, Log out and the version (Studio is in the apps panel under the logo). Coach's first
 * header had it (Glenn liked it and asked for it back, 16 Oct 2026); it sits
 * after the role badge, and is the one place for these — the tab bar has no
 * Profile. Your name shows beside the photo where there is room.
 */
export function AccountMenu({ user, onLogout, onOpen, billy, chooseLook }) {
  const [open, setOpen] = useState(false);
  const [linking, setLinking] = useState(false);
  const [looking, setLooking] = useState(false);
  /* Notifications (server/push.js): what the server offers, and whether this
     device is on. No line at all while the server has no push keys, or the
     account has nothing to be told (Studio's way: an On that could never
     work is worse than no row). */
  const [push, setPush] = useState(null);
  const [pushState, setPushState] = useState({ on: false, kinds: [] });
  const [notifying, setNotifying] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const got = await apiRequest("GET", "/push");
        if (!live || !got.publicKey) return;
        const sub = await currentSubscription().catch(() => null);
        if (sub) { const found = await apiRequest("POST", "/push/lookup", { endpoint: sub.endpoint }); if (live) setPushState(found); }
        if (live) setPush(got);
      } catch { /* no line is the right answer to a server that can't say */ }
    })();
    return () => { live = false; };
  }, [user.id]);
  const ref = useRef(null);
  const btnRef = useRef(null);

  /* One or the other, never both (Glenn, 18 Oct 2026: "When the profile menu
     opens, Billy's panel should close, and vice versa"): opening this folds
     Billy up, and Billy opening, however he is opened, closes this. */
  useEffect(() => { if (open) billy?.setOpen(false); }, [open]);
  useEffect(() => { if (billy?.open) setOpen(false); }, [billy?.open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const role = user.isPrimary ? "Primary Master" : ROLE[user.role];
  const [units, setUnits] = useUnits();
  return (
    <div className="relative cx-account" ref={ref}>
      {linking && <LinkDialog onClose={() => setLinking(false)} />}
      {notifying && push && <NotificationsDialog info={push} state={pushState} setState={setPushState} onClose={() => setNotifying(false)} />}
      {looking && chooseLook && <AccessibilityDialog user={user} chooseLook={chooseLook} onClose={() => setLooking(false)} />}
      <button ref={btnRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
        aria-label={`${user.name}: account menu`}
        className="flex items-center gap-1.5 rounded-full pl-0.5 pr-1.5 h-9 transition-colors hover:bg-(--ghost-fill)"
        /* Highlighted for as long as its menu is open, not only under the pointer. */
        style={open ? { background: "var(--ghost-fill)" } : undefined}>
        <Avatar user={user} size={32} />
        <span className="hidden sm:block text-sm font-medium max-w-48 truncate" style={{ color: "var(--ink)" }}>{user.name}</span>
        <ChevronDown size={16} style={{ color: "var(--iron)", transform: open ? "rotate(180deg)" : undefined, transition: "transform .2s ease" }} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="cx-card absolute right-0 mt-2 w-64 p-2" style={{ borderRadius: 14, zIndex: 40, background: "var(--badge-open)" }}>
          <div className="px-3 py-2 flex items-center gap-3">
            <Avatar user={user} size={40} />
            <div className="min-w-0">
              <div className="font-semibold truncate">{user.name}</div>
              <div className="text-xs truncate" style={{ color: "var(--iron)" }}>{user.email}</div>
              <RoleBadge user={user} role={role} />
            </div>
          </div>
          <div className="my-1 border-t" />
          {/* The trainer's personal memory: their equipment and their exercises. */}
          {onOpen && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onOpen("equipment"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
              <Dumbbell size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> My equipment
            </button>
          )}
          {onOpen && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onOpen("exercises"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
              <BookOpen size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> My exercises
            </button>
          )}
          {/* Passing Coach IQ's library is the Primary Master's alone. */}
          {onOpen && user.isPrimary && user.role === "master" && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onOpen("review"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
              <ClipboardCheck size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Review Coach IQ
            </button>
          )}
          {/* Settings for this copy of Coach on its server, as Studio's
              Installation: the Primary Master's alone. */}
          {onOpen && user.isPrimary && user.role === "master" && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); onOpen("installation"); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
              <Settings size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Installation
            </button>
          )}
          {/* A Coach account can be joined to a Trainability account with
              another email (stage three). */}
          {user.coachAccount && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); setLinking(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
              <Link2 size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Link your Trainability account
            </button>
          )}
          {/* Each trainer's own (Glenn, 17 Oct 2026: "Each trainer only"):
              how weights and distances are shown to them, and by Billy. */}
          <div className="px-3 py-2">
            <div className="text-xs mb-1.5" style={{ color: "var(--iron)" }} id="units-label">Units</div>
            <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg" style={{ background: "var(--ghost-fill)" }} role="radiogroup" aria-labelledby="units-label">
              {[["imperial", "Imperial", "lb, ft"], ["metric", "Metric", "kg, m"]].map(([key, word, hint]) => (
                <button key={key} type="button" role="radio" aria-checked={units === key} onClick={() => setUnits(key)}
                  className="rounded-md px-2 py-1 text-sm"
                  style={units === key ? { background: "var(--cerulean)", color: "#fff" } : { color: "var(--ink)" }}>
                  {word} <span className="text-xs" style={{ opacity: 0.8 }}>{hint}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Studio's Accessibility (its Profile → Accessibility): the line
              says light, dark or matching the device, and what else differs. */}
          {chooseLook && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); setLooking(true); }}
              className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-(--ghost-fill)">
              <Accessibility size={16} className="mt-0.5 flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block">Accessibility</span>
                <span className="block text-xs" style={{ color: "var(--iron)" }}>{lookSummary(lookOf(user))}</span>
              </span>
            </button>
          )}
          {push && (
            <button role="menuitem" type="button" onClick={() => { setOpen(false); setNotifying(true); }}
              className="w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm text-left hover:bg-(--ghost-fill)">
              <Bell size={16} className="mt-0.5 flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block">Notifications</span>
                <span className="block text-xs" style={{ color: "var(--iron)" }}>{pushState.on ? "On for this device" : "Off on this device"}</span>
              </span>
            </button>
          )}
          <div className="my-1 border-t" />
          <button role="menuitem" type="button" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
            <LogOut size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Log out
          </button>
          <p className="px-3 pt-1 pb-1 text-[11px]" style={{ color: "var(--iron)" }}>Version {VERSION_LABEL}</p>
        </div>
      )}
    </div>
  );
}

/* The shield that named an admin's or a master's role stood in the header's
   badge row; it is here now, beside the name it describes, as on Studio's
   account menu (Glenn, 18 Oct 2026: "Can you put the badge on the header
   inside the profile menu? See Studio how it's doing it"): rich gold with
   sparkles for the Primary Master, paler gold for a Master, Coach's blue for
   an Admin. Anyone else has the word. */
function RoleBadge({ user, role }) {
  if (!role) return null;
  if (!user.isPrimary && user.role !== "master" && user.role !== "admin") {
    return <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>{role}</div>;
  }
  const look = user.isPrimary
    ? { background: "linear-gradient(135deg, var(--gold-light), var(--gold))", color: "var(--gold-deep)" }
    : user.role === "master"
      ? { background: "linear-gradient(135deg, var(--gold-pale-light), var(--gold-pale))", color: "var(--gold-deep)" }
      : { background: "var(--accent-soft)", color: "var(--accent)" };
  return (
    <span className="relative inline-flex items-center gap-1 mt-1 text-xs font-medium"
      style={{ ...look, borderRadius: 8, padding: "2px 8px 2px 6px" }}>
      <ShieldCheck size={14} className="flex-none" aria-hidden="true" />
      {role}
      {user.isPrimary && (
        <Sparkles size={12} aria-hidden="true" className="absolute pointer-events-none"
          style={{ top: -5, right: -5, color: "var(--gold)", filter: "drop-shadow(0 0 2px var(--chalk))" }} />
      )}
    </span>
  );
}
