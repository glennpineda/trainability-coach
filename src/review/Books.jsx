import React, { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Loader2, RotateCcw, Archive, Pencil, X, Upload } from "lucide-react";
import { API, apiRequest } from "../lib/api";
import { Prose } from "./Prose";
import { PrincipleForm, Problems } from "./LibraryEditor";
import { fmtDay } from "../lib/date";
import { LoadingLine } from "../chrome/LoadingLine";

/**
 * Review Coach IQ → Books (build 1.0.16; Glenn, 17 Oct 2026: "Do all 3"):
 * the Primary Master uploads a book as a PDF, Coach reads it in the
 * background (server/books.js), and the proposed changes to the principles
 * come back topic by topic. Each open point is answered one at a time, with
 * a recommended answer, then written in; the topic is read, edited if need
 * be, and accepted or rejected. Nothing reaches the principles or Billy
 * until it is accepted.
 */

const muted = { color: "var(--iron)" };
const line = { borderColor: "var(--iron-line)" };
const ACTIVE = ["waiting", "reading"];
const STATUS = { waiting: "Waiting to be read", reading: "Reading", ready: "Ready for you", done: "Done", failed: "Stopped", discarded: "Put away" };

const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const tokens = (n) => (n >= 1000 ? `${Math.round(n / 1000).toLocaleString()}k` : String(n));

/* The PDF sent as the request's own body, so the bar can show it going. */
function send(file, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("POST", `${API}/api/coach-iq/books`);
    x.withCredentials = true;
    x.setRequestHeader("Content-Type", "application/pdf");
    x.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      let data = {};
      try { data = JSON.parse(x.responseText); } catch { /* not JSON */ }
      if (x.status >= 200 && x.status < 300) return resolve(data);
      const err = new Error(data.error || (x.status === 413 ? "That PDF is too big." : `Upload failed (${x.status})`));
      err.status = x.status;
      reject(err);
    };
    x.onerror = () => reject(Object.assign(new Error("Couldn't reach Trainability. Check your connection and try again."), { status: 0 }));
    x.send(file);
  });
}

function Bar({ value, label }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--ghost-fill)" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--cerulean)" }} />
    </div>
  );
}

