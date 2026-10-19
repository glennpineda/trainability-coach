import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, HeartPulse, Pencil, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TESTS, TEST_GROUPS, VO2_SOURCES, NEEDS_WHO, JUMP_STYLES, JUMP_TOOLS, HOLDS, LIFT, HEIGHT, BOX,
  ageOn, sexOf, clockOf, describe, changeOf, seriesOf, titleOf, brzycki } from "../lib/fitness-tests";
import { LibraryPicker } from "../tabs/ExercisesTab";
import { Trend } from "./Trend";
import { MEASURES, toShown, unitOf, exactIfSame } from "../lib/measures";
import { todayIso } from "../lib/date";

/*
 * A client's fitness tests (Glenn, 18 Oct 2026; src/lib/fitness-tests.js).
 * Heart and lungs, from Verywell Fit's article: the 3-minute step test, rated
 * from the article's tables; the Rockport 1-mile walk, with VO2 max worked
 * out; and a VO2 max from a lab or a watch. Strength, from GymAware's: a 1RM
 * (lifted, or worked out from a lighter set), the vertical jump, the drop
 * jump's Reactive Strength Index, a wall sit or plank held, and velocity loss
 * from a bar-speed sensor. Under Measurements on a client's
 * details and laid out as it is: the latest of each test with its change
 * since the one before, earlier ones to open, the trainer's own to change or
 * delete. Every trainer of the client sees them.
 */

const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const WEIGHT = MEASURES.find(m => m.key === "weight");

