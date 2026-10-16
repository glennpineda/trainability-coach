import React from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { STUDIO_URL } from "../lib/api";
import { VERSION_LABEL } from "../version";
import { Avatar } from "../chrome/Avatar";
import { TabHeading } from "./TabHeading";

const ROLE = { master: "Master", admin: "Admin", staff: "Front desk", trainer: "Trainer" };

/* You: who is signed in, the way to Studio, and Log out — on Profile, the last
   tab, as in Studio. */
export function ProfileTab({ user, onLogout }) {
  return (
    <div className="max-w-xl mx-auto px-4">
      <TabHeading>Profile</TabHeading>
      <div className="cx-card p-5 flex items-center gap-4">
        <Avatar user={user} size={64} />
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{user.name}</div>
          <div className="text-sm truncate" style={{ color: "var(--iron)" }}>{user.email}</div>
          {ROLE[user.role] && <div className="text-sm mt-0.5" style={{ color: "var(--accent)" }}>{user.isPrimary ? "Primary Master" : ROLE[user.role]}</div>}
        </div>
      </div>
      <div className="cx-card mt-4 overflow-hidden">
        <a href={STUDIO_URL} className="cx-row">
          <ExternalLink size={20} style={{ color: "var(--accent)" }} aria-hidden="true" /> Open Studio
        </a>
        <button type="button" onClick={onLogout} className="cx-row border-t">
          <LogOut size={20} style={{ color: "var(--accent)" }} aria-hidden="true" /> Log out
        </button>
      </div>
      <p className="text-sm text-center mt-6" style={{ color: "var(--iron)" }}>Version {VERSION_LABEL}</p>
    </div>
  );
}
