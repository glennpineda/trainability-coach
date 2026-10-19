import React from "react";
import { convertText } from "../lib/units";
import { useUnits } from "../hooks/useUnits";
import { fmtDay } from "../lib/date";

/**
 * Coach IQ's principles drawn from their Markdown, as the files have it:
 * headings, paragraphs, "- " and "1. " lists (one level, with wrapped lines),
 * tables, **bold**, _italic_ and links. Made into elements, never HTML, so
 * nothing in the text can become part of the page. A link to another topic
 * ("rest.md") calls onTopic with its key; any other link is shown as words.
 * Weights and distances are shown in the reader's own units (src/lib/
 * units.js); the text itself, as edited, keeps what was written.
 */

const muted = { color: "var(--iron)" };

/* Bold, italic and links inside one line. */
function inline(text, onTopic, key = "") {
  const out = [];
  const re = /\*\*(.+?)\*\*|(?<![A-Za-z0-9])_(.+?)_(?![A-Za-z0-9])|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0, m, n = 0;
  while ((m = re.exec(text))) {
    if (m.index > at) out.push(text.slice(at, m.index));
    const k = `${key}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], onTopic, k)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], onTopic, k)}</em>);
    else {
      const topic = /^([a-z0-9-]+)\.md$/.exec(m[4])?.[1];
      out.push(topic && onTopic
        ? <button key={k} type="button" className="cx-link" onClick={() => onTopic(topic)}>{m[3]}</button>
        : <span key={k}>{m[3]}</span>);
    }
    at = re.lastIndex;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

const cells = (row) => row.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());

/** Markdown into blocks: [{ type, … }]. */
export function blocks(text) {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,4}) (.+)$/.exec(line);
    if (h) { out.push({ type: "h", level: h[1].length, text: h[2] }); i++; continue; }
    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const body = rows.filter((_, j) => j !== 1 || !/^\|[\s:|-]+\|$/.test(rows[1]));
      out.push({ type: "table", head: cells(body[0]), rows: body.slice(1).map(cells) });
      continue;
    }
    const item = /^(\s*)(-|\d+\.) (.*)$/.exec(line);
    if (item) {
      const ordered = item[2] !== "-";
      const items = [];
      while (i < lines.length) {
        const it = /^(\s*)(-|\d+\.) (.*)$/.exec(lines[i]);
        if (it && (it[2] !== "-") === ordered) { items.push(it[3]); i++; }
        else if (lines[i].trim() && /^\s+/.test(lines[i]) && items.length) { items[items.length - 1] += " " + lines[i].trim(); i++; }
        else break;
      }
      out.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4} |\||\s*(-|\d+\.) )/.test(lines[i])) para.push(lines[i++].trim());
    out.push({ type: "p", text: para.join(" ") });
  }
  return out;
}

export function Prose({ text, onTopic }) {
  const [units] = useUnits();
  return (
    <div className="grid gap-2 text-sm leading-relaxed min-w-0">
      {blocks(convertText(text, units)).map((b, i) => {
        const k = `b${i}`;
        if (b.type === "h") {
          return b.level <= 2
            ? <h3 key={k} className="font-semibold text-base mt-2">{inline(b.text, onTopic, k)}</h3>
            : <h4 key={k} className="font-semibold mt-1">{inline(b.text, onTopic, k)}</h4>;
        }
        if (b.type === "ul" || b.type === "ol") {
          const List = b.type;
          return <List key={k} className={`${b.type === "ul" ? "list-disc" : "list-decimal"} pl-5 grid gap-1`}>{b.items.map((t, j) => <li key={j}>{inline(t, onTopic, `${k}-${j}`)}</li>)}</List>;
        }
        if (b.type === "table") {
          return (
            <div key={k} className="overflow-x-auto">
              <table className="text-sm border-collapse">
                <thead><tr>{b.head.map((c, j) => <th key={j} className="text-left font-semibold pr-4 pb-1 border-b" style={{ borderColor: "var(--iron-line)" }}>{inline(c, onTopic, `${k}-h${j}`)}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, n) => <td key={n} className="pr-4 py-1 align-top border-b" style={{ borderColor: "var(--iron-line)" }}>{inline(c, onTopic, `${k}-${j}-${n}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={k}>{inline(b.text, onTopic, k)}</p>;
      })}
    </div>
  );
}

/** Where a principle stands, in a line: reviewed when, and from which books. */
export function Standing({ p }) {
  return (
    <div className="text-xs" style={muted}>
      {p.status === "reviewed" ? `Reviewed ${fmtDay(`${p.reviewed}T12:00:00`)}` : "Draft: Billy doesn't use it yet"}
      {p.sources?.length ? ` · From ${p.sources.join("; ")}` : ""}
    </div>
  );
}