function Switch({ label, options, value, onPick }) {
  return (
    <div className="flex rounded-[10px] p-1 gap-1" style={{ background: "var(--ghost-fill)" }} role="group" aria-label={label}>
      {options.map(([key, text]) => (
        <button key={key} type="button" aria-pressed={value === key} onClick={() => onPick(key)}
          className="cx-chip flex-1 px-2 py-1.5 rounded-lg text-sm font-medium"
          style={value === key ? { background: "var(--chalk)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" } : { color: "var(--iron)" }}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Field({ label, unit, children }) {
  return (
    <label className="grid gap-1 text-xs min-w-0" style={{ color: "var(--iron)" }}>{label}
      <span className="relative">{children}
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--iron)" }} aria-hidden="true">{unit}</span>}
      </span>
    </label>
  );
}

function Form({ client, units, initial, latestWeight, busy, onSave, onCancel }) {
  const [kind, setKind] = useState(initial?.kind || null);
  const [takenOn, setTakenOn] = useState(initial?.takenOn || todayIso());
  const [age, setAge] = useState(initial?.age != null ? String(initial.age) : "");
  const [sex, setSex] = useState(initial?.sex || sexOf(client?.gender));
  const [heartRate, setHeartRate] = useState(initial?.data?.heartRate != null ? String(initial.data.heartRate) : "");
  const [time, setTime] = useState(initial?.data?.seconds != null ? clockOf(initial.data.seconds) : "");
  const [weight, setWeight] = useState(initial?.data?.weightKg != null ? String(toShown(WEIGHT, initial.data.weightKg, units)) : "");
  const [vo2, setVo2] = useState(initial?.data?.vo2 != null ? String(initial.data.vo2) : "");
  const [source, setSource] = useState(initial?.data?.source || "");
  const [note, setNote] = useState(initial?.note || "");
  /* The strength tests'. */
  const d0 = initial?.data || {};
  const shownOf = (m, v) => (v != null ? String(toShown(m, v, units)) : "");
  const [exercise, setExercise] = useState(d0.exerciseId ? { id: d0.exerciseId, name: d0.exercise } : null);
  const [method, setMethod] = useState(d0.method || "estimated");
  const [lift, setLift] = useState(shownOf(LIFT, d0.weightKg));
  const [reps, setReps] = useState(d0.reps != null ? String(d0.reps) : "");
  const [bodyWeight, setBodyWeight] = useState(shownOf(WEIGHT, d0.bodyWeightKg));
  const [style, setStyle] = useState(d0.style || "hips");
  const [tool, setTool] = useState(d0.tool || "");
  const [height, setHeight] = useState(shownOf(HEIGHT, d0.heightCm));
  const [contactMs, setContactMs] = useState(d0.contactMs != null ? String(d0.contactMs) : "");
  const [box, setBox] = useState(shownOf(BOX, d0.boxCm));
  const [hold, setHold] = useState(d0.hold || "");
  const [held, setHeld] = useState(initial?.kind === "hold" ? clockOf(d0.seconds) : "");
  const [percent, setPercent] = useState(d0.percent != null ? String(d0.percent) : "");
  const [loss, setLoss] = useState(initial?.kind === "vloss" ? String(initial.result) : "");
  /* The age on the day from their birthday, until the trainer types one. */
  const [ageTyped, setAgeTyped] = useState(!!initial);
  const fromBirthday = ageOn(client?.dateOfBirth, takenOn);
  useEffect(() => { if (!ageTyped && fromBirthday != null) setAge(String(fromBirthday)); }, [fromBirthday, ageTyped]);
  /* Their weight from their latest measurements, for the walk. */
  useEffect(() => { if (kind === "rockport" && !weight && latestWeight != null) setWeight(String(toShown(WEIGHT, latestWeight, units))); }, [kind, latestWeight]);
  /* And for a 1RM, to show it against their body weight. */
  useEffect(() => { if (kind === "onerm" && !initial && !bodyWeight && latestWeight != null) setBodyWeight(String(toShown(WEIGHT, latestWeight, units))); }, [kind, latestWeight]);

  if (!kind) {
    return (
      <div className="mt-2 grid gap-2">
        <div className="text-sm font-medium">Which test?</div>
        {TEST_GROUPS.map(g => (
          <div key={g.label} className="grid gap-2">
            <div className="text-xs font-medium mt-1" style={{ color: "var(--ink-soft)" }}>{g.label}</div>
            {g.kinds.map(k => (
              <button key={k} type="button" onClick={() => setKind(k)} className="text-left rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--iron-line)", background: "var(--chalk)" }}>
                <span className="block text-sm font-medium" style={{ color: "var(--ink)" }}>{TESTS[k].label}</span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--iron)" }}>{TESTS[k].how}</span>
              </button>
            ))}
          </div>
        ))}
        <div><button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button></div>
      </div>
    );
  }
  const t = TESTS[kind];
  const needsWho = NEEDS_WHO.includes(kind);
  const estimate = (() => {
    const w = Number(String(lift).replace(",", ".")), r = Number(reps);
    return method === "estimated" && w > 0 && Number.isInteger(r) && r >= 1 && r <= 10 ? Math.round(brzycki(w, r) * 10) / 10 : null;
  })();
  const chips = (label, options, value, onPick) => (
    <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>{label}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map(([k, text]) => (
          <button key={k} type="button" aria-pressed={value === k} onClick={() => onPick(value === k && label.endsWith("(optional)") ? "" : k)}
            className="cx-chip text-xs px-2.5 py-1 rounded-full border"
            style={value === k ? { background: "var(--fill-cerulean)", color: "#fff", borderColor: "var(--fill-cerulean)" } : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" }}>{text}</button>
        ))}
      </div>
    </div>
  );
  const box2 = (label, unit, value, set, aria, mode = "decimal", pad = "2.4rem") => (
    <Field label={label} unit={unit}>
      <input type="text" inputMode={mode} className="cx-input" style={{ color: "var(--ink)", paddingRight: pad }} value={value} onChange={e => set(e.target.value)} aria-label={aria} />
    </Field>
  );
  const pickExercise = (
    exercise ? (
      <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Exercise
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: "var(--iron-line)", background: "var(--chalk)" }}>
          <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{exercise.name}</span>
          <button type="button" className="cx-link text-sm" onClick={() => setExercise(null)}>Change</button>
        </div>
      </div>
    ) : (
      <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Exercise
        <LibraryPicker onPick={(x) => setExercise({ id: x.id, name: x.name })} onCancel={() => (initial ? setExercise({ id: d0.exerciseId, name: d0.exercise }) : setKind(null))} />
      </div>
    )
  );
  return (
    <form className="mt-2 grid gap-3" onSubmit={(e) => {
      e.preventDefault();
      /* A weight or height still as it was filled in goes unrounded, so
         saving a changed note leaves the numbers as they were (Run 1, A-3). */
      const exact = (text, m, v) => exactIfSame(text, v, m, units);
      const liftX = exact(lift, LIFT, d0.weightKg);
      onSave(kind === "onerm" ? { kind, takenOn, note, units, exerciseId: exercise?.id, method, weight: liftX, reps, bodyWeight: exact(bodyWeight, WEIGHT, d0.bodyWeightKg ?? latestWeight) }
        : kind === "jump" ? { kind, takenOn, note, units, style, tool, height: exact(height, HEIGHT, d0.heightCm) }
        : kind === "rsi" ? { kind, takenOn, note, units, height: exact(height, HEIGHT, d0.heightCm), contactMs, box: exact(box, BOX, d0.boxCm) }
        : kind === "hold" ? { kind, takenOn, note, units, hold, time: held }
        : kind === "vloss" ? { kind, takenOn, note, units, exerciseId: exercise?.id, percent, reps, loss, weight: liftX }
        : { kind, takenOn, age, sex, heartRate, time, weight: exact(weight, WEIGHT, initial?.data?.weightKg ?? latestWeight), vo2, source, note, units });
    }}>
      <div className="text-sm font-medium">{t.label}</div>
      {/* How it is done, in the article's words; Coach IQ's card. */}
      <div className="rounded-lg p-3 text-sm" style={{ background: "var(--iq-card)", color: "var(--iq-ink)", border: "1px solid var(--iq-card-line)" }}>
        <p>{t.how}</p>
        {t.tip && <p className="text-xs mt-1.5" style={{ opacity: 0.85 }}>{t.tip}</p>}
      </div>
      <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Day of the test
        <input type="date" className="cx-input" style={{ color: "var(--ink)" }} max={todayIso()} value={takenOn} onChange={e => setTakenOn(e.target.value)} />
      </label>
      {needsWho && (
        <>
          <div className="grid grid-cols-2 gap-2 items-end">
            <Field label="Age on the day" unit="yrs">
              <input type="text" inputMode="numeric" className="cx-input" style={{ color: "var(--ink)", paddingRight: "2.6rem" }} value={age}
                onChange={e => { setAge(e.target.value); setAgeTyped(true); }} aria-label="Age on the day, in years" />
            </Field>
            <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Table
              <Switch label="Which table" options={[["female", "Women"], ["male", "Men"]]} value={sex} onPick={setSex} />
            </div>
          </div>
          {fromBirthday == null && <p className="text-xs -mt-1" style={{ color: "var(--iron)" }}>Their birthday isn&apos;t on their details, so type their age.</p>}
          {!sexOf(client?.gender) && <p className="text-xs -mt-1" style={{ color: "var(--iron)" }}>The article&apos;s tables and the Rockport formula are for women and men: choose the one to use.</p>}
        </>
      )}
      {kind === "step" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Heart rate in the minute after" unit="bpm">
            <input type="text" inputMode="numeric" className="cx-input" style={{ color: "var(--ink)", paddingRight: "3rem" }} value={heartRate} onChange={e => setHeartRate(e.target.value)} aria-label="Heart rate counted in the minute after, bpm" />
          </Field>
        </div>
      )}
      {kind === "rockport" && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Time for the mile" unit="min:s">
            <input type="text" inputMode="numeric" placeholder="14:30" className="cx-input" style={{ color: "var(--ink)", paddingRight: "3.6rem" }} value={time} onChange={e => setTime(e.target.value)} aria-label="Time for the mile, minutes and seconds" />
          </Field>
          <Field label="Heart rate at the end" unit="bpm">
            <input type="text" inputMode="numeric" className="cx-input" style={{ color: "var(--ink)", paddingRight: "3rem" }} value={heartRate} onChange={e => setHeartRate(e.target.value)} aria-label="Heart rate at the end, bpm" />
          </Field>
          <Field label="Weight" unit={unitOf(WEIGHT, units)}>
            <input type="text" inputMode="decimal" className="cx-input" style={{ color: "var(--ink)", paddingRight: "2.4rem" }} value={weight} onChange={e => setWeight(e.target.value)} aria-label={`Weight, ${unitOf(WEIGHT, units)}`} />
          </Field>
          {latestWeight != null && <p className="text-xs self-end pb-2" style={{ color: "var(--iron)" }}>From their latest measurements; change it if it&apos;s different today.</p>}
        </div>
      )}
      {kind === "vo2" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="VO2 max" unit="ml/kg/min">
              <input type="text" inputMode="decimal" className="cx-input" style={{ color: "var(--ink)", paddingRight: "5.2rem" }} value={vo2} onChange={e => setVo2(e.target.value)} aria-label="VO2 max, ml/kg/min" />
            </Field>
          </div>
          <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Where it came from
            <div className="flex flex-wrap gap-1.5">
              {VO2_SOURCES.map(s => (
                <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)}
                  className="cx-chip text-xs px-2.5 py-1 rounded-full border"
                  style={source === s ? { background: "var(--fill-cerulean)", color: "#fff", borderColor: "var(--fill-cerulean)" } : { background: "var(--chalk)", color: "var(--ink)", borderColor: "var(--iron-line)" }}>{s}</button>
              ))}
            </div>
          </div>
        </>
      )}
      {kind === "onerm" && (
        <>
          {pickExercise}
          <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>How it was found
            <Switch label="How it was found" options={[["estimated", "From a lighter set"], ["tested", "Lifted once"]]} value={method} onPick={setMethod} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {box2(method === "estimated" ? "Weight of the set" : "Weight lifted", unitOf(LIFT, units), lift, setLift, `Weight, ${unitOf(LIFT, units)}`)}
            {method === "estimated" && box2("Reps to failure", "reps", reps, setReps, "Reps done to failure, 10 or fewer", "numeric", "3.2rem")}
            {box2("Body weight (optional)", unitOf(WEIGHT, units), bodyWeight, setBodyWeight, `Body weight, ${unitOf(WEIGHT, units)}`)}
          </div>
          {estimate != null && <p className="text-sm -mt-1">1RM about <strong>{estimate} {unitOf(LIFT, units)}</strong></p>}
        </>
      )}
      {kind === "jump" && (
        <>
          <div className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>How they jumped
            <Switch label="How they jumped" options={JUMP_STYLES} value={style} onPick={setStyle} />
          </div>
          <div className="grid grid-cols-2 gap-2">{box2("Height jumped", unitOf(HEIGHT, units), height, setHeight, `Height jumped, ${unitOf(HEIGHT, units)}`)}</div>
          {chips("Measured with (optional)", JUMP_TOOLS.map(x => [x, x]), tool, setTool)}
        </>
      )}
      {kind === "rsi" && (
        <div className="grid grid-cols-2 gap-2">
          {box2("Height jumped", unitOf(HEIGHT, units), height, setHeight, `Height jumped, ${unitOf(HEIGHT, units)}`)}
          {box2("Time on the ground", "ms", contactMs, setContactMs, "Time on the ground, milliseconds", "numeric", "2.6rem")}
          {box2("Box (optional)", unitOf(BOX, units), box, setBox, `Box height, ${unitOf(BOX, units)}`)}
        </div>
      )}
      {kind === "hold" && (
        <>
          {chips("Which hold", HOLDS, hold, setHold)}
          <div className="grid grid-cols-2 gap-2">{box2("Time held", "min:s", held, setHeld, "Time held, minutes and seconds", "numeric", "3.6rem")}</div>
        </>
      )}
      {kind === "vloss" && (
        <>
          {pickExercise}
          <div className="grid grid-cols-2 gap-2">
            {box2("Weight, % of 1RM", "%", percent, setPercent, "Weight as a percentage of 1RM", "numeric", "2rem")}
            {box2("Reps in the set", "reps", reps, setReps, "Reps in the set", "numeric", "3.2rem")}
            {box2("Velocity loss", "%", loss, setLoss, "Velocity loss the sensor showed, percent", "decimal", "2rem")}
            {box2("Weight (optional)", unitOf(LIFT, units), lift, setLift, `Weight, ${unitOf(LIFT, units)}`)}
          </div>
        </>
      )}
      <label className="grid gap-1 text-xs" style={{ color: "var(--iron)" }}>Note (optional)
        <textarea className="cx-input text-sm" rows={2} maxLength={1000} style={{ color: "var(--ink)" }} value={note} onChange={e => setNote(e.target.value)}
          placeholder={kind === "rockport" ? "Such as: outdoor track, windy" : kind === "onerm" || kind === "vloss" ? "Such as: belt, paused reps" : "Such as: how they felt"} />
      </label>
      {/* Verywell's safety note, and GymAware's for strength: form first. */}
      <p className="text-xs" style={{ color: "var(--iron)" }}>
        {NEEDS_WHO.includes(kind) || kind === "vo2"
          ? "Feeling agitated or moody, sleeping badly, off their food, low or stressed can be signs of overtraining: back off for at least a week before testing again."
          : "Only good form counts: if the technique breaks down, the test isn't measuring what they can do, and they could be hurt."}
      </p>
      <div className="flex gap-2">
        <button type="submit" className="cx-btn-primary px-5 py-2 text-sm" disabled={busy} aria-busy={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* A test's results as a chart, the newest of each day: in the trainer's
   units, a hold in minutes and seconds. */
function TestTrend({ results, units }) {
  const k = results[0].kind;
  const measure = k === "onerm" ? LIFT : k === "jump" ? HEIGHT : null;
  const byDay = new Map();
  for (const t of [...results].reverse()) byDay.set(t.takenOn, measure ? toShown(measure, t.result, units) : t.result);
  const points = [...byDay].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, value]) => ({ date, value }));
  const unit = k === "step" ? " bpm" : k === "vloss" ? "%" : measure ? ` ${unitOf(measure, units)}` : k === "rsi" ? "" : " ml/kg/min";
  const format = k === "hold" ? (v) => clockOf(v) : k === "rsi" ? (v) => `RSI ${v.toFixed(2)}` : (v) => `${v}${unit}`;
  return <Trend series={[{ name: titleOf(results[0]), points }]} format={format} tick={k === "hold" ? clockOf : undefined} label={`${titleOf(results[0])} over time`} />;
}

