import React, { useEffect, useRef, useState } from "react";
import { LogOut, ExternalLink, ChevronDown } from "lucide-react";
import badgeLight from "../assets/coach-badge-light.svg";
import { STUDIO_URL } from "../lib/api";
import { VERSION_LABEL } from "../version";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";

const ROLE = { master: "Master", admin: "Admin", staff: "Front desk", trainer: "Trainer" };

export function Avatar({ user, size = 32 }) {
  const [broken, setBroken] = useState(false);
  if (user.photoUrl && !broken) {
    return <img src={user.photoUrl} alt="" onError={() => setBroken(true)} className="rounded-full object-cover flex-none" style={{ width: size, height: size }} />;
  }
  return (
    <span className="rounded-full flex-none flex items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, background: "var(--cerulean)", fontSize: size * 0.4 }} aria-hidden="true">
      {initials(user.name)}
    </span>
  );
}

export function Header({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <header className="sticky top-0 z-20" style={{ background: "var(--navy)", paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src={badgeLight} alt="" className="h-8 w-auto" />
          <div className="leading-none">
            <div className="text-[10px] font-bold tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.7)" }}>TRAINABILITY<sup className="text-[7px] align-top relative top-px" style={{ marginLeft: "-0.1em" }}>®</sup></div>
            <div className="text-lg font-extrabold tracking-wide" style={{ color: "var(--sky)" }}>COACH</div>
          </div>
        </div>

        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu"
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-white/10 transition-colors">
            <Avatar user={user} />
            <span className="hidden sm:block text-sm font-medium text-white max-w-[12rem] truncate">{user.name}</span>
            <ChevronDown size={16} className="text-white/70" aria-hidden="true" />
          </button>
          {open && (
            <div role="menu" className="cx-card absolute right-0 mt-2 w-64 p-2" style={{ borderRadius: 14 }}>
              <div className="px-3 py-2 flex items-center gap-3">
                <Avatar user={user} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{user.name}</div>
                  <div className="text-xs truncate" style={{ color: "var(--iron)" }}>{user.email}</div>
                  {ROLE[user.role] && <div className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>{ROLE[user.role]}</div>}
                </div>
              </div>
              <div className="my-1 border-t" style={{ borderColor: "var(--iron-line)" }} />
              <a role="menuitem" href={STUDIO_URL} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--ghost-fill)]">
                <ExternalLink size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Open Studio
              </a>
              <button role="menuitem" onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-[var(--ghost-fill)]">
                <LogOut size={16} style={{ color: "var(--accent)" }} aria-hidden="true" /> Log out
              </button>
              <p className="px-3 pt-1 pb-1 text-[11px]" style={{ color: "var(--iron)" }}>Version {VERSION_LABEL}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
