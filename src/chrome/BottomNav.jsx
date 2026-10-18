import React, { useLayoutEffect, useRef, useState } from "react";

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
 * No Profile tab, unlike Studio: who you are and Log out live in the account
 * menu in the header's corner (Glenn, 16 Oct 2026).
 */
export function BottomNav({ tabs, activeTab, onChange }) {
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
        {tabs.map(({ id, label, icon: Icon, count = 0, countWord = "new" }) => {
          const on = id === activeTab;
          return (
            <button key={id} type="button" data-tab={id} onClick={() => onChange(id)}
              aria-label={count ? `${label}, ${count} ${countWord}` : label} title={label} aria-current={on ? "page" : undefined}
              className={`cx-navbtn${on ? " cx-navbtn-on" : ""}`}>
              <Icon size={24} strokeWidth={2} aria-hidden="true" />
              {/* How many are waiting, on the corner of the tab, as Studio's
                  bar shows them, with a ring of the bar's ground. */}
              {count > 0 && (
                <span aria-hidden="true" className="absolute flex items-center justify-center font-semibold"
                  style={{ top: 2, right: "18%", minWidth: 16, height: 16, padding: "0 4px", borderRadius: 999,
                           fontSize: 10, lineHeight: 1, background: "var(--fill-ember)", color: "#fff", boxShadow: "0 0 0 2px var(--chalk)" }}>
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
