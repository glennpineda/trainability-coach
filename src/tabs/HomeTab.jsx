import React from "react";
import { KeyRound } from "lucide-react";
import { STUDIO_URL } from "../lib/api";
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
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <>
      {/* A cerulean band, so the greeting has the sign-in screen's color and
          the page does not open on a blank grey. */}
      <section style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-7 pb-16">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{today}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-1">{greeting()}, {firstName(user.name)}</h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 -mt-10">
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
          {Object.entries(SECTIONS).map(([id, section]) => (
            <ComingSoonCard key={id} section={section} onOpen={id === "today" ? undefined : () => onOpen(id)}
              badge={id === "clients" ? clientCount(clients) : undefined} />
          ))}
        </div>
      </div>
    </>
  );
}
