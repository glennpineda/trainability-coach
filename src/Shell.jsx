import React, { useCallback, useEffect, useState } from "react";
import { scrollPageTo } from "./lib/scroll";
import { House, Users, ClipboardList, MessageCircle, FoldHorizontal, UnfoldHorizontal } from "lucide-react";
import { Header } from "./chrome/Header";
import { DriftingHexes } from "./chrome/DriftingHexes";
import { HexBackdrop } from "./auth/HexBackdrop";
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
export function Shell({ user, onLogout, onSignedOut, chooseLook, chooseWide }) {
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
  const open = (id) => { setTab(id); scrollPageTo({ top: 0 }); };
  /* A notification tapped (public/push-sw.js): its address says where, such
     as /?open=messages&client=… for a client's message. Opened from scratch
     the address is the page's own, read once and tidied away; with Coach
     already open, the worker says it in a message instead. The Messages tab
     is started again so it opens on that conversation. */
  const [opened, setOpened] = useState(0);
  const goTo = useCallback((href) => {
    let at;
    try { at = new URL(href, window.location.origin); } catch { return; }
    const where = at.searchParams.get("open");
    if (where !== "messages") return;
    const client = at.searchParams.get("client");
    try { client ? sessionStorage.setItem("coach-thread", client) : sessionStorage.removeItem("coach-thread"); } catch { /* not kept */ }
    setOpened(n => n + 1);
    open("messages");
  }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("open")) {
      goTo(window.location.href);
      window.history.replaceState(null, "", "/");
    }
    const heard = (e) => { if (e.data?.type === "push-open") goTo(e.data.url); };
    navigator.serviceWorker?.addEventListener("message", heard);
    return () => navigator.serviceWorker?.removeEventListener("message", heard);
  }, [goTo]);
  /* From Today: a client's program, opened in Programs, or the client,
     opened out in Clients. */
  const openProgram = (id) => { try { sessionStorage.setItem("coach-program", id); } catch { /* not kept */ } open("programs"); };
  const openClient = (id) => { try { sessionStorage.setItem("coach-client", id); } catch { /* not kept */ } open("clients"); };

  /* Studio's app shell (its App.jsx, .iw-app-shell; Glenn, 19 Oct 2026:
     "Studio has this panel with rounded borders that encapsulates all the
     content of the app, can we do the same here?"): from a small tablet up,
     the whole app is one rounded card floating on the sign-in screen's field,
     the page scrolling inside it and the tab bar at its foot. On a phone it
     is the whole screen, as it was (src/index.css, "app shell"). */
  const wide = !!user?.wideScreen;
  return (
    <div className={`cx-root${wide ? " cx-wide" : ""}`}>
      <div className="cx-app-backdrop" aria-hidden="true" style={{ background: "var(--ground)" }}><HexBackdrop /></div>
      {/* Studio's wide screen (its App.jsx; Glenn, 19 Oct 2026): the app takes
          the window, with the same ground at its sides as above and below it.
          The button hangs off the panel's right side, half way down, and is
          drawn only where the window is wider than the panel can be
          (index.css, .cx-wide-btn). Its holder has no width, so the panel
          stays in the middle. Kept with the person: shared with Studio. */}
      {chooseWide && (
        <span className="cx-wide-at"><button type="button" className="cx-wide-btn" onClick={() => chooseWide(!wide)} aria-pressed={wide}
          aria-label={wide ? "Leave wide screen" : "Wide screen"} title={wide ? "Leave wide screen" : "Wide screen"}>
          {wide ? <FoldHorizontal size={22} aria-hidden="true" /> : <UnfoldHorizontal size={22} aria-hidden="true" />}
        </button></span>
      )}
      <div className="cx-app-shell">
      {/* Studio's drifting hexagons, in Coach's blues, behind every page
          (Glenn, 18 Oct 2026), held to the window (on a phone) or the card as
          Studio's sign-in screen holds them; at full strength behind the
          header and the tab bar, a share of that behind the page, as Studio's
          are (bodyShare 0.75). */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <DriftingHexes bodyShare={0.75} />
      </div>
      <div className="cx-app-scroll">
      <Header user={user} onLogout={onLogout} billy={billy} onOpen={open} chooseLook={chooseLook} />
      {/* Room at the end for the bar floating over it; over the hexagons. */}
      <main className="pb-32 relative z-[1]">
        {tab === "home" && <HomeTab user={user} onOpen={open} clients={clients.clients} unread={unread} onOpenProgram={openProgram} onOpenClient={openClient} onSignedOut={onSignedOut} />}
        {tab === "clients" && <ClientsTab {...clients} onSignedOut={onSignedOut} />}
        {tab === "programs" && <ProgramsTab clients={clients.clients} billy={billy} onSignedOut={onSignedOut} />}
        {tab === "messages" && <MessagesTab key={opened} clients={clients.clients} onSignedOut={onSignedOut} onUnread={setUnread} />}
        {tab === "equipment" && <EquipmentTab onSignedOut={onSignedOut} />}
        {tab === "exercises" && <ExercisesTab onSignedOut={onSignedOut} />}
        {tab === "review" && isPrimaryMaster(user) && <ReviewTab onSignedOut={onSignedOut} />}
        {tab === "installation" && isPrimaryMaster(user) && <InstallationTab onSignedOut={onSignedOut} />}
        {SECTIONS[tab] && !SECTIONS[tab].built && <ComingSoonTab section={SECTIONS[tab]} />}
      </main>
      </div>
      <BottomNav tabs={TABS.map(t => (t.id === "messages" ? { ...t, count: unread, countWord: "new" } : t))} activeTab={tab} onChange={open} />
      </div>
    </div>
  );
}
