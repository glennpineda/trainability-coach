import React, { useCallback, useEffect, useMemo, useState } from "react";
import { scrollPageTo } from "../lib/scroll";
import { Search, ChevronLeft, ChevronRight, Mail, Phone, Cake, CalendarCheck, CalendarClock, UserPlus, Users, RefreshCw, Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { fullName, clientInitials, longDate, birthday, plural } from "../clients/format";
import { TabHeading } from "./TabHeading";
import { Limitations } from "../clients/Limitations";
import { Measurements } from "../clients/Measurements";
import { ProgressPhotos } from "../clients/ProgressPhotos";
import { FitnessTests } from "../clients/FitnessTests";
import { ClientPrograms } from "../clients/ClientPrograms";
import { Face } from "../clients/Face";
import { useMySettings } from "../hooks/useUnits";
import { Toast } from "../chrome/Toast";
import { NoticeDialog } from "../chrome/NoticeDialog";
import { ConfirmDialog } from "../chrome/ConfirmDialog";
import { SegRow } from "../chrome/SegRow";
import { SuggestInput, GENDER_SUGGESTIONS, GENDER_MAX, PRONOUN_SUGGESTIONS, PRONOUNS_MAX, lowercase } from "../clients/SuggestInput";

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

/* Whether a client's measurements are due: never taken, or last taken at
   least `weeks` weeks ago (the trainer's setting; 0 is off). */
function measurementsDue(c, weeks) {
  if (!weeks || c.archived) return false;
  if (!c.lastMeasuredOn) return true;
  const days = (Date.now() - Date.parse(`${c.lastMeasuredOn}T00:00:00`)) / 864e5;
  return days >= weeks * 7;
}

/* One line on the list: the face, the name, and under it the last session
   and, when it's time, that measurements are due (Glenn, 19 Oct 2026). A tap
   opens the client's page. */
function ClientRow({ client: c, due, onOpen }) {
  return (
    <li className="border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
      <button type="button" onClick={onOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--ghost-fill)] transition-colors">
        <Face photoUrl={c.photoUrl} size={40}>
          <span className="rounded-full flex-none flex items-center justify-center font-semibold text-white w-10 h-10 text-sm"
            style={{ background: c.archived ? "#5B6B78" : "var(--fill-cerulean)" }} aria-hidden="true">
            {clientInitials(c)}
          </span>
        </Face>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold truncate">
            {fullName(c)}
            {c.pronouns && <span className="font-normal text-xs ml-1.5" style={{ color: "var(--iron)" }}>({c.pronouns})</span>}
          </span>
          <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>
            {lastLine(c)}
            {due && <> · <span className="font-medium" style={{ color: "var(--accent)" }}>Measurements due</span></>}
          </span>
        </span>
        <ChevronRight size={18} className="flex-none" style={{ color: "var(--iron)" }} aria-hidden="true" />
      </button>
    </li>
  );
}

/* The client's tabs, the long name and the one a phone shows. */
const CLIENT_TABS = [
  ["details", "Details & limitations", "Details"],
  /* Their programs (Run 1, U-9; Glenn, 19 Oct 2026: "Fifth tab: Programs",
     then "Programs should be ordered right after details"). */
  ["programs", "Programs", "Programs"],
  ["measurements", "Measurements", "Measurements"],
  ["photos", "Progress photos", "Photos"],
  ["tests", "Fitness tests", "Tests"],
];

/*
 * A client, opened from the list (Glenn, 19 Oct 2026: "each client item on
 * client tab, when clicked, should open its own dialog containing all the
 * content sections in its own tab in a tab band", then "Make that client
 * dialog fill the whole panel so it's large on desktop view", and "the client
 * dialog's title should be the client's name with a chevron pointing to the
 * left to go back to the client tab"). Studio's client dialog (its
 * ClientsTab.jsx, ClientDetailDialog): the person at the top, then a tab band
 * (its TabbedCard), each tab one part of their record. Here in the Clients
 * tab's own place, in place of the list, headed as a conversation in
 * Messages is: the back arrow, their face and their name. The band is
 * Coach's own segmented row (the list's Active · Archived).
 */
