import React, { useEffect, useState } from "react";
import { House, Users, ClipboardList, MessageCircle, UserRound } from "lucide-react";
import { Header } from "./chrome/Header";
import { BottomNav } from "./chrome/BottomNav";
import { HomeTab } from "./tabs/HomeTab";
import { ComingSoonTab } from "./tabs/ComingSoonTab";
import { ProfileTab } from "./tabs/ProfileTab";
import { SECTIONS } from "./tabs/sections";

const TABS = [
  { id: "home", label: "Home", icon: House },
  { id: "clients", label: "Clients", icon: Users },
  { id: "programs", label: "Programs", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: UserRound },
];
const KEY = "coach-tab";

/* Signed in: the header, the tab on screen, and the bar along the bottom.
   The tab is remembered for this browser tab only, so a reload stays put. */
export function Shell({ user, onLogout }) {
  const [tab, setTab] = useState(() => {
    try { const t = sessionStorage.getItem(KEY); return TABS.some(x => x.id === t) ? t : "home"; } catch { return "home"; }
  });
  useEffect(() => { try { sessionStorage.setItem(KEY, tab); } catch { /* not kept */ } }, [tab]);
  const open = (id) => { setTab(id); window.scrollTo({ top: 0 }); };

  return (
    <div className="min-h-dvh" style={{ background: "var(--paper)" }}>
      <Header user={user} onLogout={onLogout} />
      {/* Room at the end for the bar floating over it. */}
      <main className="pb-32">
        {tab === "home" && <HomeTab user={user} onOpen={open} />}
        {SECTIONS[tab] && <ComingSoonTab section={SECTIONS[tab]} />}
        {tab === "profile" && <ProfileTab user={user} onLogout={onLogout} />}
      </main>
      <BottomNav tabs={TABS} activeTab={tab} onChange={open} user={user} />
    </div>
  );
}
