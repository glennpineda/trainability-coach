import React, { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, ClipboardCheck, Dumbbell, ExternalLink, LogOut, Settings } from "lucide-react";
import { STUDIO_URL } from "../lib/api";
import { VERSION_LABEL } from "../version";
import { Avatar } from "./Avatar";
import { useUnits } from "../hooks/useUnits";

const ROLE = { master: "Master", admin: "Admin", staff: "Front desk", trainer: "Trainer" };

/**
 * You, in the corner: your photo or initials with a chevron, opening a menu
 * with who is signed in, Open Studio, Log out and the version. Coach's first
 * header had it (Glenn liked it and asked for it back, 16 Oct 2026); it sits
 * after the role badge, and is the one place for these — the tab bar has no
 * Profile. Your name shows beside the photo where there is room.
 */
export function AccountMenu({ user, onLogout, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const btnRef = useRef(null);

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
    <div className="relative" ref={ref}>
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
              {role && <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>{role}</div>}
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
          <div className="my-1 border-t" />
          <a role="menuitem" href={STUDIO_URL} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
            <ExternalLink size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Open Studio
          </a>
          <button role="menuitem" type="button" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-(--ghost-fill)">
            <LogOut size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Log out
          </button>
          <p className="px-3 pt-1 pb-1 text-[11px]" style={{ color: "var(--iron)" }}>Version {VERSION_LABEL}</p>
        </div>
      )}
    </div>
  );
}
