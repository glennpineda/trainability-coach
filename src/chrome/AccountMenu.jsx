import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { VERSION_LABEL } from "../version";
import { Avatar } from "./Avatar";

const ROLE = { master: "Master", admin: "Admin", staff: "Front desk", trainer: "Trainer" };

/**
 * You, in the corner: your photo or initials with a chevron, opening a menu
 * with who is signed in, Log out and the version. Studio is reached from the
 * logo's apps panel, so the menu has no link of its own to it (Glenn, 16 Oct
 * 2026), and the shield that named an admin's or a master's role in the
 * header is here, beside the name it describes. Coach's first
 * header had it (Glenn liked it and asked for it back, 16 Oct 2026); it sits
 * after the role badge, and is the one place for these — the tab bar has no
 * Profile. Your name shows beside the photo where there is room.
 */
export function AccountMenu({ user, onLogout }) {
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
              {role && <RoleBadge user={user} role={role} />}
            </div>
          </div>
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

/* Rich gold with sparkles for the Primary Master, paler gold for a Master,
   Coach's blue for an Admin, as the header's shield was; a trainer or the
   front desk has the word. */
function RoleBadge({ user, role }) {
  if (!["master", "admin"].includes(user.role)) return <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>{role}</div>;
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
