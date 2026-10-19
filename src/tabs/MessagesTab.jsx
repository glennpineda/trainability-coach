import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, HeartPulse, ChevronLeft, ClipboardList, Loader2, MessageCircle, Paperclip, PenSquare, Image as ImageIcon, Ruler, Search, X, RefreshCw } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";
import { uploadAttachment, fileUrl } from "../messages/upload";
import { rowsOf } from "../lib/measures";
import { describe, titleOf } from "../lib/fitness-tests";
import { Face } from "../clients/Face";

/*
 * Messages (Glenn, 18 Oct 2026: "Let's do messages now, apart from basic
 * messaging, we should be able to attach pictures, videos, workout programs,
 * and even measurements (we are adding in the future)"). The trainer's
 * side: their conversations, newest first, and one client's opened, with a
 * box to write in and a paperclip for a picture or video, a program, and
 * measurements (a set from the client's details). The client reads and answers on Studio's
 * client page; Coach keeps the messages (server/messages.js).
 *
 * Studio has no messaging to copy. The bubbles are Billy's panel's (the
 * trainer's own words in the accent's pale fill, on the right), the send
 * button and paperclip are his, and the bottom bar's count is Studio's.
 */

const STORE = "coach-thread";
const initials = (c) => `${(c.firstName || c.clientName || "")[0] || ""}${(c.lastName || (c.clientName || "").split(" ")[1] || "")[0] || ""}`.toUpperCase();
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function when(iso) {
  const d = new Date(iso);
  if (sameDay(d, Date.now())) return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
const dayLine = (iso) => (sameDay(iso, Date.now()) ? "Today"
  : sameDay(iso, Date.now() - 864e5) ? "Yesterday"
  : new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }));
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* Their photo from Studio, else their initials. */
function Initials({ who, size = 40 }) {
  return (
    <Face photoUrl={who.photoUrl} size={size}>
      <span className="flex-none rounded-full flex items-center justify-center text-sm font-semibold"
        style={{ width: size, height: size, background: "var(--accent-soft)", color: "var(--accent)" }} aria-hidden="true">
        {initials(who)}
      </span>
    </Face>
  );
}

/* What the list says of the last message. */
function lastLine(c) {
  if (!c.last) return "";
  const words = c.last.text || (c.last.attachments ? plural(c.last.attachments, "attachment") : "");
  return c.last.authorKind === "trainer" ? `You: ${words}` : words;
}

