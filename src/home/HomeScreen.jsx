import React from "react";
import { CalendarDays, Users, ClipboardList, MessageCircle, KeyRound, ChevronRight } from "lucide-react";
import { Header } from "./Header";
import { STUDIO_URL } from "../lib/api";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

/* What Coach will hold. `to` is a screen that is built; the rest are
   placeholders, so the shape of the home screen can be judged before any of
   them is. */
const SECTIONS = [
  { icon: CalendarDays, title: "Today", body: "Your sessions for the day, at a glance." },
  { icon: Users, title: "Clients", body: "Everyone you coach, with their contact details and sessions.", to: "/clients" },
  { icon: ClipboardList, title: "Programs", body: "Workouts and plans you build and assign." },
  { icon: MessageCircle, title: "Messages", body: "Check-ins and notes between you and your clients." },
];

/* Under the Clients card: how many, once the list has come. */
function clientCount(clients) {
  if (clients === undefined) return "Loading…";
  const n = clients.filter(c => !c.archived).length;
  return `${n} active client${n === 1 ? "" : "s"}`;
}

export function HomeScreen({ user, onLogout, onOpen, clients }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--paper)" }}>
      <Header user={user} onLogout={onLogout} />

      {/* A cerulean band under the header, so the greeting has the sign-in
          screen's color and the page does not open on a blank grey. */}
      <section style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-7 pb-16">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{today}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{greeting()}, {firstName(user.name)}</h1>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 -mt-10 pb-12">
        {user.mustChangePassword && (
          <div className="cx-card p-4 mb-4 flex items-start gap-3" style={{ borderColor: "var(--accent)" }}>
            <KeyRound size={20} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <div className="text-sm">
              <strong className="block">You&apos;re signed in with a temporary password.</strong>
              <span style={{ color: "var(--iron)" }}>Choose your own in </span>
              <a href={STUDIO_URL} className="cx-link font-medium">Studio</a>
              <span style={{ color: "var(--iron)" }}> — it will work here too.</span>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ icon: Icon, title, body, to }) => {
            const inner = (
              <>
                <span className="flex-none w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
                  <Icon size={22} style={{ color: "var(--accent)" }} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-base">{title}</h2>
                    {to
                      ? title === "Clients" && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{clientCount(clients)}</span>
                      : <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)", color: "var(--iron)" }}>Coming soon</span>}
                  </div>
                  <p className="text-sm mt-1" style={{ color: "var(--iron)" }}>{body}</p>
                </div>
                {to && <ChevronRight size={20} className="flex-none self-center" style={{ color: "var(--accent)" }} aria-hidden="true" />}
              </>
            );
            return to
              ? <button key={title} onClick={() => onOpen(to)} className="cx-card p-5 flex gap-4 text-left transition-colors hover:border-[var(--cerulean)]">{inner}</button>
              : <div key={title} className="cx-card p-5 flex gap-4">{inner}</div>;
          })}
        </div>
      </main>
    </div>
  );
}