function ClientView({ client: c, onBack, onSignedOut, onEdit, onArchive, busy, onMeasured, onOpenProgram, onNewProgram }) {
  const [tab, setTab] = useState("details");
  const [asking, setAsking] = useState(false);   // the Archive question open
  const next = nextBooked(c);
  useEffect(() => { scrollPageTo({ top: 0 }); }, [c.id]);
  return (
    <div className="max-w-5xl mx-auto px-4">
      <div className="flex items-center gap-2 pt-4 pb-3">
        <button type="button" className="cx-icon-btn flex-none" aria-label="All clients" onClick={onBack}><ChevronLeft size={22} aria-hidden="true" /></button>
        <Face photoUrl={c.photoUrl} size={40}>
          <span className="rounded-full flex-none flex items-center justify-center font-semibold text-white w-10 h-10 text-sm"
            style={{ background: c.archived ? "#5B6B78" : "var(--fill-cerulean)" }} aria-hidden="true">{clientInitials(c)}</span>
        </Face>
        <div className="min-w-0 flex-1">
          <h1 className="cx-display text-xl truncate">{fullName(c)}</h1>
          <div className="text-xs truncate" style={{ color: "var(--iron)" }}>
            {[c.pronouns && `(${c.pronouns})`, lastLine(c), c.archived && "Archived"].filter(Boolean).join(" · ")}
          </div>
        </div>
        {/* Studio's archive: a quiet iron icon at the top right that only
            asks; the red button is in the question (its CONTRIBUTING,
            "Quiet on the row, weighty in the dialog"; Run 1, D-7). */}
        {onArchive && !c.archived && (
          <button type="button" className="cx-icon-btn flex-none" aria-label={`Archive ${fullName(c)}`} title="Archive" onClick={() => setAsking(true)} disabled={busy}>
            <Archive size={16} style={{ color: "var(--iron)" }} aria-hidden="true" />
          </button>
        )}
      </div>
      {asking && (
        <ConfirmDialog title={`Archive ${c.firstName || fullName(c)}?`} yes="Archive" no="Keep them" busy={busy}
          onYes={async () => { await onArchive(c, true); setAsking(false); }} onNo={() => setAsking(false)}>
          They go under Archived, with everything kept, and you can put them back on your list from there.
        </ConfirmDialog>
      )}
      {/* The record's parts: tabs that switch between things, Studio's
          picking look (SegRow; Run 1, D-3). The phone's names below 640px. */}
      <SegRow pick fit className="cx-seg-small" label={`${c.firstName || "Client"}'s record`} value={tab} onPick={setTab} panelId="client-panel" idOf={(key) => `client-tab-${key}`}
        items={CLIENT_TABS.map(([key, long, short]) => ({ key, label: <><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{long}</span></> }))} />
      <div id="client-panel" role="tabpanel" aria-labelledby={`client-tab-${tab}`} className="cx-card mt-3 p-4 sm:p-5">
        {tab === "details" && (
          <div className="grid sm:grid-cols-2 gap-x-6">
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
            {(onEdit || (onArchive && c.archived)) && (
              <div className="sm:col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 mt-1 border-t" style={{ borderColor: "var(--iron-line)" }}>
                {onEdit && <button type="button" className="cx-btn-row" onClick={() => onEdit(c)} disabled={busy}><Pencil size={15} aria-hidden="true" /> Edit details</button>}
                {onArchive && c.archived && <button type="button" className="text-sm cx-link" onClick={() => onArchive(c, false)} disabled={busy}><ArchiveRestore size={15} aria-hidden="true" /> Put back on my list</button>}
              </div>
            )}
          </div>
        )}
        {tab === "measurements" && <Measurements clientId={c.id} onSignedOut={onSignedOut} onChanged={onMeasured} inTab />}
        {tab === "photos" && <ProgressPhotos client={c} onSignedOut={onSignedOut} inTab />}
        {tab === "tests" && <FitnessTests client={c} onSignedOut={onSignedOut} inTab />}
        {tab === "programs" && <ClientPrograms client={c} onSignedOut={onSignedOut} onOpenProgram={onOpenProgram} onNewProgram={onNewProgram} />}
      </div>
    </div>
  );
}

/* Adding a client, or changing one's details: Studio's four things a client
   must have (first and last name, email, phone), and a birthday, gender and
   pronouns if known. Kept in Studio without the trainer having to know it (Glenn, 18
   Oct 2026: "this is seemless and they don't need to know where it's
   stored"); somebody already there by the same email goes on this trainer's
   list instead of being made twice (server/index.js, POST /api/clients). */
