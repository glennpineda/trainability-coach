import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import { SECTIONS } from "./sections";
import { ComingSoonCard } from "./ComingSoonCard";
import { TodayCard } from "./TodayCard";
import { SamePlaces } from "../chrome/SamePlaces";
import { measurementsDue } from "../lib/measures";
import { useMySettings } from "../hooks/useUnits";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

/* On the Clients card: how many, once the list has come, and how many are
   due for measurements (Run 1, I-1). */
function clientCount(clients, weeks) {
  if (clients === undefined) return "Loading…";
  const n = clients.filter(c => !c.archived).length;
  const due = clients.filter(c => measurementsDue(c, weeks)).length;
  return `${n} active client${n === 1 ? "" : "s"}${due ? ` · ${due} due for measurements` : ""}`;
}

/* Where Coach opens: the date, a greeting by name, the day's sessions
   (TodayCard), and a card for each of the other parts of Coach, opening its
   own tab. */
export function HomeTab({ user, onOpen, clients, unread = 0, onOpenProgram, onOpenClient, onSignedOut }) {
  const [linked, setLinked] = useState(() => { try { const v = sessionStorage.getItem("cx-linked"); sessionStorage.removeItem("cx-linked"); return !!v; } catch { return false; } });
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const [{ measureEvery }] = useMySettings();
  return (
    <>
      <SamePlaces />
      {/* A cerulean band, so the greeting has the sign-in screen's color and
          the page does not open on a blank grey. A gradient you can see
          (Glenn, 18 Oct 2026: "make the top colored header on the home tab
          gradient"): deep cerulean under the words, cerulean, then sky at
          the far corner where nothing is written (the theme's three, look.css).
          And no edge at its foot (Glenn: "That is not a gradient.. that's a
          sharp border"): it runs on down behind the first card, fading out
          into the page (.cx-band, index.css). */}
      <section className="cx-band" style={{ background: "linear-gradient(115deg, var(--band-from) 0%, var(--band-via) 45%, var(--band-to) 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-7 pb-32">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{today}</p>
          <h1 className="cx-display text-3xl sm:text-4xl text-white mt-1">{greeting()}, {firstName(user.name)}</h1>
        </div>
      </section>

      {/* Over the band: its fade (a mask) makes it a layer of its own, which
          would otherwise be drawn on top of the cards (Glenn: "put the today
          contents on top of that gradient band"). */}
      <div className="relative max-w-5xl mx-auto px-4 -mt-[6.5rem]">
        {linked && (
          /* Once, just after a Coach account was joined to its Trainability
             account (stage three). */
          <div className="cx-card p-4 mb-4 flex items-start gap-3" role="status" style={{ borderColor: "var(--accent)" }}>
            <Link2 size={20} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
            <div className="text-sm flex-1">
              <strong className="block">Your Coach account is now connected to your Trainability account.</strong>
              <span style={{ color: "var(--iron)" }}>From now on, sign in with your Trainability password. Everything you made in Coach is still here.</span>
            </div>
            <button type="button" className="cx-icon-btn" aria-label="Dismiss" onClick={() => setLinked(false)}><X size={16} aria-hidden="true" /></button>
          </div>
        )}
        {/* A Coach account has no schedule and no messages to clients (both
            come through Trainability), so neither card shows for it until it
            is linked (Run 1, U-10; Glenn, 19 Oct 2026: "Hide them"). */}
        {!user.coachAccount && <TodayCard onOpenProgram={onOpenProgram} onOpenClient={onOpenClient} onSignedOut={onSignedOut} />}
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(SECTIONS).filter(([id]) => id !== "today" && !(user.coachAccount && id === "messages")).map(([id, section]) => (
            <ComingSoonCard key={id} section={section} onOpen={() => onOpen(id)}
              badge={id === "clients" ? clientCount(clients, measureEvery) : id === "messages" && unread ? `${unread} new` : undefined} />
          ))}
        </div>
      </div>
    </>
  );
}
