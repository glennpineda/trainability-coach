import React, { useMemo, useState } from "react";
import { ArrowLeft, Search, ChevronDown, Mail, Phone, Cake, CalendarCheck, CalendarClock, UserPlus, Users, RefreshCw, ExternalLink } from "lucide-react";
import { Header } from "../home/Header";
import { STUDIO_URL } from "../lib/api";
import { fullName, clientInitials, longDate, birthday, plural } from "./format";

/* What "Last session" says under a name: the date, or that there has not been
   one. */
function lastLine(c) {
  if (c.lastSessionOn) return `Last session ${longDate(c.lastSessionOn)}`;
  if (c.latestSessionOn) return `First session booked for ${longDate(c.latestSessionOn)}`;
  return "No sessions yet";
}

/* A session booked after the last one, so still to come. */
const nextBooked = (c) => (c.latestSessionOn && c.latestSessionOn !== c.lastSessionOn ? c.latestSessionOn : null);

function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon size={18} className="flex-none mt-0.5" style={{ color: "var(--accent)" }} aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-xs" style={{ color: "var(--iron)" }}>{label}</div>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

function ClientRow({ client: c, open, onToggle }) {
  const next = nextBooked(c);
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
      <button onClick={onToggle} aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ghost-fill)] transition-colors">
        <span className="rounded-full flex-none flex items-center justify-center font-semibold text-white w-10 h-10 text-sm"
          style={{ background: c.archived ? "var(--iron)" : "var(--cerulean)" }} aria-hidden="true">
          {clientInitials(c)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold truncate">
            {fullName(c)}
            {c.pronouns && <span className="font-normal text-xs ml-1.5" style={{ color: "var(--iron)" }}>({c.pronouns})</span>}
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>{lastLine(c)}</span>
        </span>
        <ChevronDown size={18} className={`flex-none transition-transform ${open ? "rotate-180" : ""}`} style={{ color: "var(--iron)" }} aria-hidden="true" />
      </button>
      {open && (
        <div className="px-4 pb-3 pl-[4.25rem] grid sm:grid-cols-2 gap-x-6">
          <Detail icon={Mail} label="Email">
            {c.email ? <a href={`mailto:${c.email}`} className="cx-link">{c.email}</a> : <span style={{ color: "var(--iron)" }}>Not given</span>}
          </Detail>
          <Detail icon={Phone} label="Phone">
            {c.phone ? <a href={`tel:${c.phone.replace(/[^\d+]/g, "")}`} className="cx-link">{c.phone}</a> : <span style={{ color: "var(--iron)" }}>Not given</span>}
          </Detail>
          <Detail icon={Cake} label="Birthday">
            {birthday(c.dateOfBirth) || <span style={{ color: "var(--iron)" }}>Not given</span>}
          </Detail>
          <Detail icon={UserPlus} label="Your client since">
            {c.since ? longDate(c.since, true) : <span style={{ color: "var(--iron)" }}>Not known</span>}
          </Detail>
          <Detail icon={CalendarCheck} label="Last session">
            {c.lastSessionOn ? longDate(c.lastSessionOn, true) : <span style={{ color: "var(--iron)" }}>None yet</span>}
          </Detail>
          <Detail icon={CalendarClock} label="Next booked">
            {next ? longDate(next, true) : <span style={{ color: "var(--iron)" }}>Nothing booked</span>}
          </Detail>
          {c.sharedWith > 0 && (
            <Detail icon={Users} label="Shared">
              Also trains with {plural(c.sharedWith, "other trainer")}
            </Detail>
          )}
        </div>
      )}
    </li>
  );
}

export function ClientsScreen({ user, onLogout, onHome, clients, error, retry }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState(null);

  const active = useMemo(() => (clients || []).filter(c => !c.archived), [clients]);
  const archived = useMemo(() => (clients || []).filter(c => c.archived), [clients]);
  const list = showArchived ? archived : active;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    const digits = q.replace(/\D/g, "");
    return list.filter(c =>
      fullName(c).toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)));
  }, [list, query]);

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--paper)" }}>
      <Header user={user} onLogout={onLogout} />

      <section style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 100%)" }}>
        <div className="max-w-5xl mx-auto px-4 pt-5 pb-16">
          <button onClick={onHome} className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 hover:text-white">
            <ArrowLeft size={16} aria-hidden="true" /> Home
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">Clients</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>
            {clients === undefined ? "Loading…" : `${plural(active.length, "active client")}`}
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-4 -mt-10 pb-12">
        <div className="cx-card p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <span className="sr-only">Search clients</span>
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--iron)" }} aria-hidden="true" />
              <input type="search" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, email or phone" className="cx-input" style={{ paddingLeft: "2.4rem" }} />
            </label>
            <div className="flex rounded-[10px] p-1 gap-1 flex-none" style={{ background: "var(--ghost-fill)" }} role="tablist">
              {[[false, "Active", active.length], [true, "Archived", archived.length]].map(([value, label, n]) => (
                <button key={label} role="tab" aria-selected={showArchived === value}
                  onClick={() => { setShowArchived(value); setOpenId(null); }}
                  className="flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={showArchived === value
                    ? { background: "var(--chalk)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" }
                    : { color: "var(--iron)" }}>
                  {label}{clients !== undefined && ` (${n})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cx-card mt-4 overflow-hidden">
          {error ? (
            <div className="p-6 text-center">
              <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>
              <button onClick={retry} className="cx-btn-primary mt-3 px-4 py-2 text-sm inline-flex items-center gap-2">
                <RefreshCw size={16} aria-hidden="true" /> Try again
              </button>
            </div>
          ) : clients === undefined ? (
            <p className="p-6 text-center text-sm" style={{ color: "var(--iron)" }}>Loading your clients…</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-sm" style={{ color: "var(--iron)" }}>
              {query.trim() ? `No one matches “${query.trim()}”.`
                : showArchived ? "You have no archived clients."
                : "You have no clients yet. Clients you add in Studio show here."}
            </p>
          ) : (
            <ul>
              {shown.map(c => (
                <ClientRow key={c.id} client={c} open={openId === c.id} onToggle={() => setOpenId(id => (id === c.id ? null : c.id))} />
              ))}
            </ul>
          )}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--iron)" }}>
          Your clients are kept in Studio. To add a client or change their details,{" "}
          <a href={STUDIO_URL} className="cx-link">open Studio <ExternalLink size={12} aria-hidden="true" /></a>.
        </p>
      </main>
    </div>
  );
}