function ClientForm({ initial, onAdd, onDone, onCancel }) {
  const editing = !!initial;
  const [f, setF] = useState(() => ({ firstName: "", lastName: "", email: "", phone: "", dateOfBirth: "", gender: "", pronouns: "",
    ...(initial ? { firstName: initial.firstName || "", lastName: initial.lastName || "", email: initial.email || "", phone: initial.phone || "", dateOfBirth: initial.dateOfBirth || "", gender: initial.gender || "", pronouns: initial.pronouns || "" } : {}) }));
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
      setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message || (editing ? "Those changes couldn't be saved. Try again." : "That client couldn't be added. Try again."));
    } finally { setBusy(false); }
  };
  return (
    <form className="cx-card p-4 mb-4 grid gap-3" onSubmit={save}>
      <h2 className="cx-display text-xl">{editing ? `Edit ${initial.firstName || "client"}'s details` : "Add a client"}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {lab("First name", input("firstName", { required: true, maxLength: 90, autoComplete: "off" }))}
        {lab("Last name", input("lastName", { required: true, maxLength: 90, autoComplete: "off" }))}
        {lab("Email", input("email", { required: true, type: "email", maxLength: 190, autoComplete: "off" }))}
        {lab("Phone", input("phone", { required: true, type: "tel", maxLength: 40, autoComplete: "off" }))}
        {lab("Birthday (optional)", input("dateOfBirth", { type: "date" }))}
        <div className="hidden sm:block" />
        {/* Gender and pronouns side by side, as Studio's form has them: a box
            to type in with common choices behind the arrow. */}
        {lab("Gender (optional)", <SuggestInput value={f.gender} onChange={(v) => setF(d => ({ ...d, gender: v }))} suggestions={GENDER_SUGGESTIONS} maxLength={GENDER_MAX} />)}
        {lab("Pronouns (optional)", <SuggestInput value={f.pronouns} onChange={(v) => setF(d => ({ ...d, pronouns: v }))} suggestions={PRONOUN_SUGGESTIONS} maxLength={PRONOUNS_MAX} transform={lowercase} />)}
      </div>
      {!editing && (
        <p className="text-xs" style={{ color: "var(--iron)" }}>
          If they're already a client of ours, with this email, they're added to your list instead.
        </p>
      )}
      {error && <p className="text-sm" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy}>{busy ? (editing ? "Saving…" : "Adding…") : (editing ? "Save" : "Add client")}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* What the trainer is told once a client is added, by what Studio did: a
   toast for the short ones; a notice with OK when the person on the list is
   somebody already ours, since the name typed may not be theirs (Run 1, U-4). */
const ADDED = {
  added: (n) => ({ toast: `${n} added.` }),
  back: (n) => ({ toast: `${n} is back on your list.` }),
  linked: (n) => ({ title: "Already a client of ours", text: `${n} was already a client of ours, with that email, so they're on your list now.` }),
  already: (n) => ({ title: "Already on your list", text: `${n} is already on your list, with that email.` }),
};

/* The Clients tab: everyone on this trainer's own list, kept in Studio and
   read from there (useClients): added, changed, archived and put back here,
   with nothing on the page saying where they are kept. */
/* A linked Coach account's clients, still kept in Coach, offered a move into
   Trainability, said plainly because it changes who can see them (Glenn, 18
   Oct 2026: "someone that creates an account on Coach doesn't necessarily
   have to be part of the business on Studio"). Not now hides it until the
   page is opened again. */
function MoveOffer({ count, move }) {
  const [busy, setBusy] = useState(false);
  const [later, setLater] = useState(false);
  const [result, setResult] = useState(null);
  if (result) {
    return (
      <div className="cx-card p-4 mb-4 text-sm grid gap-2" role="status">
        <p>{result.moved ? `${plural(result.moved, "client")} moved to Trainability.` : "No clients were moved."}</p>
        {result.kept?.length > 0 && (
          <>
            <p style={{ color: "var(--iron)" }}>These stayed as they are, so only you can see them:</p>
            <ul className="list-disc pl-5" style={{ color: "var(--iron)" }}>
              {result.kept.map(k => <li key={k.name}><span style={{ color: "var(--ink)" }}>{k.name}</span>: {k.why}</li>)}
            </ul>
          </>
        )}
        <button type="button" className="cx-quiet justify-self-start text-sm" onClick={() => setResult(null)}>OK</button>
      </div>
    );
  }
  if (!count || later) return null;
  const go = async () => {
    setBusy(true);
    try { setResult(await move()); }
    catch (err) { setResult({ moved: 0, kept: [{ name: "Your clients", why: err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Try again in a minute." : err.message }] }); }
    finally { setBusy(false); }
  };
  return (
    <div className="cx-card p-4 mb-4 grid gap-3">
      <p className="text-sm">
        <strong>{plural(count, "client")} from your Coach account {count === 1 ? "isn't" : "aren't"} in Trainability yet.</strong>{" "}
        Move them there? Trainability (the business) will be able to see them, as it sees all its clients. Until then, only you can.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="cx-btn-primary px-4 py-2 text-sm" disabled={busy} onClick={go}>{busy ? "Moving…" : "Move them to Trainability"}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" disabled={busy} onClick={() => setLater(true)}>Not now</button>
      </div>
    </div>
  );
}

export function ClientsTab({ clients, error, retry, refresh, add, edit, archive, toMove, move, onSignedOut, onOpenProgram, onNewProgram }) {
  const [{ measureEvery }] = useMySettings();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  /* The client open: already, when Today sent the trainer here. */
  const [openId, setOpenId] = useState(() => { try { const id = sessionStorage.getItem("coach-client"); sessionStorage.removeItem("coach-client"); return id || null; } catch { return null; } });
  const [adding, setAdding] = useState(false);   // true, or the client whose details are being changed
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  /* An outcome shown over whichever is on screen, the list or the client's
     page that opens after adding or saving: a toast, or a notice with OK. */
  const [toast, setToast] = useState(null);
  const [notice, setNotice] = useState(null);
  const toastGone = useCallback(() => setToast(null), []);
  const outcome = (
    <>
      <Toast toast={toast} onGone={toastGone} />
      {notice && <NoticeDialog title={notice.title} onClose={() => setNotice(null)}>{notice.lines.map(l => <p key={l}>{l}</p>)}</NoticeDialog>}
    </>
  );
  const archiveOne = async (c, on) => {
    setBusy(true); setSaid("");
    try {
      await archive(c.id, on);
      setSaid(on ? `${fullName(c)} archived. They're under Archived.` : `${fullName(c)} is back on your list.`);
      setShowArchived(!on); setOpenId(null);
    } catch (err) {
      setSaid(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
    } finally { setBusy(false); }
  };

  const active = useMemo(() => (clients || []).filter(c => !c.archived), [clients]);
  const archived = useMemo(() => (clients || []).filter(c => c.archived), [clients]);
  const list = showArchived ? archived : active;
  /* The client whose dialog is open, from the list as it now stands. */
  const open = (clients || []).find(c => c.id === openId) || null;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    const digits = q.replace(/\D/g, "");
    return list.filter(c =>
      fullName(c).toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits)));
  }, [list, query]);

  /* A client open: their page, in place of the list. */
  if (open) {
    return (
      <>
      {outcome}
      <ClientView key={open.id} client={open} onBack={() => setOpenId(null)} onSignedOut={onSignedOut} busy={busy} onMeasured={refresh} onOpenProgram={onOpenProgram} onNewProgram={onNewProgram}
        onEdit={edit ? (x) => { setOpenId(null); setAdding(x); setSaid(""); scrollPageTo({ top: 0, behavior: "smooth" }); } : null}
        onArchive={archive ? archiveOne : null} />
      </>
    );
  }
  return (
    <div className="max-w-5xl mx-auto px-4">
      {outcome}
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
      {move && <MoveOffer count={toMove} move={move} />}
      {adding && (
        <ClientForm key={adding === true ? "new" : adding.id} initial={adding === true ? null : adding}
          onAdd={adding === true ? add : (fields) => edit(adding.id, fields)} onCancel={() => setAdding(false)}
          onDone={(out, typed) => {
            const c = (out.clients || []).find(x => x.id === out.clientId);
            const name = c ? fullName(c) : typed;
            const said = adding === true ? (ADDED[out.done] || ADDED.added)(name) : { toast: `${name}'s details saved.` };
            if (said.toast) setToast({ message: said.toast, id: Date.now() });
            else {
              const other = typed && name.toLowerCase() !== typed.toLowerCase();
              setNotice({ title: said.title, lines: [said.text, ...(other ? [`The name you typed, ${typed}, wasn't used: that email is ${name}'s.`] : [])] });
            }
            setAdding(false); setQuery(""); setShowArchived(!!c?.archived); setOpenId(out.clientId);
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
          {/* A filter of one list: Studio's grey look (SegRow; Run 1, D-3). */}
          <SegRow className="flex-none sm:w-64" label="Which clients" value={showArchived ? "archived" : "active"}
            onPick={(k) => { setShowArchived(k === "archived"); setOpenId(null); }}
            items={[{ key: "active", label: "Active", figure: clients === undefined ? null : active.length }, { key: "archived", label: "Archived", figure: clients === undefined ? null : archived.length }]} />
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
              : "You have no clients yet. Tap Add a client to add your first."}
          </p>
        ) : (
          <ul>
            {shown.map(c => (
              <ClientRow key={c.id} client={c} due={measurementsDue(c, measureEvery)} onOpen={() => setOpenId(c.id)} />
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