export function BooksSection({ onSignedOut, onAccepted }) {
  const [data, setData] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(null);
  const input = useRef(null);

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.message);
  }, [onSignedOut]);

  const load = useCallback(() => apiRequest("GET", "/coach-iq/books").then(setData).catch(fail), [fail]);
  useEffect(() => { load(); }, [load]);

  /* While something is being read, look again every few seconds. */
  const reading = data?.books.some(b => ACTIVE.includes(b.status));
  useEffect(() => {
    if (!reading) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [reading, load]);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError(""); setSending(0);
    try {
      const out = await send(file, setSending);
      setData(d => ({ ...d, books: out.books }));
      setFile(null);
      if (input.current) input.current.value = "";
    } catch (err) { fail(err); } finally { setSending(null); }
  };

  const act = async (method, path) => {
    setError("");
    try { await apiRequest(method, path); await load(); } catch (err) { fail(err); }
  };

  if (openId) {
    return <BookView id={openId} onBack={() => { setOpenId(null); load(); }} onSignedOut={onSignedOut} onAccepted={onAccepted} />;
  }
  if (!data) return error ? <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p> : <LoadingLine />;

  return (
    <div className="grid gap-4">
      <section className="cx-card p-4">
        <h2 className="cx-display text-xl">Read a book</h2>
        <p className="text-sm mt-1" style={muted}>
          Upload a book as a PDF. Coach reads it in the background, a part at a time, so you can leave this page. Then it
          shows you, topic by topic, what the book would add to the principles, and asks you about anything it shouldn't
          decide alone. Nothing reaches the principles, or Billy, until you accept it. The PDF is thrown away once read.
        </p>
        {!data.available ? (
          <p className="text-sm mt-3" style={{ color: "var(--ember)" }}>
            Reading a book needs Billy's key on this server (ANTHROPIC_API_KEY). Ask whoever runs the app.
          </p>
        ) : (
          <form className="mt-3 grid gap-2" onSubmit={upload}>
            <input ref={input} type="file" accept="application/pdf,.pdf" aria-label="The book, as a PDF" className="text-sm"
              onChange={e => { setFile(e.target.files?.[0] || null); setError(""); }} />
            {file && <div className="text-xs" style={muted}>{file.name}, {size(file.size)}</div>}
            <div>
              <button type="submit" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2" disabled={!file || sending !== null} aria-busy={sending !== null}>
                {sending !== null ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Uploading…</> : <><Upload size={15} aria-hidden="true" /> Read the book</>}
              </button>
            </div>
            {sending !== null && <Bar value={sending} label="Uploading" />}
            <p className="text-xs" style={muted}>Up to 100 MB. Read with {data.model}; a long book costs a few dollars of Claude's time.</p>
          </form>
        )}
        {error && <p className="text-sm mt-2" role="alert" style={{ color: "var(--ember)" }}>{error}</p>}
      </section>

      {data.books.length === 0 ? <p className="text-sm" style={muted}>No book has been read in the app yet.</p> : (
        <div className="grid gap-4 lg:grid-cols-2 items-start">
          {data.books.map(b => (
            <article key={b.id} className="cx-card p-4" style={b.status === "discarded" ? { opacity: 0.75 } : undefined}>
              <div className="font-semibold">{b.title || b.fileName}</div>
              <div className="text-sm" style={muted}>
                {[b.author, b.edition, b.year].filter(Boolean).join(", ") || `${b.pages} pages`}
              </div>
              <div className="text-sm mt-2">
                <b>{STATUS[b.status] || b.status}</b>
                {b.status !== "done" && b.step && b.step !== STATUS[b.status] ? <span style={muted}> · {b.step}</span> : null}
              </div>
              {ACTIVE.includes(b.status) && b.parts > 0 && <Bar value={b.partsDone / b.parts} label={`Reading ${b.title || b.fileName}`} />}
              {b.status === "failed" && b.error && <p className="text-sm mt-1" style={{ color: "var(--ember)" }}>{b.error}</p>}
              {b.counts.proposals > 0 && (
                <div className="text-sm mt-1">{b.counts.decided} of {b.counts.proposals} topics decided{b.counts.accepted ? `, ${b.counts.accepted} accepted` : ""}</div>
              )}
              <div className="text-xs mt-1" style={muted}>
                {b.pages} pages · uploaded by {b.by || "the Primary Master"} on {fmtDay(b.at)}
                {b.tokensIn ? ` · ${tokens(b.tokensIn)} tokens read, ${tokens(b.tokensOut)} written` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                {(b.status === "ready" || b.status === "done") && (
                  <button type="button" className="cx-btn-row" onClick={() => setOpenId(b.id)}><BookOpen size={15} aria-hidden="true" /> {b.status === "ready" ? "Go through it" : "Look back"}</button>
                )}
                {b.status === "failed" && (
                  <button type="button" className="cx-btn-row" onClick={() => act("POST", `/coach-iq/books/${b.id}/retry`)}><RotateCcw size={15} aria-hidden="true" /> Try again</button>
                )}
                {!["discarded", "done", "reading"].includes(b.status) && (
                  <button type="button" className="text-sm cx-link"
                    onClick={() => window.confirm("Put this book away? Its PDF is thrown away, and nothing more is read or accepted from it.") && act("DELETE", `/coach-iq/books/${b.id}`)}>
                    <Archive size={15} aria-hidden="true" /> Put away
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* One book's proposals. */
function BookView({ id, onBack, onSignedOut, onAccepted }) {
  const [book, setBook] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError({ message: err.message, problems: err.data?.problems });
  }, [onSignedOut]);

  const load = useCallback(() => apiRequest("GET", `/coach-iq/books/${id}`).then(setBook).catch(fail), [id, fail]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!book?.busy) return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [book?.busy, load]);

  const call = async (method, path, body, after) => {
    setBusy(true); setError(null);
    try { setBook(await apiRequest(method, `/coach-iq/books/${id}${path}`, body)); after?.(); return true; }
    catch (err) { fail(err); return false; }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4">
      <button type="button" className="text-sm cx-link justify-self-start" onClick={onBack}><ChevronLeft size={16} aria-hidden="true" /> All books</button>
      {!book ? (error ? <Problems error={error} /> : <LoadingLine />) : (
        <>
          <section className="cx-card p-4">
            <h2 className="cx-display text-2xl">{book.title || book.fileName}</h2>
            <div className="text-sm" style={muted}>{[book.author, book.edition, book.year].filter(Boolean).join(", ")}</div>
            {book.summary && <p className="text-sm mt-2">{book.summary}</p>}
            <div className="text-sm mt-2">{book.counts.decided} of {book.counts.proposals} topics decided</div>
          </section>
          {error && <Problems error={error} />}
          {book.proposals.map(p => (
            <Proposal key={`${p.n}-${p.state}`} p={p} busy={busy}
              onAnswers={(answers) => call("PUT", `/proposals/${p.n}/answers`, { answers })}
              onWrite={async (answers) => (await call("PUT", `/proposals/${p.n}/answers`, { answers })) && call("POST", `/proposals/${p.n}/write`)}
              onText={(body) => call("PUT", `/proposals/${p.n}/text`, body)}
              onAccept={() => call("POST", `/proposals/${p.n}/accept`, undefined, onAccepted)}
              onReject={() => call("POST", `/proposals/${p.n}/reject`)} />
          ))}
        </>
      )}
    </div>
  );
}

/* One proposed topic, from open points to accepted. */
function Proposal({ p, busy, onAnswers, onWrite, onText, onAccept, onReject }) {
  const [answers, setAnswers] = useState(() => p.openPoints.map((q, i) => ({ choice: p.answers?.[i]?.choice ?? (p.answers?.[i]?.words ? null : q.recommended), words: p.answers?.[i]?.words || "" })));
  const [at, setAt] = useState(() => Math.max(0, Math.min(p.openPoints.length - 1, (p.answers || []).length)));
  const [show, setShow] = useState(null);
  const [editing, setEditing] = useState(false);
  const decided = p.state === "accepted" || p.state === "rejected";
  const q = p.openPoints[at];
  const setAnswer = (patch) => setAnswers(list => list.map((a, i) => (i === at ? { ...a, ...patch } : a)));

  return (
    <article className="cx-card p-4" style={p.state === "rejected" ? { opacity: 0.75 } : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className="font-semibold text-lg">{p.title}</h3>
        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)" }}>{p.isNew ? "New topic" : "Changes"}</span>
        {p.state === "accepted" && <span className="text-sm inline-flex items-center gap-1" style={{ color: "var(--cerulean)" }}><Check size={14} aria-hidden="true" /> Accepted</span>}
        {p.state === "rejected" && <span className="text-sm inline-flex items-center gap-1" style={muted}><X size={14} aria-hidden="true" /> Rejected</span>}
      </div>
      <p className="text-sm mt-1" style={muted}>{p.why}</p>
      {p.changes?.length > 0 && <ul className="list-disc pl-5 text-sm mt-2 grid gap-0.5">{p.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>}

      {p.state === "open" && q && (
        <div className="mt-3 pt-3 border-t grid gap-2" style={line}>
          <div className="text-xs" style={muted}>Point {at + 1} of {p.openPoints.length}</div>
          <div className="font-medium">{q.question}</div>
          <p className="text-sm" style={muted}>{q.why}</p>
          <fieldset className="grid gap-1.5">
            <legend className="sr-only">{q.question}</legend>
            {q.options.map((o, i) => (
              <label key={i} className="flex items-start gap-2 text-sm">
                <input type="radio" name={`q-${p.n}-${at}`} className="mt-1" checked={answers[at].choice === i && !answers[at].words}
                  onChange={() => setAnswer({ choice: i, words: "" })} />
                <span>{o}{i === q.recommended && <b> (recommended)</b>}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-xs" style={muted}>Recommended because {q.reason.replace(/^./, c => c.toLowerCase())}</p>
          <textarea className="cx-input text-sm" rows={2} maxLength={1000} value={answers[at].words} aria-label="Or in your own words"
            placeholder="Or in your own words" onChange={e => setAnswer({ words: e.target.value, choice: e.target.value ? null : q.recommended })} />
          <div className="flex flex-wrap items-center gap-2">
            {at > 0 && <button type="button" className="cx-quiet px-3 py-2 text-sm" onClick={() => setAt(at - 1)}><ChevronLeft size={15} aria-hidden="true" /> Back</button>}
            {at < p.openPoints.length - 1 ? (
              <button type="button" className="cx-btn-row" disabled={busy} onClick={async () => { await onAnswers(answers); setAt(at + 1); }}>
                Next point <ChevronRight size={15} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className="cx-btn-row" disabled={busy} onClick={() => onWrite(answers)}>
                <Pencil size={15} aria-hidden="true" /> Write it up
              </button>
            )}
          </div>
          {p.error && <p className="text-sm" style={{ color: "var(--ember)" }}>{p.error}</p>}
        </div>
      )}

      {p.state === "writing" && (
        <p className="mt-3 pt-3 border-t text-sm inline-flex items-center gap-2" style={line}>
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Writing your answers in. This takes a minute or two.
        </p>
      )}

      {p.state === "written" && !editing && (
        <div className="mt-3 pt-3 border-t" style={line}>
          <div className="text-xs mb-2" style={muted}>The text as it would go in. Read it before you accept it.</div>
          <Prose text={p.written} />
          <div className="flex gap-2 mt-3">
            <button type="button" className="cx-btn-row flex-1" disabled={busy} onClick={onAccept}><Check size={16} aria-hidden="true" /> Accept</button>
            <button type="button" className="cx-btn-row flex-1" disabled={busy} onClick={onReject}><X size={16} aria-hidden="true" /> Reject</button>
          </div>
          <button type="button" className="text-sm cx-link mt-2" onClick={() => setEditing(true)}><Pencil size={15} aria-hidden="true" /> Change the text first</button>
        </div>
      )}
      {p.state === "written" && editing && (
        <div className="mt-3 pt-3 border-t" style={line}>
          <PrincipleForm initial={{ title: p.title, covers: p.covers, body: p.written }} busy={busy} error={null} word="Keep these changes"
            onCancel={() => setEditing(false)} onSave={async (body) => { if (await onText(body)) setEditing(false); }} />
        </div>
      )}

      {!decided && p.state !== "written" && p.state !== "writing" && (
        <button type="button" className="text-sm cx-link mt-3" disabled={busy} onClick={onReject}><X size={15} aria-hidden="true" /> Reject the whole topic</button>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {p.state !== "written" && !editing && (
          <button type="button" className="text-sm cx-link" onClick={() => setShow(show === "proposed" ? null : "proposed")}>
            {show === "proposed" ? "Hide" : "Read"} {p.written ? "the text as written up" : "the proposed text"}
          </button>
        )}
        {p.base && (
          <button type="button" className="text-sm cx-link" onClick={() => setShow(show === "base" ? null : "base")}>
            {show === "base" ? "Hide" : "Read"} the topic as it was
          </button>
        )}
      </div>
      {show && <div className="mt-2 p-3 rounded-lg" style={{ background: "var(--ghost-fill)" }}><Prose text={show === "base" ? p.base : (p.written || p.body)} /></div>}
    </article>
  );
}
