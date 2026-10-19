import React, { useEffect, useRef, useState } from "react";
import { ChevronUp, Paperclip, ArrowUp, X, FileText, RotateCcw } from "lucide-react";
import { AssistantMark } from "./AssistantMark";
import { prepareFile } from "../hooks/useBilly";

/**
 * Billy's button, beside the badges in the header, as in Studio. His face is
 * the button; open, it is an arrow folding the panel back up (nothing is
 * thrown away, so not a cross). A dot says an answer is waiting.
 */
export function BillyButton({ billy }) {
  const { open, setOpen, asking, turns } = billy;
  const answered = turns.length > 0 && turns[turns.length - 1].who === "billy";
  return (
    <button type="button" onClick={() => setOpen(o => !o)}
      className={`cx-billy-button${open ? " cx-billy-button-open" : ""}`}
      aria-expanded={open} aria-controls="cx-billy-panel"
      aria-label={open ? "Hide Billy" : "Ask Billy"}
      title={open ? "Hide — the conversation is kept" : asking ? "Billy is looking…" : answered ? "Billy's answer is still here" : "Ask Billy"}>
      {open ? <ChevronUp size={20} aria-hidden="true" /> : <AssistantMark id="billy-button" size={30} mood={asking ? "thinking" : "normal"} />}
      {!open && answered && <span className="cx-billy-dot" />}
    </button>
  );
}

/* His answers are short Markdown: paragraphs, "- " lists and **bold**. Drawn
   as that and no more, from text, never as HTML. */
function Bold({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <React.Fragment key={i}>{part}</React.Fragment>);
}
function Answer({ text }) {
  const blocks = [];
  for (const line of text.split("\n")) {
    const item = /^\s*[-*•]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (item) {
      if (last?.kind === "list") last.items.push(item[1]);
      else blocks.push({ kind: "list", items: [item[1]] });
    } else if (line.trim()) {
      if (last?.kind === "p" && !last.closed) last.lines.push(line);
      else blocks.push({ kind: "p", lines: [line] });
    } else if (last) {
      last.closed = true;
    }
  }
  return blocks.map((b, i) => b.kind === "list"
    ? <ul key={i} className="list-disc pl-5 my-1.5 space-y-0.5">{b.items.map((it, j) => <li key={j}><Bold text={it} /></li>)}</ul>
    : <p key={i} className="my-1.5">{b.lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}<Bold text={l} /></React.Fragment>)}</p>);
}

function FileChip({ file, onRemove }) {
  return (
    <span className="cx-billy-file">
      {file.kind === "photo" && file.preview
        ? <img src={file.preview} alt="" className="w-9 h-9 rounded-md object-cover flex-none" />
        : <FileText size={20} className="flex-none" style={{ color: "var(--accent)" }} aria-hidden="true" />}
      <span className="truncate min-w-0">{file.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="flex-none p-1 rounded hover:bg-[var(--ghost-fill)]">
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

/**
 * The panel hanging from the header: the conversation, and a box to ask in
 * with a paperclip for a photo or a PDF. Folding it away keeps the
 * conversation; New conversation clears it.
 */
export function BillyPanel({ billy }) {
  const { open, setOpen, turns, asking, error, ask, reset } = billy;
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const pick = useRef(null);
  const box = useRef(null);
  const end = useRef(null);

  useEffect(() => { if (open) box.current?.focus(); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns, asking, open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const choose = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileError("");
    setReading(true);
    try { setFile(await prepareFile(f)); } catch (err) { setFileError(err.message); } finally { setReading(false); }
  };

  const send = async (e) => {
    e?.preventDefault();
    if (asking || reading || (!text.trim() && !file)) return;
    /* Cleared only once he has answered, so a question that did not get
       through is still there to send again. */
    if (await ask(text, file)) { setText(""); setFile(null); }
  };

  if (!open) return null;
  const mood = asking ? "thinking" : turns.length ? "normal" : "waving";
  return (
    <div id="cx-billy-panel" className="cx-billy-panel" role="dialog" aria-label="Billy">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <AssistantMark id="billy-panel" size={44} mood={mood} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Billy</div>
          <div className="text-xs" style={{ color: "var(--iron)" }}>{asking ? "Looking…" : "Ask about your clients, or send a photo or a PDF."}</div>
        </div>
        {turns.length > 0 && (
          <button type="button" onClick={() => { reset(); setText(""); setFile(null); setFileError(""); box.current?.focus(); }}
            className="cx-billy-icon" title="New conversation" aria-label="New conversation" disabled={asking}>
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="cx-billy-thread" aria-live="polite">
        {turns.length === 0 && !asking && (
          <p className="text-sm px-1 py-2" style={{ color: "var(--iron)" }}>
            I can tell you about the clients on your list, and read what you send me — a food log, a form, a program. I don&apos;t change your clients or their programs: you do that on their pages.
          </p>
        )}
        {turns.map((t, i) => t.who === "you" ? (
          <div key={i} className="flex flex-col items-end gap-1.5 my-2">
            {t.file && <FileChip file={t.file} />}
            <div className="cx-billy-you">{t.text}</div>
          </div>
        ) : (
          <div key={i} className="cx-billy-says text-sm my-2"><Answer text={t.text} /></div>
        ))}
        {asking && <p className="text-sm my-2" style={{ color: "var(--iron)" }}>Billy is looking…</p>}
        <div ref={end} />
      </div>

      <form onSubmit={send} className="px-3 pb-3 pt-2 border-t" style={{ borderColor: "var(--iron-line)" }}>
        {(error || fileError) && <p className="text-sm mb-2" style={{ color: "var(--ember)" }}>{error || fileError}</p>}
        {(file || reading) && (
          <div className="mb-2">
            {reading ? <span className="text-sm" style={{ color: "var(--iron)" }}>Getting it ready…</span>
              : <FileChip file={file} onRemove={() => setFile(null)} />}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={pick} type="file" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf" className="hidden" onChange={choose} />
          <button type="button" onClick={() => pick.current?.click()} className="cx-billy-icon" title="Add a photo or a PDF"
            aria-label="Add a photo or a PDF" disabled={asking || reading}>
            <Paperclip size={20} aria-hidden="true" />
          </button>
          <textarea ref={box} rows={1} value={text} onChange={e => setText(e.target.value)} maxLength={4000}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) send(e); }}
            placeholder={file ? "What should Billy look for?" : "Ask Billy…"}
            className="cx-input flex-1 resize-none" style={{ maxHeight: "8rem" }} />
          <button type="submit" className="cx-btn-primary w-10 h-10 flex-none flex items-center justify-center"
            disabled={asking || reading || (!text.trim() && !file)} aria-label="Send">
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}
