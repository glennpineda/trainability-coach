import React, { useLayoutEffect, useRef, useState } from "react";

/**
 * A row of tabs with one chip under the picked one, sliding to whichever is
 * tapped: Studio's SegRow (its src/components/TabbedCard.jsx), copied for
 * Coach (Run 1, D-3; Glenn, 19 Oct 2026: "Copy Studio's SegRow"), in Coach's
 * colours. Two looks, by what the tabs do, as Studio's:
 *
 *   - `pick` (Studio's lilac): the tabs switch between different things (a
 *     client's record, Today · 7 days, Review's sections). A pale cerulean
 *     track, the picked one filled with the main button's gradient.
 *   - the default (Studio's pills): the tabs filter one list (Active ·
 *     Archived, Active · Put away). A grey track, the picked one on a white
 *     chip.
 *
 * The chip is placed from the picked button's box and placed again whenever
 * the row changes size; it can be dragged from the picked tab and let go on
 * another. As tabs, the row is one stop for the keyboard, on the picked tab:
 * Left and Right move and pick (wrapping), Home and End go to the ends (the
 * WAI-ARIA tabs pattern). `items`: `{ key, label, short?, figure? }`, `short`
 * shown when the tab is too narrow for `label` (a container query, index.css).
 * `idOf(key)` names each tab, and `panelId` the panel they show.
 */
export function SegRow({ items, value, onPick, label, pick = false, fit = false, className = "", panelId = null, idOf = null }) {
  const track = useRef(null);
  const [box, setBox] = useState(null);
  const [drag, setDrag] = useState(null);
  const press = useRef(null);
  const dragged = useRef(false);
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const place = () => {
      const on = el.querySelector(`[data-seg="${CSS.escape(String(value))}"]`);
      setBox(on ? { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight } : null);
    };
    place();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(el);
    for (const b of el.children) ro?.observe(b);
    return () => ro?.disconnect();
  }, [value, items.length]);

  const nearest = (x) => {
    let best = null, gap = Infinity;
    for (const b of track.current?.querySelectorAll("[data-seg]") || []) {
      const d = Math.abs(b.offsetLeft + b.offsetWidth / 2 - x);
      if (d < gap) { gap = d; best = b; }
    }
    return best;
  };
  /* Dragging the chip, only from the picked tab; up and down is left to the page. */
  const onPointerDown = (e) => {
    dragged.current = false;
    if (!box || e.button > 0) return;
    const on = e.target.closest?.("[data-seg]");
    if (!on || on.dataset.seg !== String(value)) return;
    press.current = { id: e.pointerId, x0: e.clientX, left: box.x, moving: false };
  };
  const onPointerMove = (e) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId || !box) return;
    const dx = e.clientX - p.x0;
    if (!p.moving) {
      if (Math.abs(dx) < 6) return;
      p.moving = true;
      track.current?.setPointerCapture?.(e.pointerId);
    }
    const max = (track.current?.clientWidth || 0) - box.w - 3;
    const x = Math.min(Math.max(p.left + dx, 3), Math.max(3, max));
    p.near = nearest(x + box.w / 2)?.dataset.seg ?? String(value);
    setDrag({ x, near: p.near });
  };
  const onPointerUp = (e) => {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || !p.moving) return;
    dragged.current = true;
    const near = p.near;
    setDrag(null);
    const hit = items.find(i => String(i.key) === near);
    if (hit && hit.key !== value) onPick(hit.key);
  };
  const onPointerCancel = () => { press.current = null; setDrag(null); };
  const onKeyDown = (e) => {
    const at = items.findIndex(i => i.key === value);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: items.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = items[(to + items.length) % items.length];
    track.current?.querySelector(`[data-seg="${CSS.escape(String(next.key))}"]`)?.focus();
    if (next.key !== value) onPick(next.key);
  };
  const shownOn = drag ? drag.near : String(value);
  return (
    <div ref={track} role="tablist" aria-label={label}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onClickCapture={(e) => { if (dragged.current) { dragged.current = false; e.stopPropagation(); e.preventDefault(); } }}
      className={`cx-seg${pick ? " cx-seg-pick" : ""}${fit ? " cx-seg-fit" : ""}${drag ? " cx-seg-dragging" : ""}${className ? ` ${className}` : ""}`}>
      {box && <span aria-hidden="true" className="cx-seg-thumb" style={{ width: box.w, height: box.h, transform: `translate(${drag ? drag.x : box.x}px, ${box.y}px)` }} />}
      {items.map(p => {
        const on = String(p.key) === shownOn;
        const name = p.short ? <><span className="cx-seg-long">{p.label}</span><span className="cx-seg-short">{p.short}</span></> : p.label;
        return (
          <button key={p.key} data-seg={p.key} type="button" role="tab" aria-selected={p.key === value} tabIndex={p.key === value ? 0 : -1}
            {...(idOf ? { id: idOf(p.key) } : {})} {...(panelId ? { "aria-controls": panelId } : {})}
            onClick={() => onPick(p.key)} onKeyDown={onKeyDown}
            className={`cx-seg-btn text-sm${on ? " cx-seg-on" : ""}`} style={p.short ? { containerType: "inline-size" } : undefined}>
            <span className="block truncate">
              {name}
              {p.figure != null && <span className="ml-1 text-xs tabular-nums" style={{ fontWeight: 400 }}>({p.figure})</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
