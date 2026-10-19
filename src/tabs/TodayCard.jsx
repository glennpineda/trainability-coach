import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, ClipboardList, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { apiRequest } from "../lib/api";
import { isoDate } from "../lib/date";
import { SegRow } from "../chrome/SegRow";

/*
 * Today, on Home (Glenn, 18 Oct 2026: "Let's do the Today tab"): the
 * trainer's day and their next 7 days at a glance, copied from Studio's Today
 * tab (src/tabs/TodayTab.jsx) — the same two lists, its row (time and length,
 * the client, where, then what to know) and its words: "Nothing booked
 * today.", "Next: … at … with …", the day lines "Friday, Oct 23 · 2
 * appointments" that open on a tap, and the flags First session, New client
 * and Nothing booked after this. Coach adds each client's program, which a
 * tap opens, and how many limitations are written for them. Read only, as
 * Studio's is: nothing here books or cancels.
 */

/* The browser's own day, so it turns at the trainer's midnight. */
const isoDay = (d = new Date()) => isoDate(d);
/* Studio's lib/date.js, as it writes them. */
const at = (iso) => new Date(`${iso}T00:00:00`);
const minutesToLabel = (m) => { const h = Math.floor(m / 60), min = m % 60; return `${h % 12 === 0 ? 12 : h % 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const fmtWeekday = (iso) => at(iso).toLocaleDateString(undefined, { weekday: "long" });
const fmtMonthDay = (iso) => at(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtDateShort = (iso) => at(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* Over, by the clock: a session that has ended no longer needs booking after. */
function isOver(a) {
  const end = at(a.date);
  end.setMinutes(a.start + a.duration);
  return Date.now() >= end.getTime();
}

function EmptyState({ children }) {
  return <div className="text-base text-center py-6" style={{ color: "var(--iron)" }}>{children}</div>;
}

/* What each client's row has to say about them, in Studio's order and colours
   (its magenta, for what can be tapped, is Coach's accent). */
function flags(a) {
  const out = [];
  if (!a.client || a.status === "cancelled") return out;
  if (a.firstSession) out.push({ text: "First session", color: "var(--ink)", strong: true });
  else if (a.newClient) out.push({ text: "New client", color: "var(--ink)" });
  if (a.nothingAfter && !isOver(a)) out.push({ text: "Nothing booked after this", color: "var(--amber)", strong: true });
  return out;
}

function Row({ a, onOpen }) {
  const cancelled = a.status === "cancelled";
  const done = !cancelled && a.status === "completed";
  const who = a.client || a.name;
  const name = who ? `${who.firstName} ${who.lastName}`.trim() : a.private ? "Private" : "Client";
  const f = flags(a);
  const tappable = !!a.client;
  const Tag = tappable ? "button" : "div";
  return (
    <Tag type={tappable ? "button" : undefined} onClick={tappable ? () => onOpen(a) : undefined}
      className="w-full text-left border-t px-4 py-2.5 flex items-center gap-3"
      style={{ borderColor: "var(--iron-line)" }}>
      {/* A cancelled one in iron words, as Studio greys one, rather than the
          whole row faded below what can be read (Run 1, D-8). */}
      <div className="w-[3.9rem] flex-none text-sm tabular-nums whitespace-nowrap" style={{ color: cancelled ? "var(--iron)" : "var(--ink-soft)" }}>
        {minutesToLabel(a.start)}
        <div className="text-xs" style={{ color: "var(--iron)" }}>{a.duration} min</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-medium break-words" style={cancelled ? { textDecoration: "line-through", color: "var(--iron)" } : undefined}>
          {name}{a.isAssessment && <span style={{ color: "var(--iron)", fontWeight: 400 }}> · Assessment</span>}
        </div>
        {a.where && <div className="text-sm break-words" style={{ color: "var(--iron)" }}>{a.where}</div>}
        {!cancelled && f.length > 0 && (
          <div className="text-sm">
            {f.map((x, i) => (
              <React.Fragment key={x.text}>
                {i > 0 && <span style={{ color: "var(--iron)" }}> · </span>}
                <span className="whitespace-nowrap" style={{ color: x.color, fontWeight: x.strong ? 600 : 400 }}>{x.text}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        {/* Coach's own: their program, and their limitations. */}
        {!cancelled && a.client && (
          <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
            <span className="inline-flex items-center gap-1 min-w-0" style={{ color: a.program ? "var(--accent)" : "var(--iron)" }}>
              <ClipboardList size={14} className="flex-none" aria-hidden="true" />
              <span className="truncate">{a.program ? a.program.name : "No program yet"}</span>
            </span>
            {a.limitations > 0 && (
              <span className="inline-flex items-center gap-1 whitespace-nowrap" style={{ color: "var(--amber)" }}>
                <ShieldAlert size={14} className="flex-none" aria-hidden="true" />{plural(a.limitations, "limitation")}
              </span>
            )}
          </div>
        )}
      </div>
      {cancelled
        ? <span className="text-xs flex-none" style={{ color: "var(--iron)" }}>Cancelled</span>
        : done && (
          <span className="flex-none inline-flex items-center justify-center rounded-full" style={{ width: 22, height: 22, background: "var(--moss)" }}>
            <Check size={14} strokeWidth={3} style={{ color: "var(--chalk)" }} aria-hidden="true" />
            <span className="sr-only">Trained</span>
          </span>
        )}
    </Tag>
  );
}

export function TodayCard({ onOpenProgram, onOpenClient, onSignedOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState("today");
  /* The days tapped away from how they start (Studio's flippedDays). */
  const [flipped, setFlipped] = useState([]);
  const [today, setToday] = useState(isoDay);

  const load = useCallback(() => {
    let alive = true;
    setError("");
    apiRequest("GET", `/today?date=${isoDay()}`)
      .then(d => { if (alive) { setData(d); setToday(isoDay()); } })
      .catch(err => {
        if (!alive) return;
        if (err.status === 401) return onSignedOut?.();
        setError(err.code === "studio_unreachable" || !err.status
          ? "Couldn't reach Trainability. Check your connection and try again."
          : "Your sessions couldn't be loaded. Try again in a minute.");
      });
    return () => { alive = false; };
  }, [onSignedOut]);
  useEffect(() => load(), [load]);
  /* Turning with the minute, as Studio's does: a session that has ended
     loses "Nothing booked after this", and the day rolls over at midnight. */
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => { tick(n => n + 1); if (isoDay() !== today) load(); }, 60 * 1000);
    return () => clearInterval(t);
  }, [today, load]);

  const open = (a) => (a.program ? onOpenProgram(a.program.id) : onOpenClient(a.client.id));

  let body;
  if (error) {
    body = (
      <div className="p-6 text-center">
        <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>
        <button type="button" onClick={() => { setData(null); load(); }} className="cx-btn-row mt-3">
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      </div>
    );
  } else if (!data) {
    body = (
      <div className="py-8 flex items-center justify-center gap-2 text-sm" style={{ color: "var(--iron)" }}>
        <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Finding your sessions
      </div>
    );
  } else if (!data.schedule) {
    /* A Coach account: no schedule of its own. */
    body = <EmptyState>Your sessions show here once your Coach account is linked to your Trainability account.</EmptyState>;
  } else if (panel === "today") {
    const todays = data.days[0]?.appointments || [];
    body = todays.length ? <div className="-mb-px">{todays.map(a => <Row key={a.id} a={a} onOpen={open} />)}</div> : (
      <EmptyState>
        Nothing booked today.
        {data.next && <div className="text-sm pt-1">Next: {fmtDateShort(data.next.date)} at {minutesToLabel(data.next.start)}
          {data.next.firstName ? ` with ${data.next.firstName}` : ""}.</div>}
      </EmptyState>
    );
  } else {
    const has = (d) => d.appointments.length > 0;
    /* Today starts open, or the next day with something booked when today is empty. */
    const firstOpen = has(data.days[0]) ? data.days[0].date : data.days.find(has)?.date;
    const shown = data.days.filter(has);
    body = shown.length ? shown.map(d => {
      const isOpen = (d.date === firstOpen) !== flipped.includes(d.date);
      const going = d.appointments.filter(a => a.status !== "cancelled").length;
      return (
        <div key={d.date} className="border-t" style={{ borderColor: "var(--iron-line)" }}>
          <button type="button" aria-expanded={isOpen}
            onClick={() => setFlipped(ds => (ds.includes(d.date) ? ds.filter(x => x !== d.date) : [...ds, d.date]))}
            className="w-full text-left text-sm px-4 py-3 flex items-center justify-between gap-2" style={{ color: "var(--iron)" }}>
            <span>
              <span style={d.date === today ? { color: "var(--accent)", fontWeight: 600 } : undefined}>
                {d.date === today ? "Today" : fmtWeekday(d.date)}, {fmtMonthDay(d.date)}
              </span>
              {" · "}{plural(going, "appointment")}
            </span>
            <ChevronDown size={16} className="flex-none" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} aria-hidden="true" />
          </button>
          {isOpen && d.appointments.map(a => <Row key={a.id} a={a} onOpen={open} />)}
        </div>
      );
    }) : <EmptyState>Nothing booked in the next 7 days.</EmptyState>;
  }

  return (
    <section className="cx-card overflow-hidden mb-4" aria-labelledby="cx-today-title">
      {/* No heading over the tabs, as Studio's has none: "Today" over
          "Today" said it twice. Its name is kept for a screen reader. */}
      <h2 id="cx-today-title" className="sr-only">Today</h2>
      {data?.schedule ? (
        /* Studio's two, Today and → 7 days, in the Clients page's switch. */
        <div className="p-3">
          {/* Two views, not a filter: Studio's picking look, as its Today · This week (SegRow; Run 1, D-3). */}
          <SegRow pick label="Your sessions" value={panel} onPick={setPanel}
            items={[{ key: "today", label: "Today" }, { key: "week", label: <><ArrowRight size="1em" strokeWidth={2.25} aria-hidden="true" style={{ display: "inline", verticalAlign: "-0.12em" }} /><span className="sr-only">Next</span> 7 days</> }]} />
        </div>
      ) : (
        <div className="px-4 pt-4 flex items-center gap-3">
          <span className="flex-none w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
            <CalendarDays size={20} style={{ color: "var(--accent)" }} aria-hidden="true" />
          </span>
          <span className="font-semibold text-base" aria-hidden="true">Today</span>
        </div>
      )}
      {body}
    </section>
  );
}
