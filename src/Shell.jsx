import React, { useEffect, useState } from "react";
import { House, Users, ClipboardList, MessageCircle } from "lucide-react";
import { Header } from "./chrome/Header";
import { BottomNav } from "./chrome/BottomNav";
import { HomeTab } from "./tabs/HomeTab";
import { ComingSoonTab } from "./tabs/ComingSoonTab";
import { ClientsTab } from "./tabs/ClientsTab";
import { EquipmentTab } from "./tabs/EquipmentTab";
import { ExercisesTab } from "./tabs/ExercisesTab";
import { ReviewTab } from "./tabs/ReviewTab";
import { InstallationTab } from "./tabs/InstallationTab";
import { ProgramsTab } from "./tabs/ProgramsTab";
import { MessagesTab } from "./tabs/MessagesTab";
import { apiRequest } from "./lib/api";
import { useClients } from "./hooks/useClients";
import { useBilly } from "./hooks/useBilly";
import { SECTIONS } from "./tabs/sections";

const TABS = [
  { id: "home", label: "Home", icon: House },
  { id: "clients", label: "Clients", icon: Users },
  { id: "programs", label: "Programs", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageCircle },
];
/* Pages with no button on the bar, opened from elsewhere: My equipment, My
   exercises and, for the Primary Master, Review Coach IQ and Installation,
   all from the account menu. */
const PAGES = ["equipment", "exercises", "review", "installation"];
const KEY = "coach-tab";

/* As Studio decides it (its isPrimaryMaster); the server checks again. */
const isPrimaryMaster = (user) => !!user?.isPrimary && user?.role === "master";

/* Signed in: the header, the tab on screen, and the bar along the bottom.
   The tab is remembered for this browser tab only, so a reload stays put.
   The client list is held here, so Home can count it and the Clients tab
   opens on it without waiting, and asked for again on every change of tab
   so it never sits stale. */
export function Shell({ user, onLogout, onSignedOut }) {
  const [tab, setTab] = useState(() => {
    try { const t = sessionStorage.getItem(KEY); return TABS.some(x => x.id === t) || PAGES.includes(t) ? t : "home"; } catch { return "home"; }
  });
  useEffect(() => { try { sessionStorage.setItem(KEY, tab); } catch { /* not kept */ } }, [tab]);
  const clients = useClients(onSignedOut);
  const { refresh } = clients;
  useEffect(() => refresh(), [tab, refresh]);
  const billy = useBilly(onSignedOut);
  /* Messages from clients not yet read, on the Messages button (Studio's
     count on a tab), asked on every change of tab and every minute. */
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    const ask = () => apiRequest("GET", "/messages").then(d => setUnread(d.unread || 0)).catch(() => {});
    ask();
    const t = setInterval(ask, 60 * 1000);
    return () => clearInterval(t);
  }, [tab]);
  const open = (id) => { setTab(id); window.scrollTo({ top: 0 }); };
  /* From Today: a client's program, opened in Programs, or the client,
     opened out in Clients. */
  const openProgram = (id) => { try { sessionStorage.setItem("coach-program", id); } catch { /* not kept */ } open("programs"); };
  const openClient = (id) => { try { sessionStorage.setItem("coach-client", id); } catch { /* not kept */ } open("clients"); };

  return (
    <div className="min-h-dvh" style={{ background: "var(--paper)" }}>
      <Header user={user} onLogout={onLogout} billy={billy} onOpen={open} />
      {/* Room at the end for the bar floating over it. */}
      <main className="pb-32">
        {tab === "home" && <HomeTab user={user} onOpen={open} clients={clients.clients} unread={unread} onOpenProgram={openProgram} onOpenClient={openClient} onSignedOut={onSignedOut} />}
        {tab === "clients" && <ClientsTab {...clients} onSignedOut={onSignedOut} />}
        {tab === "programs" && <ProgramsTab clients={clients.clients} billy={billy} onSignedOut={onSignedOut} />}
        {tab === "messages" && <MessagesTab clients={clients.clients} onSignedOut={onSignedOut} onUnread={setUnread} />}
        {tab === "equipment" && <EquipmentTab onSignedOut={onSignedOut} />}
        {tab === "exercises" && <ExercisesTab onSignedOut={onSignedOut} />}
        {tab === "review" && isPrimaryMaster(user) && <ReviewTab onSignedOut={onSignedOut} />}
        {tab === "installation" && isPrimaryMaster(user) && <InstallationTab onSignedOut={onSignedOut} />}
        {SECTIONS[tab] && !SECTIONS[tab].built && <ComingSoonTab section={SECTIONS[tab]} />}
      </main>
      <BottomNav tabs={TABS.map(t => (t.id === "messages" ? { ...t, count: unread, countWord: "new" } : t))} activeTab={tab} onChange={open} />
    </div>
  );
}
