import React, { useCallback, useEffect, useState } from "react";
import { Check, Flag, Undo2, Download, ChevronRight } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };
const SECTIONS = [["exercises", "Exercises"], ["conditions", "Conditions"], ["suggestions", "Suggestions"], ["books", "Books"]];

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

/**
 * Review Coach IQ (ideas audit, 24), for the Primary Master: the library one
 * family at a time, each version a card to Approve or Flag with a comment;
 * the conditions table the same way; trainers' suggestions for the library;
 * and, to come, the books. A mark counts in the app at once; Download
 * reviews gives the file the library's own files are brought up to date
 * from (Glenn, 17 Oct 2026: "App now, file later").
 */
export function ReviewTab({ onSignedOut }) {
  const [summary, setSummary] = useState(null);
  const [section, setSection] = useState("exercises");
  const [familyId, setFamilyId] = useState(null);
  const [family, setFamily] = useState(null);
  const [conditions, setConditions] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);

  const loadSummary = useCallback(() => apiRequest("GET", "/coach-iq/review").then(setSummary).catch(fail), [fail]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (!familyId) { setFamily(null); return undefined; }
    let alive = true;
    apiRequest("GET", `/coach-iq/review/families/${familyId}`).then(f => { if (alive) setFamily(f); }).catch(fail);
    return () => { alive = false; };
  }, [familyId, fail]);

  useEffect(() => {
    if (section !== "conditions" || conditions) return;
    apiRequest("GET", "/coach-iq/review/conditions").then(({ conditions: c }) => setConditions(c)).catch(fail);
  }, [section, conditions, fail]);

  const mark = async (kind, target, body) => {
    setBusy(true); setError("");
    try {
      const { mark: m } = await apiRequest("PUT", `/coach-iq/review/${kind}/${target}`, body);
      if (kind === "exercise") setFamily(f => ({ ...f, versions: f.versions.map(v => (v.id === target ? { ...v, mark: m } : v)) }));
      else setConditions(list => list.map(c => (c.key === target ? { ...c, mark: m } : c)));
      loadSummary();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  /* The next family with something not yet approved, after this one. */
  const next = () => {
    const list = summary.families;
    const from = list.findIndex(f => f.id === familyId);
    const after = [...list.slice(from + 1), ...list.slice(0, from + 1)];
    const todo = after.find(f => f.approved + f.flagged < f.versions);
    setFamilyId((todo || after[0]).id);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>Review Coach IQ</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={muted}>
        Pass each exercise and condition before trainers rely on it. Approving one counts in the app straight away.
      </p>
      {error && <p className="text-sm mb-3" style={{ color: "var(--ember)" }}>{error}</p>}

      {!summary ? (!error && <p className="text-sm" style={muted}>Loading…</p>) : (
        <>
          <section className="cx-card p-4 mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-center">
            <Progress label="exercises" done={summary.approved} flagged={summary.flagged} total={summary.total} />
            <Progress label="conditions" done={summary.conditions.approved} flagged={summary.conditions.flagged} total={summary.conditions.total} />
            <a href="/api/coach-iq/review/export" download className="text-sm cx-link justify-self-start">
              <Download size={15} aria-hidden="true" /> Download reviews
            </a>
          </section>

          <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="What to review">
            {SECTIONS.map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}
                className="px-3 py-1.5 rounded-full text-sm font-medium"
                style={section === id ? { background: "var(--cerulean)", color: "#fff" } : { background: "var(--ghost-fill)", color: "var(--ink)" }}>
                {label}{id === "suggestions" && summary.suggestions.length ? ` (${summary.suggestions.length})` : ""}
              </button>
            ))}
          </div>

          {section === "exercises" && (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <select className="cx-input" style={{ maxWidth: 360 }} value={familyId || ""} aria-label="Family"
                  onChange={e => setFamilyId(e.target.value || null)}>
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
              </div>

              {family && (
                <>
                  <h2 className="cx-display text-2xl">{family.label}</h2>
                  <p className="text-sm mb-3" style={muted}>
                    {[family.pattern, family.purposes.filter(w => w !== family.pattern).join(", "), family.roles.join(", ")].filter(Boolean).join(" · ")}
                  </p>
                  <div className="grid gap-4 lg:grid-cols-2 items-start">
                    {family.versions.map(v => (
                      <article key={v.id} className="cx-card p-4">
                        <div className="font-semibold">{v.name}</div>
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
                        <Marker key={v.mark?.at || "none"} mark={v.mark} busy={busy} onMark={(body) => mark("exercise", v.id, body)} />
                      </article>
                    ))}
                  </div>
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
                    <div className="font-semibold mb-2">{c.label}</div>
                    <div className="grid gap-0.5">
                      <Fact label="Avoid">{[...c.avoid.facts, ...c.avoid.joints.map(j => `the ${j.replace("-", " ")}`)]}</Fact>
                      <Fact label="Easier or supported">{[...c.modify.facts, ...c.modify.joints.map(j => `the ${j.replace("-", " ")}`)]}</Fact>
                      <Fact label="Doctor's go-ahead first">{c.clearance ? "yes" : "no"}</Fact>
                      <Fact label="Refer on">{c.refer}</Fact>
                    </div>
                    <Marker key={c.mark?.at || "none"} mark={c.mark} busy={busy} onMark={(body) => mark("condition", c.key, body)} />
                  </article>
                ))}
              </div>
            )
          )}

          {section === "suggestions" && (
            summary.suggestions.length === 0 ? <p className="text-sm" style={muted}>No trainer has suggested an exercise yet.</p> : (
              <>
                <p className="text-sm mb-3" style={muted}>Exercises trainers made for themselves and think belong in everybody's library. To add one, tell Claude in a session.</p>
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
                    </article>
                  ))}
                </div>
              </>
            )
          )}

          {section === "books" && (
            <section className="cx-card p-4">
              <h2 className="font-semibold">Books</h2>
              <p className="text-sm mt-1" style={muted}>
                Reading a book into Coach IQ will be done here. Until then, give Claude the PDF in a session.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