export function MessagesTab({ clients, onSignedOut, onUnread }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(() => { try { return sessionStorage.getItem(STORE) || null; } catch { return null; } });
  const [picking, setPicking] = useState(false);
  useEffect(() => { try { open ? sessionStorage.setItem(STORE, open) : sessionStorage.removeItem(STORE); } catch { /* not kept */ } }, [open]);

  const load = useCallback(() => {
    apiRequest("GET", "/messages")
      .then(d => { setList(d); setError(""); onUnread?.(d.unread || 0); })
      .catch(err => {
        if (err.status === 401) return onSignedOut?.();
        setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : "Your messages couldn't be loaded. Try again in a minute.");
      });
  }, [onSignedOut, onUnread]);
  useEffect(() => { if (!open) load(); }, [open, load]);
  /* Asked again every half minute while the list is on screen. */
  useEffect(() => {
    if (open) return undefined;
    const t = setInterval(load, 30 * 1000);
    return () => clearInterval(t);
  }, [open, load]);

  if (open) return <Thread clientId={open} clients={clients} onBack={() => setOpen(null)} onSignedOut={onSignedOut} onRead={load} />;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between gap-3">
        <TabHeading>Messages</TabHeading>
        {list?.available && (
          <button type="button" className="cx-btn-primary px-4 py-2 text-sm inline-flex items-center gap-2" onClick={() => setPicking(true)}>
            <PenSquare size={16} aria-hidden="true" /> New message
          </button>
        )}
      </div>
      {picking && <PickClient clients={clients} onPick={(id) => { setPicking(false); setOpen(id); }} onClose={() => setPicking(false)} />}
      <div className="cx-card overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>
            <button type="button" onClick={() => { setList(null); load(); }} className="cx-btn-row mt-3"><RefreshCw size={16} aria-hidden="true" /> Try again</button>
          </div>
        ) : !list ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--iron)" }}>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Finding your messages
          </div>
        ) : !list.available ? (
          <div className="p-6 text-center text-sm" style={{ color: "var(--iron)" }}>
            Your clients read messages on Trainability&apos;s client page. Once your Coach account is linked to your Trainability account
            and your clients are moved there, you can write to them here.
          </div>
        ) : list.conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle size={28} className="mx-auto" style={{ color: "var(--iron)" }} aria-hidden="true" />
            <p className="text-base mt-2" style={{ color: "var(--iron)" }}>No messages yet.</p>
            <p className="text-sm mt-1" style={{ color: "var(--iron)" }}>Tap <strong>New message</strong> to write to a client.</p>
          </div>
        ) : list.conversations.map((c, i) => (
          <button key={c.id} type="button" onClick={() => setOpen(c.clientId)}
            className={`w-full text-left px-4 py-3 flex items-center gap-3${i ? " border-t" : ""}`} style={{ borderColor: "var(--iron-line)" }}>
            <Initials who={c} />
            <span className="flex-1 min-w-0">
              <span className="flex items-baseline justify-between gap-2">
                <span className={`truncate ${c.unread ? "font-semibold" : "font-medium"}`}>{c.clientName}</span>
                <span className="text-xs flex-none" style={{ color: c.unread ? "var(--accent)" : "var(--iron)" }}>{when(c.lastAt)}</span>
              </span>
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm truncate" style={{ color: c.unread ? "var(--ink)" : "var(--iron)" }}>{lastLine(c)}</span>
                {c.unread > 0 && (
                  <span className="flex-none text-[11px] font-semibold rounded-full px-1.5 min-w-[18px] h-[18px] inline-flex items-center justify-center"
                    style={{ background: "var(--fill-cerulean)", color: "#fff" }} aria-label={`${c.unread} new`}>{c.unread}</span>
                )}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* Who to write to: the trainer's active clients, searchable. */
function PickClient({ clients, onPick, onClose }) {
  const [q, setQ] = useState("");
  const active = (clients || []).filter(c => !c.archived);
  const shown = active.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="cx-card mb-4 overflow-hidden">
      <div className="p-3 flex items-center gap-2 border-b" style={{ borderColor: "var(--iron-line)" }}>
        <label className="relative flex-1">
          <span className="sr-only">Search clients</span>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--iron)" }} aria-hidden="true" />
          <input autoFocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Write to…" className="cx-input" style={{ paddingLeft: "2.4rem" }} />
        </label>
        <button type="button" className="cx-icon-btn" aria-label="Close" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {shown.length === 0 && <p className="p-4 text-sm text-center" style={{ color: "var(--iron)" }}>{clients === undefined ? "Loading…" : "No client by that name."}</p>}
        {shown.map(c => (
          <button key={c.id} type="button" onClick={() => onPick(c.id)} className="w-full text-left px-4 py-2.5 flex items-center gap-3 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
            <Initials who={c} size={32} />
            <span className="font-medium">{c.firstName} {c.lastName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ one conversation */

function Attachment({ a }) {
  if (a.kind === "picture") {
    return (
      <a href={fileUrl(a.id)} target="_blank" rel="noreferrer" className="block">
        <img src={fileUrl(a.id)} alt={a.name || "A picture"} loading="lazy" className="rounded-xl block max-w-full"
          style={{ width: 240, aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : undefined, objectFit: "cover", background: "var(--ghost-fill)" }} />
      </a>
    );
  }
  if (a.kind === "video") {
    return (
      <video controls playsInline preload="none" poster={a.still || undefined} src={fileUrl(a.id)} className="rounded-xl block max-w-full"
        style={{ width: 260, aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : "16 / 9", background: "#000" }} />
    );
  }
  if (a.kind === "program") {
    return (
      <a href={`/print/sent/${a.id}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border text-left" style={{ borderColor: "var(--iron-line)", background: "var(--chalk)", width: 260, maxWidth: "100%" }}>
        <span className="flex-none w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <ClipboardList size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium truncate" style={{ color: "var(--ink)" }}>{a.program?.name || a.name}</span>
          <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>
            {[a.program?.goalLabel, a.program?.kindLabel, a.program ? plural(a.program.days, "day") : null].filter(Boolean).join(" · ")}
          </span>
        </span>
      </a>
    );
  }
  if (a.kind === "measurements") {
    const d = a.measurements || {};
    /* Weight, body fat and waist first, the ones a client looks for. */
    const shown = rowsOf(d.values, null, d.units).slice(0, 3).map(r => `${r.label} ${r.text}`);
    return (
      <a href={`/print/sent/${a.id}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border text-left" style={{ borderColor: "var(--iron-line)", background: "var(--chalk)", width: 260, maxWidth: "100%" }}>
        <span className="flex-none w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <Ruler size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium truncate" style={{ color: "var(--ink)" }}>Measurements{d.takenOn ? ` · ${shortDate(d.takenOn)}` : ""}</span>
          <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>{shown.join(" · ")}</span>
        </span>
      </a>
    );
  }
  if (a.kind === "test") {
    const d = a.test || {};
    const shown = d.kind ? describe(d, d.units) : null;
    return (
      <a href={`/print/sent/${a.id}`} target="_blank" rel="noreferrer"
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 border text-left" style={{ borderColor: "var(--iron-line)", background: "var(--chalk)", width: 260, maxWidth: "100%" }}>
        <span className="flex-none w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
          <HeartPulse size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium truncate" style={{ color: "var(--ink)" }}>{d.kind ? titleOf(d, { short: true }) : "Fitness test"}{d.takenOn ? ` · ${shortDate(d.takenOn)}` : ""}</span>
          <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>{shown ? [shown.text, shown.rating].filter(Boolean).join(" · ") : ""}</span>
        </span>
      </a>
    );
  }
  return null;
}

const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const setDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function Bubble({ m, mine, seen }) {
  return (
    <div className={`flex flex-col gap-1.5 my-1.5 ${mine ? "items-end" : "items-start"}`}>
      {m.attachments.map(a => <Attachment key={a.id} a={a} />)}
      {m.text && <div className={mine ? "cx-msg-mine" : "cx-msg-theirs"}>{m.text}</div>}
      <span className="text-[11px] px-1" style={{ color: "var(--iron)" }}>
        {new Date(m.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{seen ? " · Seen" : ""}
      </span>
    </div>
  );
}

function Thread({ clientId, clients, onBack, onSignedOut, onRead }) {
  const [t, setT] = useState(null);
  const [error, setError] = useState("");
  const end = useRef(null);
  const load = useCallback(() => apiRequest("GET", `/messages/${encodeURIComponent(clientId)}`)
    .then(d => { setT(d); setError(""); onRead?.(); })
    .catch(err => {
      if (err.status === 401) return onSignedOut?.();
      if (err.status === 404) return setError("That client isn't on your list.");
      setError("Messages couldn't be loaded. Try again in a minute.");
    }), [clientId, onSignedOut, onRead]);
  useEffect(() => { load(); const i = setInterval(load, 15 * 1000); return () => clearInterval(i); }, [load]);
  const count = t?.messages.length || 0;
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [count]);

  const fromList = (clients || []).find(c => c.id === clientId);
  const name = t?.client ? `${t.client.firstName} ${t.client.lastName}`.trim() : fromList ? `${fromList.firstName} ${fromList.lastName}` : "";
  const first = t?.client?.firstName || fromList?.firstName || "them";
  const lastMine = t ? [...t.messages].reverse().find(m => m.authorKind === "trainer") : null;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <div className="flex items-center gap-2 pt-4 pb-3">
        <button type="button" className="cx-icon-btn" aria-label="All messages" onClick={onBack}><ChevronLeft size={22} aria-hidden="true" /></button>
        {name && <Initials who={t?.client || fromList || {}} size={36} />}
        <h1 className="cx-display text-xl truncate">{name}</h1>
      </div>
      <div className="cx-card px-3 py-2 min-h-[12rem]">
        {error ? <p className="p-4 text-sm text-center" style={{ color: "var(--ember)" }}>{error}</p>
          : !t ? <div className="py-8 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--iron)" }}><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading</div>
          : t.messages.length === 0 ? <p className="p-4 text-sm text-center" style={{ color: "var(--iron)" }}>No messages with {first} yet. Write the first one below; {first} is emailed to say it&apos;s there.</p>
          : t.messages.map((m, i) => (
            <React.Fragment key={m.id}>
              {(i === 0 || !sameDay(t.messages[i - 1].at, m.at)) && (
                <div className="text-xs text-center my-3" style={{ color: "var(--iron)" }}>{dayLine(m.at)}</div>
              )}
              <Bubble m={m} mine={m.authorKind === "trainer"} seen={m === lastMine && t.clientReadAt && t.clientReadAt >= m.at} />
            </React.Fragment>
          ))}
        {/* Room for the box over the bottom bar, which the newest message scrolls clear of. */}
        <div ref={end} style={{ scrollMarginBottom: 200 }} />
      </div>
      {t && <Composer clientId={clientId} first={first} onSent={setT} />}
    </div>
  );
}

/* The box at the foot: words, and what is attached waiting to go. */
function Composer({ clientId, first, onSent }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);   // { key, kind, name, progress, att, error, preview }
  const [menu, setMenu] = useState(null);   // null | "menu" | "programs"
  const [programs, setPrograms] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef(null);
  const box = useRef(null);
  const busy = items.some(x => !x.att && !x.error);
  const ready = items.filter(x => x.att);

  const update = (key, patch) => setItems(xs => xs.map(x => (x.key === key ? { ...x, ...patch } : x)));
  function choose(e) {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    setMenu(null);
    for (const file of files) {
      const key = `${Date.now()}-${Math.random()}`;
      const video = file.type.startsWith("video/");
      const preview = !video && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setItems(xs => [...xs, { key, kind: video ? "video" : "picture", name: file.name, progress: 0, preview }]);
      uploadAttachment(file, (p) => update(key, { progress: p }))
        .then(att => update(key, { att, progress: 1 }))
        .catch(err => update(key, { error: err.message || "That didn't upload." }));
    }
  }
  function openPrograms() {
    setMenu("programs");
    apiRequest("GET", "/programs").then(d => setPrograms((d.programs || []).filter(p => p.clientId === clientId))).catch(() => setPrograms([]));
  }
  async function attachProgram(p) {
    setMenu(null);
    const key = `${Date.now()}-${p.id}`;
    setItems(xs => [...xs, { key, kind: "program", name: p.name, progress: 0 }]);
    try { update(key, { att: await apiRequest("POST", "/attachments/program", { programId: p.id }), progress: 1 }); }
    catch (err) { update(key, { error: err.message }); }
  }
  /* The client's measurements, newest first, to attach one set. */
  const [sets, setSets] = useState(null);
  function openMeasurements() {
    setMenu("measurements");
    apiRequest("GET", `/clients/${encodeURIComponent(clientId)}/measurements`).then(d => setSets(d.measurements || [])).catch(() => setSets([]));
  }
  async function attachMeasurements(set) {
    setMenu(null);
    const key = `${Date.now()}-${set.id}`;
    setItems(xs => [...xs, { key, kind: "measurements", name: `Measurements, ${setDate(set.takenOn)}`, progress: 0 }]);
    try { update(key, { att: await apiRequest("POST", "/attachments/measurements", { measurementId: set.id }), progress: 1 }); }
    catch (err) { update(key, { error: err.message }); }
  }
  /* The client's fitness test results, newest first, to attach one. */
  const [tests, setTests] = useState(null);
  const [testUnits, setTestUnits] = useState("imperial");
  function openTests() {
    setMenu("tests");
    apiRequest("GET", `/clients/${encodeURIComponent(clientId)}/tests`).then(d => { setTests(d.tests || []); setTestUnits(d.units || "imperial"); }).catch(() => setTests([]));
  }
  async function attachTest(t) {
    setMenu(null);
    const key = `${Date.now()}-${t.id}`;
    setItems(xs => [...xs, { key, kind: "test", name: `${titleOf(t, { short: true })}, ${setDate(t.takenOn)}`, progress: 0 }]);
    try { update(key, { att: await apiRequest("POST", "/attachments/test", { testId: t.id }), progress: 1 }); }
    catch (err) { update(key, { error: err.message }); }
  }
  const remove = (key) => setItems(xs => { const x = xs.find(y => y.key === key); if (x?.preview) URL.revokeObjectURL(x.preview); return xs.filter(y => y.key !== key); });

  async function send(e) {
    e?.preventDefault();
    if (sending || busy || (!text.trim() && !ready.length)) return;
    setSending(true); setError("");
    try {
      const out = await apiRequest("POST", `/messages/${encodeURIComponent(clientId)}`, { text, attachments: ready.map(x => x.att.id) });
      items.forEach(x => x.preview && URL.revokeObjectURL(x.preview));
      setText(""); setItems([]);
      box.current?.style.removeProperty("height");
      onSent(t => ({ ...t, ...out }));
    } catch (err) {
      setError(err.message || "That didn't send. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="cx-card cx-msg-composer mt-3 p-3">
      {error && <p className="text-sm mb-2" style={{ color: "var(--ember)" }}>{error}</p>}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {items.map(x => (
            <span key={x.key} className="cx-billy-file">
              {x.preview ? <img src={x.preview} alt="" className="w-8 h-8 rounded-md object-cover flex-none" />
                : <span className="w-8 h-8 rounded-md flex items-center justify-center flex-none" style={{ background: "var(--accent-soft)" }}>
                    {x.kind === "program" ? <ClipboardList size={16} style={{ color: "var(--accent)" }} aria-hidden="true" />
                      : x.kind === "measurements" ? <Ruler size={16} style={{ color: "var(--accent)" }} aria-hidden="true" />
                      : x.kind === "test" ? <HeartPulse size={16} style={{ color: "var(--accent)" }} aria-hidden="true" />
                      : <ImageIcon size={16} style={{ color: "var(--accent)" }} aria-hidden="true" />}
                  </span>}
              <span className="min-w-0">
                <span className="block truncate max-w-[10rem]">{x.name || (x.kind === "video" ? "Video" : "Picture")}</span>
                <span className="block text-[11px]" style={{ color: x.error ? "var(--ember)" : "var(--iron)" }}>
                  {x.error || (x.att ? ({ program: "Program", measurements: "Measurements", test: "Fitness test", video: "Video" }[x.kind] || "Picture") : `Uploading ${Math.round(x.progress * 100)}%`)}
                </span>
              </span>
              <button type="button" className="cx-icon-btn" aria-label={`Remove ${x.name}`} onClick={() => remove(x.key)}><X size={14} aria-hidden="true" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input ref={pick} type="file" accept="image/*,video/*" multiple className="hidden" onChange={choose} />
        <button type="button" className="cx-icon-btn w-10 h-10 flex-none" aria-label="Attach" aria-expanded={!!menu} onClick={() => setMenu(m => (m ? null : "menu"))}>
          <Paperclip size={20} aria-hidden="true" />
        </button>
        <textarea ref={box} rows={1} value={text} maxLength={4000}
          onChange={e => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${e.target.scrollHeight + 2}px`; }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) send(e); }}
          placeholder={`Message ${first}`} aria-label={`Message ${first}`} className="cx-input flex-1 resize-none" style={{ maxHeight: "8rem" }} />
        <button type="submit" className="cx-btn-primary w-10 h-10 flex-none flex items-center justify-center"
          disabled={sending || busy || (!text.trim() && !ready.length)} aria-label="Send">
          {sending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowUp size={20} aria-hidden="true" />}
        </button>
      </div>
      {menu && (
        <div className="absolute left-3 bottom-full mb-2 cx-card p-1.5 w-72 z-10" role="menu">
          {menu === "menu" ? (
            <>
              <MenuItem icon={ImageIcon} label="Picture or video" onClick={() => pick.current?.click()} />
              <MenuItem icon={ClipboardList} label="Program" onClick={openPrograms} />
              <MenuItem icon={Ruler} label="Measurements" onClick={openMeasurements} />
              <MenuItem icon={HeartPulse} label="Fitness test" onClick={openTests} />
            </>
          ) : menu === "tests" ? (
            <>
              <div className="px-2.5 py-1.5 text-xs font-medium" style={{ color: "var(--iron)" }}>{first}&apos;s fitness tests</div>
              {tests === null ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>Loading…</p>
                : tests.length === 0 ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>No fitness tests for {first} yet. Add them on the Clients page.</p>
                : tests.map(t => { const d = describe(t, testUnits); return <MenuItem key={t.id} icon={HeartPulse} label={`${titleOf(t, { short: true })} · ${setDate(t.takenOn)}`} note={[d.text, d.rating].filter(Boolean).join(" · ")} onClick={() => attachTest(t)} />; })}
            </>
          ) : menu === "measurements" ? (
            <>
              <div className="px-2.5 py-1.5 text-xs font-medium" style={{ color: "var(--iron)" }}>{first}&apos;s measurements</div>
              {sets === null ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>Loading…</p>
                : sets.length === 0 ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>No measurements for {first} yet. Add them on the Clients page.</p>
                : sets.map(m => <MenuItem key={m.id} icon={Ruler} label={setDate(m.takenOn)} note={`Taken by ${m.mine ? "you" : m.takenBy}`} onClick={() => attachMeasurements(m)} />)}
            </>
          ) : (
            <>
              <div className="px-2.5 py-1.5 text-xs font-medium" style={{ color: "var(--iron)" }}>{first}&apos;s programs</div>
              {programs === null ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>Loading…</p>
                : programs.length === 0 ? <p className="px-2.5 py-2 text-sm" style={{ color: "var(--iron)" }}>No programs for {first} yet.</p>
                : programs.map(p => <MenuItem key={p.id} icon={ClipboardList} label={p.name} note={`${p.goalLabel} · ${plural(p.days, "day")}`} onClick={() => attachProgram(p)} />)}
            </>
          )}
        </div>
      )}
    </form>
  );
}

function MenuItem({ icon: Icon, label, note, onClick, disabled = false }) {
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick}
      className="w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-3 hover:bg-[var(--ghost-fill)] disabled:hover:bg-transparent"
      style={disabled ? { opacity: 0.55 } : undefined}>
      <Icon size={18} className="flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{label}</span>
        {note && <span className="block text-xs truncate" style={{ color: "var(--iron)" }}>{note}</span>}
      </span>
    </button>
  );
}
