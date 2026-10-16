import React, { useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

/* How far the lit circle reaches past its tab: into the bar's padding above
   and below, as in Studio. */
const LIT_Y = 1;

/**
 * The tab bar, Studio's: floating over the bottom of the screen as a frosted
 * pill, icons only, with the page scrolling on under it. The tab you are on
 * sits in a filled circle that slides to the next one tapped. Each tab keeps
 * its name for a screen reader and as the browser's tooltip; the names are on
 * each screen's heading.
 *
 * Profile is the last tab and wears your photo or initials, as in Studio.
 */
export function BottomNav({ tabs, activeTab, onChange, user }) {
  const barRef = useRef(null);
  const [lit, setLit] = useState(null);

  /* The circle is drawn from the lit tab's own box, and redrawn when the bar
     changes size (a phone turned, a window resized). */
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    const measure = () => {
      const btn = bar.querySelector(`[data-tab="${activeTab}"]`);
      if (!btn) return setLit(null);
      const h = btn.offsetHeight + 2 * LIT_Y;
      const w = Math.min(btn.offsetWidth, h);
      setLit({ x: btn.offsetLeft + (btn.offsetWidth - w) / 2, y: btn.offsetTop - LIT_Y, w, h });
    };
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(bar);
    return () => ro?.disconnect();
  }, [activeTab]);

  return (
    <nav className="cx-navslot" aria-label="Coach">
      <div ref={barRef} className="cx-navwrap">
        {lit && (
          <span aria-hidden="true" className="cx-nav-lit"
            style={{ width: lit.w, height: lit.h, transform: `translate(${lit.x}px, ${lit.y}px)` }} />
        )}
        {tabs.map(({ id, label, icon: Icon }) => {
          const on = id === activeTab;
          return (
            <button key={id} type="button" data-tab={id} onClick={() => onChange(id)}
              aria-label={label} title={label} aria-current={on ? "page" : undefined}
              className={`cx-navbtn${on ? " cx-navbtn-on" : ""}`}>
              {id === "profile"
                ? <Avatar user={user} size={30} ring={on ? "#fff" : undefined} />
                : <Icon size={24} strokeWidth={2} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