/* One result, as on the client's details and a message's card. */
export function TestResult({ t, previous, units }) {
  const d = describe(t, units);
  const c = changeOf(t, previous, units);
  return (
    <div className="text-sm">
      <div className="flex items-baseline flex-wrap gap-x-2">
        <span className="font-medium tabular-nums">{d.text}</span>
        {d.rating && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>{d.rating}</span>}
      </div>
      <div className="text-xs" style={{ color: "var(--iron)" }}>
        {[d.detail, c && `${c} since ${dateText(previous.takenOn)}`].filter(Boolean).join(" · ")}
      </div>
    </div>
  );
}

export function FitnessTests({ client, onSignedOut, inTab = false }) {
  const clientId = client.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);   // "new", or a result's id
  const [deleting, setDeleting] = useState(null);
  const [open, setOpen] = useState([]);   // the kinds whose earlier results are open
  const [latestWeight, setLatestWeight] = useState(null);

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);
  useEffect(() => {
    let alive = true;
    apiRequest("GET", `/clients/${clientId}/tests`).then(d => { if (alive) setData(d); }).catch(err => { if (alive) fail(err); });
    apiRequest("GET", `/clients/${clientId}/measurements`)
      .then(d => { if (alive) setLatestWeight((d.measurements || []).find(m => m.values.weight != null)?.values.weight ?? null); }).catch(() => {});
    return () => { alive = false; };
  }, [clientId, fail]);

  const send = async (method, path, body) => {
    setBusy(true); setError("");
    try { setData(await apiRequest(method, path, body)); return true; }
    catch (err) { fail(err); return false; }
    finally { setBusy(false); }
  };

  const list = data?.tests || [];
  const units = data?.units || "imperial";
  /* Each test (and exercise, jump or hold) once, its latest first, in the
     groups' order. */
  const order = TEST_GROUPS.flatMap(g => g.kinds);
  const series = [...new Set(list.map(seriesOf))].sort((a, b) => order.indexOf(a.split("|")[0]) - order.indexOf(b.split("|")[0]));
  const groupOf = (key) => TEST_GROUPS.find(g => g.kinds.includes(key.split("|")[0])).label;
  const before = (t) => list.find(x => seriesOf(x) === seriesOf(t) && x.takenOn < t.takenOn) || null;

  /* A function, not a component: as a component defined in here it would be
     a new one each render, and a result being changed would lose what was typed. */
  const row = (t, first = false) => (
    <div key={t.id} className="rounded-lg p-2.5 mt-2" style={{ background: "var(--ghost-fill)" }}>
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          {first && <span className="block text-sm font-semibold">{titleOf(t)}</span>}
          <span className="block text-xs mb-1" style={{ color: "var(--iron)" }}>{dateText(t.takenOn)} · by {t.mine ? "you" : t.takenBy}</span>
        </span>
        {t.mine && editing !== t.id && deleting !== t.id && (
          <span className="flex gap-1">
            <button type="button" className="cx-icon-btn" aria-label="Change this result" title="Change" onClick={() => setEditing(t.id)}><Pencil size={15} aria-hidden="true" /></button>
            <button type="button" className="cx-icon-btn" aria-label="Delete this result" title="Delete" onClick={() => setDeleting(t.id)}><Trash2 size={15} aria-hidden="true" /></button>
          </span>
        )}
      </div>
      {editing === t.id ? (
        <Form client={client} units={units} initial={t} latestWeight={latestWeight} busy={busy} onCancel={() => setEditing(null)}
          onSave={async (body) => { if (await send("PUT", `/tests/${t.id}`, body)) setEditing(null); }} />
      ) : (
        <>
          <TestResult t={t} previous={before(t)} units={units} />
          {t.note && <p className="text-xs mt-1.5" style={{ color: "var(--iron)" }}>{t.note}</p>}
        </>
      )}
      {deleting === t.id && (
        <div className="mt-2 rounded-lg p-2.5 flex flex-wrap items-center gap-2" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
          <span className="text-sm flex-1 min-w-[10rem]">Delete this result? Its trainers will no longer see it.</span>
          <span className="flex items-center gap-1">
            <button type="button" className="cx-btn-ember px-3 py-1.5 text-sm" disabled={busy} aria-busy={busy}
              onClick={async () => { if (await send("DELETE", `/tests/${t.id}`)) setDeleting(null); }}>{busy ? "Deleting…" : "Delete"}</button>
            <button type="button" className="px-3 py-1.5 text-sm" style={{ color: "var(--ink-soft)" }} onClick={() => setDeleting(null)}>Keep it</button>
          </span>
        </div>
      )}
    </div>
  );

  return (
    /* In its own tab of the client's dialog (ClientsTab), the tab names it:
       no heading or rule of its own. */
    <div className={inTab ? "" : "sm:col-span-2 mt-2 pt-3 border-t"} style={inTab ? undefined : { borderColor: "var(--iron-line)" }}>
      <div className={inTab ? "hidden" : "flex items-center gap-2 mb-1"}>
        <HeartPulse size={18} style={{ color: "var(--accent)" }} aria-hidden="true" />
        <span className="text-sm font-semibold">Fitness tests</span>
      </div>
      {error && <p className="text-sm my-1" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      {!data ? (!error && <p className="text-sm" style={{ color: "var(--iron)" }}>Loading…</p>) : (
        <>
          {list.length === 0 && editing !== "new" && <p className="text-sm" style={{ color: "var(--iron)" }}>None done yet.</p>}
          {series.map((k, i) => {
            const ofKind = list.filter(t => seriesOf(t) === k);
            const isOpen = open.includes(k);
            const heading = (i === 0 || groupOf(series[i - 1]) !== groupOf(k)) && groupOf(k);
            return (
              <div key={k}>
                {heading && <div className="text-xs font-medium mt-3" style={{ color: "var(--ink-soft)" }}>{heading}</div>}
                {row(ofKind[0], true)}
                {isOpen && <TestTrend results={ofKind} units={units} />}
                {isOpen && ofKind.slice(1).map(t => row(t))}
                {ofKind.length > 1 && (
                  <button type="button" className="cx-link text-sm mt-1.5" aria-expanded={isOpen}
                    onClick={() => setOpen(o => (o.includes(k) ? o.filter(x => x !== k) : [...o, k]))}>
                    <ChevronDown size={14} aria-hidden="true" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                    {isOpen ? "Show only the latest" : `Earlier results (${ofKind.length - 1})`}
                  </button>
                )}
              </div>
            );
          })}
          {editing === "new" ? (
            <Form client={client} units={units} latestWeight={latestWeight} busy={busy} onCancel={() => setEditing(null)}
              onSave={async (body) => { if (await send("POST", `/clients/${clientId}/tests`, body)) setEditing(null); }} />
          ) : (
            <button type="button" className="cx-btn-quiet w-full mt-3 py-2 text-sm" onClick={() => setEditing("new")}>
              <Plus size={14} aria-hidden="true" /> Add a test result
            </button>
          )}
        </>
      )}
    </div>
  );
}
