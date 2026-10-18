import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import { SECTIONS } from "./sections";
import { ComingSoonCard } from "./ComingSoonCard";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
const firstName = (name = "") => name.trim().split(/\s+/)[0] || "there";

/* On the Clients card: how many, once the list has come. */
function clientCount(clients) {
  if (clients === undefined) return "Loading…";
  const n = clients.filter(c => !c.archived).length;
  return `${n} active client${n === 1 ? "" : "s"}`;
}

/* Where Coach opens: the date, a greeting by name, and the parts of Coach on
   the way. Each card but Today opens its own tab. */
export function HomeTab({ user, onOpen, clients }) {
  const [linked, setLinked] = useState(() => { try { const v = sessionStorage.getItem("cx-linked"); sessionStorage.removeItem("cx-linked"); return !!v; } catch { return false; } });
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <>
      {/* A cerulean band, so the greeting has the sign-in screen's color and
          the page does not open on a blank grey. */}
      <section style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-7 pb-16">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{today}</p>
          <h1 className="cx-display text-3xl sm:text-4xl text-white mt-1">{greeting()}, {firstName(user.name)}</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 -mt-10">
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
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(SECTIONS).map(([id, section]) => (
            <ComingSoonCard key={id} section={section} onOpen={id === "today" ? undefined : () => onOpen(id)}
              badge={id === "clients" ? clientCount(clients) : undefined} />
          ))}
        </div>
      </div>
    </>
  );
}
