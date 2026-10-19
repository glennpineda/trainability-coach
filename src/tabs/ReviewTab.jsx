import React, { useCallback, useEffect, useState } from "react";
import { scrollPageTo } from "../lib/scroll";
import { Check, Flag, Undo2, Download, ChevronRight, Pencil, History, Archive, Plus } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";
import { VersionForm, FamilyForm, ConditionForm, PrincipleForm, ChangeList, AddButton } from "../review/LibraryEditor";
import { Prose, Standing } from "../review/Prose";
import { BooksSection } from "../review/Books";

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };
const SECTIONS = [["exercises", "Exercises"], ["conditions", "Conditions"], ["principles", "Principles"], ["suggestions", "Suggestions"], ["changes", "Changes"], ["books", "Books"]];

/* How far through: a count and a bar. */
function Progress({ label, done, flagged, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="min-w-0">
      <div className="text-sm"><b>{done}</b> of {total} {label} approved{flagged ? <span style={{ color: "var(--ember)" }}> · {flagged} flagged</span> : null}</div>
      <div className="h-2 rounded-full mt-1 overflow-hidden" style={{ background: "var(--ghost-fill)" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} approved`}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--cerulean)" }} />
      </div>
    </div>
  );
}

/* One fact on a card: a label and its words, left out when there is nothing. */
const Fact = ({ label, children }) => (children && (!Array.isArray(children) || children.length) ? (
  <div className="text-sm"><span style={muted}>{label}: </span>{Array.isArray(children) ? children.join(", ") : children}</div>
) : null);

/* Approve or Flag, with a comment; once marked, what was said and Take back. */
function Marker({ mark, onMark, busy }) {
  const [comment, setComment] = useState("");
  const [needsWords, setNeedsWords] = useState(false);
  if (mark) {
    const flag = mark.mark === "flag";
    return (
      <div className="mt-3 pt-3 border-t flex flex-wrap items-center justify-between gap-2" style={line}>
        <span className="text-sm min-w-0">
          <span className="inline-flex items-center gap-1 font-medium" style={{ color: flag ? "var(--ember)" : "var(--cerulean)" }}>
            {flag ? <Flag size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />} {flag ? "Flagged" : "Approved"}
          </span>
          <span style={muted}> on {new Date(mark.at).toLocaleDateString()}</span>
          {mark.comment && <span className="block mt-0.5">“{mark.comment}”</span>}
        </span>
        <button type="button" className="cx-btn-row" disabled={busy}
          onClick={() => onMark({ mark: "clear" })}>
          <Undo2 size={15} aria-hidden="true" /> Take back
        </button>
      </div>
    );
  }
  return (
    <div className="mt-3 pt-3 border-t grid gap-2" style={line}>
      <textarea className="cx-input text-sm" rows={2} maxLength={1000} value={comment} aria-label="Comment"
        placeholder={needsWords ? "Say what's wrong, so it can be fixed" : "A comment (needed to flag)"}
        onChange={e => { setComment(e.target.value); setNeedsWords(false); }} />
      {/* Row buttons, not primaries: every card on the screen has a pair, and a
          screen has one primary at most (Studio's CONTRIBUTING). Side by side
          they share the card's width. */}
      <div className="flex gap-2">
        <button type="button" className="cx-btn-row flex-1" disabled={busy}
          onClick={() => onMark({ mark: "approve", comment })}>
          <Check size={16} aria-hidden="true" /> Approve
        </button>
        <button type="button" className="cx-btn-row flex-1" disabled={busy}
          onClick={() => (comment.trim() ? onMark({ mark: "flag", comment }) : setNeedsWords(true))}>
          <Flag size={16} aria-hidden="true" /> Flag
        </button>
      </div>
    </div>
  );
}

/* A card's own row of actions: Edit, History, and Retire or Bring back. */
function CardActions({ children }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">{children}</div>;
}

/**
 * Review Coach IQ (ideas audit, 24), for the Primary Master, and since the
 * library moved into the app (build 1.0.12; Glenn, 17 Oct 2026: "Is there
 * another way so it's app controlled?") its editor too: the library one
 * family at a time, each version a card to Approve or Flag, Edit, Retire or
 * look back through; families and versions added; the conditions table the
 * same way; the principles, topic by topic (build 1.0.16); trainers'
 * suggestions made library exercises; every change listed under Changes to
 * undo; Export for a snapshot; and Books, where a book is read into the
 * principles (build 1.0.16). A mark and an edit count at once.
 */
export function ReviewTab({ onSignedOut }) {
  const [summary, setSummary] = useState(null);
  const [section, setSection] = useState("exercises");
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [principles, setPrinciples] = useState(null);
  const [topic, setTopic] = useState(null);
  const [changes, setChanges] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  /* What is open for editing: { kind, id }, and what the server said. */
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [history, setHistory] = useState({ id: null, list: null });

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);

  const loadSummary = useCallback(() => apiRequest("GET", "/coach-iq/review").then(setSummary).catch(fail), [fail]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const loadFamily = useCallback((id) => apiRequest("GET", `/coach-iq/review/families/${id}`).then(setFamily).catch(err => { if (err.status === 404) { setFamily(null); setFamilyId(null); } else fail(err); }), [fail]);
  useEffect(() => {
    if (!familyId) { setFamily(null); return; }
    loadFamily(familyId);
  }, [familyId, loadFamily]);

  const loadConditions = useCallback(() => apiRequest("GET", "/coach-iq/review/conditions").then(({ conditions: c }) => setConditions(c)).catch(fail), [fail]);
  useEffect(() => { if (section === "conditions" && !conditions) loadConditions(); }, [section, conditions, loadConditions]);

  const loadPrinciples = useCallback(() => apiRequest("GET", "/coach-iq/review/principles").then(({ principles: p }) => setPrinciples(p)).catch(fail), [fail]);
  useEffect(() => { if (section === "principles" && !principles) loadPrinciples(); }, [section, principles, loadPrinciples]);

  const loadChanges = useCallback(() => apiRequest("GET", "/coach-iq/library/history").then(({ changes: c }) => setChanges(c)).catch(fail), [fail]);
  useEffect(() => { if (section === "changes") loadChanges(); }, [section, loadChanges]);

  const open = (kind, id = null) => { setEditing(kind ? { kind, id } : null); setFormError(null); };
  const is = (kind, id = null) => editing?.kind === kind && editing?.id === id;

  /* Save through the editor: on success close the form and read again what
     changed; on a refusal keep the form open with the server's reasons. */
  const save = async (method, path, body, after) => {
    setBusy(true); setFormError(null);
    try {
      const out = await apiRequest(method, path, body);
      await after?.(out);
      setEditing(null);
      loadSummary();
      if (history.id) showHistory(history.id, true);
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      else setFormError({ message: err.message, problems: err.data?.problems });
    } finally { setBusy(false); }
  };

  const mark = async (kind, target, body) => {
    setBusy(true); setError("");
    try {
      const { mark: m } = await apiRequest("PUT", `/coach-iq/review/${kind}/${target}`, body);
      if (kind === "exercise") setFamily(f => ({ ...f, versions: f.versions.map(v => (v.id === target ? { ...v, mark: m } : v)) }));
      else if (kind === "principle") loadPrinciples();
      else setConditions(list => list.map(c => (c.key === target ? { ...c, mark: m } : c)));
      loadSummary();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  /* One row's changes, shown under its card. */
  const showHistory = async (id, keep = false) => {
    if (history.id === id && !keep) { setHistory({ id: null, list: null }); return; }
    setHistory({ id, list: keep ? history.list : null });
    try { const { changes: c } = await apiRequest("GET", `/coach-iq/library/history?id=${encodeURIComponent(id)}`); setHistory({ id, list: c }); }
    catch (err) { fail(err); }
  };

  const undo = async (change) => {
    setBusy(true); setFormError(null);
    try {
      await apiRequest("POST", `/coach-iq/library/history/${change.id}/undo`);
      loadSummary(); loadChanges();
      if (familyId) loadFamily(familyId);
      if (conditions) loadConditions();
      if (principles) loadPrinciples();
      if (history.id) showHistory(history.id, true);
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      else setFormError({ message: err.message, problems: err.data?.problems });
    } finally { setBusy(false); }
  };

  /* The next family with something not yet approved, after this one. */
  const next = () => {
    const list = summary.families;
    const from = list.findIndex(f => f.id === familyId);
    const after = [...list.slice(from + 1), ...list.slice(0, from + 1)];
    const todo = after.find(f => f.approved + f.flagged < f.versions);
    setFamilyId((todo || after[0]).id); open(null);
    scrollPageTo({ top: 0 });
  };

  const families = summary?.families.map(f => ({ id: f.id, label: f.label }));
  const historyUnder = (id) => history.id === id && (
    <div className="mt-3 pt-3 border-t" style={line}>
      <ChangeList changes={history.list} busy={busy} onUndo={undo} error={null} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>Review Coach IQ</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={muted}>
        Pass each exercise and condition before trainers rely on it, and keep the library right. Every change counts
        straight away, and can be undone under Changes.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--ember)" }}>{error}</p>}

      {!summary ? (!error && <p className="text-sm" style={muted}>Loading…</p>) : (
        <>
          <section className="cx-card p-4 mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] items-center">
            <Progress label="exercises" done={summary.approved} flagged={summary.flagged} total={summary.total} />
            <Progress label="conditions" done={summary.conditions.approved} flagged={summary.conditions.flagged} total={summary.conditions.total} />
            <Progress label="principles" done={summary.principles.approved} flagged={summary.principles.flagged} total={summary.principles.total} />
            <a href="/api/coach-iq/library/export" download className="text-sm cx-link justify-self-start">
              <Download size={15} aria-hidden="true" /> Export the library
            </a>
          </section>

          <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="What to review">
            {SECTIONS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => { setSection(id); open(null); }}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={section === id ? { background: "var(--fill-cerulean)", color: "#fff" } : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
                {label}{id === "suggestions" && summary.suggestions.length ? ` (${summary.suggestions.length})` : ""}
              </button>
            ))}
          </div>

          {section === "exercises" && (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <select className="cx-input" style={{ maxWidth: 360 }} value={familyId || ""} aria-label="Family"
                  onChange={e => { setFamilyId(e.target.value || null); open(null); }}>
                  <option value="">Choose a family…</option>
                  {summary.families.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.label} — {f.approved} of {f.versions}{f.flagged ? `, ${f.flagged} flagged` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" className="text-sm cx-link" onClick={next}>
                  {familyId ? "Next family" : "Start with the first not done"} <ChevronRight size={16} aria-hidden="true" />
                </button>
                <button type="button" className="cx-btn-row" onClick={() => open("newFamily")}>
                  <Plus size={15} aria-hidden="true" /> Add a family
                </button>
              </div>

              {is("newFamily") && <NewFamily families={families} busy={busy} error={formError} onCancel={() => open(null)}
                onSave={(body) => save("POST", "/coach-iq/library/families", body, (out) => { setFamilyId(out.id); setFamily(out.family); })} />}

              {family && !is("newFamily") && (
                <>
                  {is("family", family.id) ? (
                    <section className="cx-card p-4 mb-4">
                      <h2 className="cx-display text-xl">Change the family</h2>
                      <FamilyForm initial={family.raw} busy={busy} error={formError} onCancel={() => open(null)}
                        onSave={(body) => save("PUT", `/coach-iq/library/families/${family.id}`, body, (out) => setFamily(out))} />
                    </section>
                  ) : (
                    <>
                      <h2 className="cx-display text-2xl">{family.label}</h2>
                      <p className="text-sm" style={muted}>
                        {[family.pattern, family.purposes.filter(w => w !== family.pattern).join(", "), family.roles.join(", ")].filter(Boolean).join(" · ")}
                      </p>
                      <CardActions>
                        <button type="button" className="cx-btn-row" onClick={() => open("family", family.id)}><Pencil size={15} aria-hidden="true" /> Edit the family</button>
                      </CardActions>
                    </>
                  )}
                  <div className="grid gap-4 lg:grid-cols-2 items-start mt-4">
                    {family.versions.map(v => (
                      <article key={v.id} className="cx-card p-4" style={v.status === "retired" ? { opacity: 0.75 } : undefined}>
                        {is("version", v.id) ? (
                          <>
                            <div className="font-semibold">Change {v.name}</div>
                            <VersionForm initial={v} families={families} busy={busy} error={formError} onCancel={() => open(null)}
                              onSave={(body) => save("PUT", `/coach-iq/library/exercises/${v.id}`, body, (out) => { setFamily(out); if (out.id !== familyId) setFamilyId(out.id); })} />
                          </>
                        ) : (
                          <>
                            <div className="font-semibold">{v.name}{v.status === "retired" && <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)" }}>Retired</span>}</div>
                            <div className="text-sm mb-2" style={muted}>{v.master}</div>
                            <div className="grid gap-0.5">
                              <Fact label="Also called">{[...v.aliases, ...v.formerNames]}</Fact>
                              <Fact label="Level">{v.level}</Fact>
                              <Fact label="Works">{v.primary}</Fact>
                              <Fact label="Also works">{v.secondary}</Fact>
                              <Fact label="Needs">{[...v.needs, ...(v.needsOneOf.length ? [v.needsOneOf.join(" or ")] : []), ...(v.piece ? [v.piece] : [])]}</Fact>
                              <Fact label="Counted in">{`${v.measure.join(" or ")}${v.perSide ? ", each side" : ""}`}</Fact>
                              <Fact label="Involves">{v.facts}</Fact>
                              <Fact label="Loads">{v.joints}</Fact>
                              <Fact label="Easier">{v.easier}</Fact>
                              <Fact label="Harder">{v.harder}</Fact>
                            </div>
                            <CardActions>
                              <button type="button" className="cx-btn-row" onClick={() => open("version", v.id)}><Pencil size={15} aria-hidden="true" /> Edit</button>
                              {v.status === "retired" ? (
                                <button type="button" className="cx-btn-row" disabled={busy}
                                  onClick={() => save("PUT", `/coach-iq/library/exercises/${v.id}/retired`, { retired: false }, (out) => setFamily(out))}>
                                  <Undo2 size={15} aria-hidden="true" /> Bring back
                                </button>
                              ) : (
                                <button type="button" className="cx-btn-row" disabled={busy}
                                  onClick={() => save("PUT", `/coach-iq/library/exercises/${v.id}/retired`, { retired: true }, (out) => setFamily(out))}>
                                  <Archive size={15} aria-hidden="true" /> Retire
                                </button>
                              )}
                              <button type="button" className="text-sm cx-link" onClick={() => showHistory(v.id)}><History size={15} aria-hidden="true" /> History</button>
                            </CardActions>
                            {historyUnder(v.id)}
                            {v.status !== "retired" && <Marker key={v.mark?.at || "none"} mark={v.mark} busy={busy} onMark={(body) => mark("exercise", v.id, body)} />}
                          </>
                        )}
                      </article>
                    ))}
                    {is("newVersion", family.id) ? (
                      <article className="cx-card p-4">
                        <div className="font-semibold">A new version of {family.label}</div>
                        <VersionForm initial={{ movement: family.id }} busy={busy} error={formError} word="Add it" onCancel={() => open(null)}
                          onSave={(body) => save("POST", "/coach-iq/library/exercises", { ...body, movement: family.id }, (out) => setFamily(out.family))} />
                      </article>
                    ) : (
                      <div className="lg:col-span-2"><AddButton onClick={() => open("newVersion", family.id)}>Add a version of {family.label}</AddButton></div>
                    )}
                  </div>
                  {!editing && formError && <div className="mt-3"><FormNote error={formError} /></div>}
                  <button type="button" className="mt-4 text-sm cx-link" onClick={next}>
                    Next family <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </>
              )}
            </>
          )}

          {section === "conditions" && (
            !conditions ? <p className="text-sm" style={muted}>Loading…</p> : (
              <div className="grid gap-4 lg:grid-cols-2 items-start">
                {conditions.map(c => (
                  <article key={c.key} className="cx-card p-4">
                    {is("condition", c.key) ? (
                      <>
                        <div className="font-semibold">Change {c.label}</div>
                        <ConditionForm initial={c.raw} busy={busy} error={formError} onCancel={() => open(null)}
                          onSave={(body) => save("PUT", `/coach-iq/library/conditions/${c.key}`, body, (out) => setConditions(out.conditions))} />
                      </>
                    ) : (
                      <>
                        <div className="font-semibold mb-2">{c.label}</div>
                        <div className="grid gap-0.5">
                          <Fact label="Avoid">{[...c.avoid.facts, ...c.avoid.joints.map(j => `the ${j.replace("-", " ")}`)]}</Fact>
                          <Fact label="Easier or supported">{[...c.modify.facts, ...c.modify.joints.map(j => `the ${j.replace("-", " ")}`)]}</Fact>
                          <Fact label="Doctor's go-ahead first">{c.clearance ? "yes" : "no"}</Fact>
                          <Fact label="Refer on">{c.refer}</Fact>
                        </div>
                        <CardActions>
                          <button type="button" className="cx-btn-row" onClick={() => open("condition", c.key)}><Pencil size={15} aria-hidden="true" /> Edit</button>
                          <button type="button" className="text-sm cx-link" onClick={() => showHistory(c.key)}><History size={15} aria-hidden="true" /> History</button>
                        </CardActions>
                        {historyUnder(c.key)}
                        <Marker key={c.mark?.at || "none"} mark={c.mark} busy={busy} onMark={(body) => mark("condition", c.key, body)} />
                      </>
                    )}
                  </article>
                ))}
                {is("newCondition") ? (
                  <article className="cx-card p-4">
                    <div className="font-semibold">A new condition</div>
                    <ConditionForm busy={busy} error={formError} word="Add it" onCancel={() => open(null)}
                      onSave={(body) => save("POST", "/coach-iq/library/conditions", body, (out) => setConditions(out.conditions))} />
                  </article>
                ) : (
                  <div className="lg:col-span-2"><AddButton onClick={() => open("newCondition")}>Add a condition</AddButton></div>
                )}
              </div>
            )
          )}

          {section === "principles" && (
            !principles ? <p className="text-sm" style={muted}>Loading…</p> : (
              <>
                <p className="text-sm mb-3" style={muted}>
                  How Trainability designs a program, one topic at a time. Billy works from the reviewed ones; a draft waits
                  for your approval.
                </p>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] items-start">
                  <ul className="cx-card p-2 grid">
                    {principles.map(p => (
                      <li key={p.key}>
                        <button type="button" onClick={() => { setTopic(p.key); open(null); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm"
                          style={topic === p.key ? { background: "var(--ghost-fill)" } : undefined} aria-current={topic === p.key ? "true" : undefined}>
                          <span className="font-medium">{p.title}</span>
                          {p.status !== "reviewed" && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)" }}>Draft</span>}
                          {p.mark?.mark === "flag" && <Flag size={13} className="inline ml-1.5" style={{ color: "var(--ember)" }} aria-label="Flagged" />}
                        </button>
                      </li>
                    ))}
                    <li className="mt-1"><AddButton onClick={() => { setTopic(null); open("newPrinciple"); }}>Add a topic</AddButton></li>
                  </ul>
                  {is("newPrinciple") ? (
                    <article className="cx-card p-4">
                      <div className="font-semibold">A new topic</div>
                      <PrincipleForm busy={busy} error={formError} word="Add it" onCancel={() => open(null)}
                        onSave={(body) => save("POST", "/coach-iq/library/principles", body, (out) => { setPrinciples(out.principles); setTopic(out.principles[out.principles.length - 1]?.key); })} />
                    </article>
                  ) : (() => {
                    const p = principles.find(x => x.key === topic);
                    if (!p) return <p className="text-sm" style={muted}>Choose a topic to read it.</p>;
                    return (
                      <article className="cx-card p-4 min-w-0">
                        {is("principle", p.key) ? (
                          <>
                            <div className="font-semibold">Change {p.title}</div>
                            <PrincipleForm initial={p} busy={busy} error={formError} onCancel={() => open(null)}
                              onSave={(body) => save("PUT", `/coach-iq/library/principles/${p.key}`, body, (out) => setPrinciples(out.principles))} />
                          </>
                        ) : (
                          <>
                            <h2 className="cx-display text-2xl">{p.title}</h2>
                            <div className="text-sm" style={muted}>{p.covers}</div>
                            <Standing p={p} />
                            <div className="mt-3"><Prose text={p.body} onTopic={(k) => { setTopic(k); scrollPageTo({ top: 0 }); }} /></div>
                            <CardActions>
                              <button type="button" className="cx-btn-row" onClick={() => open("principle", p.key)}><Pencil size={15} aria-hidden="true" /> Edit</button>
                              <button type="button" className="text-sm cx-link" onClick={() => showHistory(p.key)}><History size={15} aria-hidden="true" /> History</button>
                            </CardActions>
                            {historyUnder(p.key)}
                            <Marker key={p.mark?.at || "none"} mark={p.mark} busy={busy} onMark={(body) => mark("principle", p.key, body)} />
                          </>
                        )}
                      </article>
                    );
                  })()}
                </div>
              </>
            )
          )}

          {section === "suggestions" && (
            summary.suggestions.length === 0 ? <p className="text-sm" style={muted}>No trainer has suggested an exercise yet.</p> : (
              <>
                <p className="text-sm mb-3" style={muted}>
                  Exercises trainers made for themselves and think belong in everybody's library. Adding one makes it a
                  version of a family, and the trainer's names for it follow it there.
                </p>
                <div className="grid gap-4 lg:grid-cols-2 items-start">
                  {summary.suggestions.map(x => (
                    <article key={x.id} className="cx-card p-4">
                      <div className="font-semibold">{x.name}</div>
                      <div className="text-sm mb-2" style={muted}>Suggested by {x.by || "a trainer"} on {new Date(x.suggestedAt).toLocaleDateString()}</div>
                      <Fact label="Closest to">{x.family}</Fact>
                      <Fact label="Works">{x.primary}</Fact>
                      <Fact label="Needs">{x.needs}</Fact>
                      <Fact label="How it's done">{x.note}</Fact>
                      <Fact label="Why">{x.suggestNote}</Fact>
                      {is("suggestion", x.id) ? (
                        <VersionForm initial={{ name: x.name, movement: x.familyId || "", primary: x.primary }} families={families}
                          busy={busy} error={formError} word="Add to the library" onCancel={() => open(null)}
                          onSave={(body) => save("POST", `/coach-iq/library/suggestions/${x.id}`, body, (out) => { setSection("exercises"); setFamilyId(out.family); loadFamily(out.family); })} />
                      ) : (
                        <CardActions>
                          <button type="button" className="cx-btn-row" onClick={() => open("suggestion", x.id)}><Plus size={15} aria-hidden="true" /> Add to the library</button>
                        </CardActions>
                      )}
                    </article>
                  ))}
                </div>
              </>
            )
          )}

          {section === "changes" && (
            <section className="cx-card p-4">
              <h2 className="cx-display text-xl">Changes to the library</h2>
              <p className="text-sm mt-1 mb-2" style={muted}>
                Newest first. Undo puts back what a change touched, as a change of its own. If something it touched has
                changed since, undo that first.
              </p>
              <ChangeList changes={changes} busy={busy} onUndo={undo} error={formError} />
            </section>
          )}

          {section === "books" && <BooksSection onSignedOut={onSignedOut} onAccepted={() => { loadSummary(); setPrinciples(null); }} />}
        </>
      )}
    </div>
  );
}

/* What the server said about a change made from a card's own buttons (Retire,
   Bring back), which have no form to show it in. */
function FormNote({ error }) {
  return (
    <div className="text-sm rounded-lg p-2.5" role="alert" style={{ background: "var(--ember-soft)", color: "var(--ink-soft)" }}>
      <div className="font-semibold">{error.message}</div>
      {error.problems?.length > 0 && <ul className="list-disc pl-5 mt-1">{error.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
    </div>
  );
}

/* A new family: its details, then its first version, saved together, since a
   family can't be empty. */
function NewFamily({ families, busy, error, onSave, onCancel }) {
  const [family, setFamily] = useState(null);
  const [draft, setDraft] = useState({});
  return (
    <section className="cx-card p-4 mb-4">
      <h2 className="cx-display text-xl">{family ? `${family.label}: its first version` : "A new family"}</h2>
      {!family ? (
        <FamilyForm initial={draft} busy={busy} error={null} word="Next: its first version" onCancel={onCancel} onSave={(f) => { setDraft(f); setFamily(f); }} />
      ) : (
        <VersionForm initial={{}} busy={busy} error={error} word="Add the family" onCancel={onCancel}
          intro={<button type="button" className="text-sm cx-link justify-self-start" onClick={() => setFamily(null)}><Undo2 size={15} aria-hidden="true" /> Back to the family</button>}
          onSave={(version) => onSave({ family, version })} />
      )}
    </section>
  );
}
