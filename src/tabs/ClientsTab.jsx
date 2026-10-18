import React, { useMemo, useState } from "react";
import { Search, ChevronDown, Mail, Phone, Cake, CalendarCheck, CalendarClock, UserPlus, Users, RefreshCw, Plus } from "lucide-react";
import { fullName, clientInitials, longDate, birthday, plural } from "../clients/format";
import { TabHeading } from "./TabHeading";
import { Limitations } from "../clients/Limitations";

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

function ClientRow({ client: c, open, onToggle, onSignedOut }) {
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
          <Limitations clientId={c.id} onSignedOut={onSignedOut} />
        </div>
      )}
    </li>
  );
}

/* Adding a client: Studio's four things a client must have (first and last
   name, email, phone), and a birthday and pronouns if known. Kept in Studio;
   somebody Studio already has, by the same email, goes on this trainer's
   list instead of being made twice (server/index.js, POST /api/clients). */
function AddClient({ onAdd, onDone, onCancel }) {
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", pronouns: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF(d => ({ ...d, [k]: e.target.value }));
  const lab = (name, el) => <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>{name}{el}</label>;
  const input = (k, props = {}) => <input className="cx-input" value={f[k]} onChange={set(k)} style={{ color: "var(--ink)" }} {...props} />;
  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      onDone(await onAdd(f), `${f.firstName.trim()} ${f.lastName.trim()}`.trim());
    } catch (err) {
      setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message || "That client couldn't be added. Try again.");
    } finally { setBusy(false); }
  };
  return (
    <form className="cx-card p-4 mb-4 grid gap-3" onSubmit={save}>
      <h2 className="cx-display text-xl">Add a client</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {lab("First name", input("firstName", { required: true, maxLength: 90, autoComplete: "off" }))}
        {lab("Last name", input("lastName", { required: true, maxLength: 90, autoComplete: "off" }))}
        {lab("Email", input("email", { required: true, type: "email", maxLength: 190, autoComplete: "off" }))}
        {lab("Phone", input("phone", { required: true, type: "tel", maxLength: 40, autoComplete: "off" }))}
        {lab("Birthday (optional)", input("dateOfBirth", { type: "date" }))}
        {lab("Pronouns (optional)", input("pronouns", { maxLength: 30, placeholder: "Such as she/her" }))}
      </div>
      <p className="text-xs" style={{ color: "var(--iron)" }}>
        Kept in Studio, with your other clients. If Studio already has someone with this email, they're added to your list instead.
      </p>
      {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy}>{busy ? "Adding…" : "Add client"}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* What the trainer is told once a client is added, by what Studio did. */
const ADDED = {
  added: (n) => `${n} added.`,
  linked: (n) => `${n} was already in Studio, so they're on your list now.`,
  back: (n) => `${n} is back on your list.`,
  already: (n) => `${n} is already on your list.`,
};

/* The Clients tab: everyone on this trainer's own list in Studio, read from
   Studio (useClients), and new clients added to it (kept in Studio too). */
export function ClientsTab({ clients, error, retry, add, onSignedOut }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [said, setSaid] = useState("");

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
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>Clients</TabHeading>
      <div className="flex items-center justify-between gap-3 -mt-3 mb-4">
        <p className="text-sm" style={{ color: "var(--iron)" }}>
          {clients === undefined ? "Loading…" : plural(active.length, "active client")}
        </p>
        {add && !adding && (
          <button type="button" className="cx-btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5" onClick={() => { setAdding(true); setSaid(""); }}>
            <Plus size={16} aria-hidden="true" /> Add a client
          </button>
        )}
      </div>
      {said && <p className="text-sm mb-3" role="status" style={{ color: "var(--accent)" }}>{said}</p>}
      {adding && (
        <AddClient onAdd={add} onCancel={() => setAdding(false)}
          onDone={(out, typed) => {
            const c = (out.clients || []).find(x => x.id === out.clientId);
            setSaid((ADDED[out.done] || ADDED.added)(c ? fullName(c) : typed));
            setAdding(false); setQuery(""); setShowArchived(false); setOpenId(out.clientId);
          }} />
      )}

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
            <button onClick={retry} className="cx-btn-row mt-3">
              <RefreshCw size={16} aria-hidden="true" /> Try again
            </button>
          </div>
        ) : clients === undefined ? (
          <p className="p-6 text-center text-sm" style={{ color: "var(--iron)" }}>Loading your clients…</p>
        ) : shown.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: "var(--iron)" }}>
            {query.trim() ? `No one matches “${query.trim()}”.`
              : showArchived ? "You have no archived clients."
              : "You have no clients yet. Tap Add a client, or add them in Studio."}
          </p>
        ) : (
          <ul>
            {shown.map(c => (
              <ClientRow key={c.id} client={c} open={openId === c.id} onSignedOut={onSignedOut} onToggle={() => setOpenId(id => (id === c.id ? null : c.id))} />
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs mt-4 text-center" style={{ color: "var(--iron)" }}>
        Your clients are kept in Studio. To change a client's details, use Studio.
      </p>
    </div>
  );
}
