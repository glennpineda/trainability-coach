import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { apiRequest } from "../lib/api";
import { aOrAn, andList, plural } from "../lib/words";

/**
 * A new program, one question at a time (Glenn, 20 Oct 2026: "When creating a
 * new program, can we create a “step progress” (see studio how we did that)
 * way of doing it? Answering one question at a time (or skip the whole thing
 * and access what we have now right away)"). From the answers Coach IQ builds
 * the program (POST /programs/build, server/programs.js build), which then
 * opens in the designer to change as any other. Skip the questions goes to
 * the empty program with suggestions, as before (`onSkip`).
 *
 * Copied from Studio: the kiosk's sign-up asks one question a screen
 * (src/kiosk/Register.jsx: Back is the question before, the main button is
 * always Next, the last says what it does), under the strip Set up Sessions
 * draws (src/components/SessionsSetup.jsx `StepBar`: a numbered dot for each
 * part, a tick on the ones behind, the name beside the one they are on), in
 * Coach's colours.
 */

const muted = { color: "var(--iron)" };

const PARTS = ["Who", "Focus", "Days", "Warm-up", "Level", "Make it"];

function StepBar({ at }) {
  return (
    <div className="flex items-center gap-2 mb-4" role="img" aria-label={`Part ${at + 1} of ${PARTS.length}: ${PARTS[at]}`}>
      {PARTS.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="flex-1 border-t" style={{ borderColor: i <= at ? "var(--accent)" : "var(--iron-line)" }} />}
          <span className="flex items-center gap-1.5 text-sm" style={{ color: i === at ? "var(--ink)" : "var(--iron)" }}>
            {/* White only on the filled ones; one still to come is grey on
                the page with a hairline, readable in either theme. */}
            <span className="inline-flex items-center justify-center rounded-full text-xs font-semibold flex-none"
              style={{ width: 22, height: 22, ...(i <= at
                ? { color: "#fff", background: i < at ? "var(--fill-deep)" : "var(--fill-cerulean)" }
                : { color: "var(--iron)", background: "var(--paper)", border: "1px solid var(--iron-line)" }) }}>
              {i < at ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            {i === at && <span className="font-semibold whitespace-nowrap">{s}</span>}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* One answer of several, as cards: a name and a line saying what it is. */
function Cards({ options, value, onPick, label, many = false }) {
  const on = (k) => (many ? value.includes(k) : value === k);
  return (
    <div className="grid sm:grid-cols-2 gap-2" role={many ? "group" : "radiogroup"} aria-label={label}>
      {options.map(o => (
        <button key={o.key} type="button" role={many ? undefined : "radio"} aria-checked={many ? undefined : on(o.key)} aria-pressed={many ? on(o.key) : undefined}
          onClick={() => onPick(o.key)}
          className="text-left rounded-xl p-3 border flex items-start gap-2.5"
          style={on(o.key) ? { borderColor: "var(--cerulean)", background: "var(--accent-soft)" } : { borderColor: "var(--iron-line)" }}>
          {many && (
            <span className="inline-flex items-center justify-center rounded flex-none mt-0.5" aria-hidden="true"
              style={{ width: 18, height: 18, ...(on(o.key) ? { background: "var(--fill-cerulean)", color: "#fff" } : { border: "1px solid var(--iron-line)" }) }}>
              {on(o.key) && <Check size={13} />}
            </span>
          )}
          <span className="min-w-0">
            <span className="block font-medium text-sm">{o.label}</span>
            {o.about && <span className="block text-xs" style={muted}>{o.about}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/* A row of small choices, one or several, as the kind-of-program step has. */
function Chips({ options, value, onChange, many = false, label }) {
  const on = (k) => (many ? value.includes(k) : value === k);
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {options.map(([k, words]) => (
        <button key={k} type="button" aria-pressed={on(k)}
          onClick={() => onChange(many ? (on(k) ? value.filter(v => v !== k) : [...value, k]) : k)}
          className="px-3.5 py-2 rounded-full text-sm"
          style={on(k) ? { background: "var(--fill-cerulean)", color: "#fff" } : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
          {words}
        </button>
      ))}
    </div>
  );
}

/* How many days a week each focus usually starts at. */
const DAYS_FOR = { strength: 3, muscle: 4, power: 3, cardio: 3, endurance: 3, balance: 2, mobility: 2, general: 3 };

/* What each day works, as Coach IQ would split that many days: the usual
   turns of the kinds of program (server/programs.js KINDS). */
function splitFor(n, aim) {
  if (aim === "mobility") return Array(n).fill("mobility");
  if (aim === "cardio") return Array.from({ length: n }, (_, i) => (i % 2 ? "full" : "circuit"));
  if (n <= 3 || aim === "balance" || aim === "general") return Array(n).fill("full");
  if (n === 4) return ["upper", "lower", "upper", "lower"];
  if (n === 5) return ["upper", "lower", "push", "pull", "legs"];
  return Array.from({ length: n }, (_, i) => ["push", "pull", "legs"][i % 3]);
}

const DAY_ABOUT = {
  full: "The whole body: legs, a push, a pull and core.", upper: "Chest, back, shoulders and arms.", lower: "Legs and glutes, with some core.",
  push: "Chest, shoulders and triceps.", pull: "Back and biceps, with a carry.", legs: "Squats, hinges, lunges and calves.",
  circuit: "One after another with little rest, for conditioning.", mobility: "Mobility, balance and breathing.",
};
const LEVELS = [
  { key: "beginner", label: "Beginner", about: "New to training, or back after a long break." },
  { key: "intermediate", label: "Intermediate", about: "Training regularly for six months or more." },
  { key: "advanced", label: "Advanced", about: "Years of training, and good form on the main lifts." },
];
const PART_CHOICES = [
  { key: "warmup", label: "Warm-up", about: "A few easy minutes, then moving drills for what the day works." },
  { key: "cooldown", label: "Cool-down", about: "An easy walk or breathing, to finish." },
  { key: "stretching", label: "Stretching", about: "Held stretches for the muscles the day worked." },
];

export function ProgramSteps({ vocab, clients, places, forClient, onSkip, onCancel, onMade, onSignedOut }) {
  const first = forClient && clients.some(c => c.id === forClient) ? forClient : clients.length === 1 ? clients[0].id : "";
  const [a, setA] = useState(() => ({
    clientId: first, placeId: "", aim: "", focus: [], count: null,
    days: [], warmup: true, cooldown: true, stretching: true, level: "", name: "",
  }));
  const set = (k, v) => setA(d => ({ ...d, [k]: v }));
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = clients.find(c => c.id === a.clientId);
  const firstName = client?.firstName || "them";

  /* Where they train starts at their gym in Studio, if they have one, else
     the trainer's first place; their level at what Coach IQ says (as the
     details form does). Asked again when the client changes. */
  const [gym, setGym] = useState(null);
  const [known, setKnown] = useState(null);
  useEffect(() => {
    if (!a.clientId) return undefined;
    let live = true;
    apiRequest("GET", `/clients/${a.clientId}/place`).then(o => {
      if (!live) return;
      setGym(o.place);
      setA(d => ({ ...d, placeId: o.place ? o.place.id : places[0]?.id ?? "" }));
    }).catch(() => { if (live) { setGym(null); setA(d => ({ ...d, placeId: d.placeId || places[0]?.id || "" })); } });
    apiRequest("GET", `/clients/${a.clientId}/level`).then(o => {
      if (!live) return;
      setKnown(o);
      setA(d => ({ ...d, level: o.level || o.fromTests?.level || d.level }));
    }).catch(() => { if (live) setKnown(null); });
    const c = clients.find(x => x.id === a.clientId);
    setA(d => ({ ...d, name: !d.name || d.name.endsWith("'s program") ? `${c.firstName}'s program` : d.name }));
    return () => { live = false; };
  }, [a.clientId]);   // eslint-disable-line react-hooks/exhaustive-deps
  /* The places can come after the client's gym was asked. */
  useEffect(() => { if (!a.placeId && places.length && !gym) set("placeId", places[0].id); }, [places]);   // eslint-disable-line react-hooks/exhaustive-deps
  const placeList = gym && !places.some(p => p.id === gym.id) ? [...places, gym] : places;
  const place = placeList.find(p => p.id === a.placeId);

  /* How many days, and what each works: suggested from the focus and the
     count, kept once the trainer has chosen it for that day. */
  const setCount = (n) => setA(d => {
    const split = splitFor(n, d.aim);
    const days = split.map((kind, i) => (d.days[i]?.chosen ? d.days[i] : { kind, muscles: d.days[i]?.muscles || [], minutes: d.days[i]?.minutes || d.days[i - 1]?.minutes || 60 }));
    return { ...d, count: n, days };
  });
  const setDay = (i, change) => setA(d => ({ ...d, days: d.days.map((x, j) => (j === i ? { ...x, ...change } : x)) }));

  /* The questions, in order: one a screen. */
  const steps = useMemo(() => [
    { key: "client", part: 0 }, { key: "place", part: 0 },
    { key: "aim", part: 1 }, { key: "extras", part: 1 },
    { key: "count", part: 2 },
    ...a.days.flatMap((_, i) => [{ key: "day", part: 2, day: i }, { key: "length", part: 2, day: i }]),
    { key: "parts", part: 3 }, { key: "level", part: 4 }, { key: "review", part: 5 },
  ], [a.days.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  const step = steps[Math.min(at, steps.length - 1)];

  /* Each question starts at its top: Next on a long one would otherwise
     leave the trainer at its foot (as Studio's Set up Sessions does). */
  const top = useRef(null);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    top.current?.scrollIntoView?.({ block: "start" });
  }, [at]);

  const ready = {
    client: !!a.clientId, place: true, aim: !!a.aim, extras: true, count: !!a.count, day: true, length: true, parts: true,
    level: !!a.level, review: !!a.name.trim() && !busy,
  }[step.key];
  const go = (key, day) => { setError(""); setAt(steps.findIndex(s => s.key === key && (day === undefined || s.day === day))); };
  const next = () => {
    setError("");
    /* The days a week start at the focus's usual, and the days with them. */
    if (step.key === "extras" && !a.count) setCount(DAYS_FOR[a.aim] || 3);
    setAt(i => i + 1);
  };
  /* A new focus splits again the days not chosen by hand. */
  const pickAim = (k) => setA(d => ({
    ...d, aim: k, focus: d.focus.filter(f => f !== AIM_FOCUS[k]),
    days: d.count ? splitFor(d.count, k).map((kind, i) => (d.days[i]?.chosen ? d.days[i] : { ...d.days[i], kind })) : d.days,
  }));
  const back = () => { setError(""); setAt(i => Math.max(i - 1, 0)); };

  const make = async () => {
    setBusy(true); setError("");
    try {
      const p = await apiRequest("POST", "/programs/build", {
        clientId: a.clientId, placeId: a.placeId, aim: a.aim, focus: a.focus, level: a.level, name: a.name.trim(),
        days: a.days.map(d => ({ kind: d.kind, muscles: d.muscles, minutes: d.minutes })),
        warmup: a.warmup, cooldown: a.cooldown, stretching: a.stretching,
      });
      onMade(p);
    } catch (err) {
      if (err.status === 401) onSignedOut?.(); else setError(err.message);
      setBusy(false);
    }
  };

  const aim = vocab.aims.find(x => x.key === a.aim);
  const dayKinds = vocab.dayKinds.map(k => ({ ...k, about: DAY_ABOUT[k.key] }));
  const kindLabel = (k) => vocab.dayKinds.find(x => x.key === k)?.label || k;
  const groupLabel = (g) => vocab.muscleGroups.find(x => x.key === g)?.label || g;
  const Ask = ({ children, hint }) => (
    <div className="mb-3">
      <h3 className="cx-display text-lg">{children}</h3>
      {hint && <p className="text-sm mt-0.5" style={muted}>{hint}</p>}
    </div>
  );

  let body;
  if (step.key === "client") {
    body = (
      <>
        <Ask>Who is this program for?</Ask>
        <Cards label="Client" value={a.clientId} onPick={(id) => set("clientId", id)}
          options={clients.map(c => ({ key: c.id, label: `${c.firstName} ${c.lastName}`.trim() }))} />
      </>
    );
  } else if (step.key === "place") {
    body = (
      <>
        <Ask hint="Coach IQ only chooses what can be done there.">Where does {firstName} train?</Ask>
        <Cards label="Where they train" value={a.placeId} onPick={(id) => set("placeId", id)}
          options={[...placeList.map(p => ({ key: p.id, label: p.name, about: gym && p.id === gym.id ? `${firstName}'s gym in Studio.` : null })),
            { key: "", label: "Not chosen", about: "The equipment isn't checked." }]} />
      </>
    );
  } else if (step.key === "aim") {
    body = (
      <>
        <Ask hint="One main focus. It sets the sets, reps and rest.">What should this program focus on?</Ask>
        <Cards label="Focus" value={a.aim} onPick={pickAim} options={vocab.aims} />
      </>
    );
  } else if (step.key === "extras") {
    body = (
      <>
        <Ask hint="Optional, any number. Each day gives them a place where they fit.">Anything else to work on?</Ask>
        <Chips many label="Also work on" value={a.focus} onChange={(v) => set("focus", v)}
          options={vocab.focus.filter(f => f.key !== AIM_FOCUS[a.aim]).map(f => [f.key, f.label])} />
      </>
    );
  } else if (step.key === "count") {
    body = (
      <>
        <Ask hint={aim ? `${aim.label}: ${plural(DAYS_FOR[a.aim] || 3, "day")} a week is the usual start.` : null}>How many days a week?</Ask>
        <Chips label="Days a week" value={a.count} onChange={setCount} options={[1, 2, 3, 4, 5, 6].map(n => [n, String(n)])} />
      </>
    );
  } else if (step.key === "day") {
    const d = a.days[step.day];
    body = (
      <>
        <Ask hint={a.days.length > 1 ? `Day ${step.day + 1} of ${a.days.length}. Coach IQ chose one to suit ${plural(a.days.length, "day")} a week; change it if you like.` : null}>
          Day {step.day + 1}: what should it work?
        </Ask>
        <Cards label={`What day ${step.day + 1} works`} value={d.kind} onPick={(k) => setDay(step.day, { kind: k, chosen: true })} options={dayKinds} />
        <div className="mt-4">
          <div className="text-sm font-medium mb-1.5">More work for <span className="font-normal" style={muted}>(optional)</span></div>
          <Chips many label={`More work for on day ${step.day + 1}`} value={d.muscles} onChange={(v) => setDay(step.day, { muscles: v, chosen: true })}
            options={vocab.muscleGroups.map(g => [g.key, g.label])} />
        </div>
      </>
    );
  } else if (step.key === "length") {
    const d = a.days[step.day];
    const holds = vocab.holds?.[d.minutes];
    body = (
      <>
        <Ask hint={holds ? `About ${plural(holds, "exercise")} fit in ${aOrAn(d.minutes)} ${d.minutes}-minute session, besides the warm-up and cool-down.` : null}>
          Day {step.day + 1}: how long is the session?
        </Ask>
        <Chips label={`How long day ${step.day + 1} is`} value={d.minutes} onChange={(m) => setDay(step.day, { minutes: m })}
          options={vocab.minutes.map(m => [m, `${m} min`])} />
      </>
    );
  } else if (step.key === "parts") {
    body = (
      <>
        <Ask hint="Coach IQ: warm up and cool down every session. Each goes at its own end of the day.">Add a warm-up, cool-down or stretching?</Ask>
        <Cards many label="Warm-up, cool-down and stretching" value={PART_CHOICES.filter(p => a[p.key]).map(p => p.key)}
          onPick={(k) => set(k, !a[k])} options={PART_CHOICES} />
      </>
    );
  } else if (step.key === "level") {
    const why = known && (known.level ? `Coach IQ: ${known.why}` : known.fromTests ? `Coach IQ: ${known.fromTests.why}` : `No programs for ${firstName} yet. What's their fitness level?`);
    body = (
      <>
        <Ask hint={why}>How hard should it be?</Ask>
        <Cards label="The client's level" value={a.level} onPick={(k) => set("level", k)} options={LEVELS} />
      </>
    );
  } else {
    const parts = PART_CHOICES.filter(p => a[p.key]).map(p => p.label.toLowerCase());
    const row = (label, value, key, day) => (
      <li className="flex items-start justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: "var(--iron-line)" }}>
        <span className="min-w-0 text-sm"><span className="block text-xs" style={muted}>{label}</span>{value}</span>
        <button type="button" className="cx-link text-sm flex-none" onClick={() => go(key, day)}>Change</button>
      </li>
    );
    body = (
      <>
        <Ask hint={`Coach IQ fills each day from these answers, ${firstName}'s earlier programs and 1RMs, and ${place ? `the equipment at “${place.name}”` : "any equipment"}. You can change anything after.`}>
          Ready to make it?
        </Ask>
        <label className="grid gap-1 text-xs mb-3" style={muted}>Name
          <input className="cx-input" value={a.name} maxLength={120} onChange={e => set("name", e.target.value)} style={{ color: "var(--ink)" }} />
        </label>
        <ul>
          {row("For", `${client ? `${client.firstName} ${client.lastName}`.trim() : ""}${place ? `, at “${place.name}”` : ""}`, "client")}
          {row("Focus", [aim?.label, ...a.focus.map(f => vocab.focus.find(x => x.key === f)?.label.toLowerCase())].filter(Boolean).join(", also "), "aim")}
          {a.days.map((d, i) => row(`Day ${i + 1}`, [kindLabel(d.kind), d.muscles.length ? `more ${andList(d.muscles.map(g => groupLabel(g).toLowerCase()))}` : null, `${d.minutes} min`].filter(Boolean).join(" · "), "day", i))}
          {row("Warm-up and cool-down", parts.length ? andList(parts).replace(/^./, c => c.toUpperCase()) : "None", "parts")}
          {row("Level", LEVELS.find(l => l.key === a.level)?.label, "level")}
        </ul>
      </>
    );
  }

  const last = step.key === "review";
  return (
    <section ref={top} aria-label="A new program, step by step" style={{ scrollMarginTop: 72 }}>
      <StepBar at={step.part} />
      {error && <p className="text-sm mb-3" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {body}
      <div className="flex gap-2 mt-5 pt-4 border-t" style={{ borderColor: "var(--iron-line)" }}>
        {/* Backing out is quiet: plain grey words, never the weight of Next (Studio, Run 17, A8). */}
        <button type="button" className="cx-quiet flex-1 py-2 text-base" onClick={at === 0 ? onCancel : back}>{at === 0 ? "Cancel" : "Back"}</button>
        <button type="button" className="cx-btn-primary flex-1 py-2 text-base" disabled={!ready}
          aria-busy={busy} onClick={last ? make : next}>
          {last ? (busy ? "Making it…" : "Make the program") : "Next"}
        </button>
      </div>
      <p className="text-sm mt-3 text-center">
        <button type="button" className="cx-link" onClick={onSkip}>Skip the questions and start with an empty program</button>
      </p>
    </section>
  );
}

/* A focus that is also an area to work on (balance), not offered twice. */
const AIM_FOCUS = { balance: "balance" };
