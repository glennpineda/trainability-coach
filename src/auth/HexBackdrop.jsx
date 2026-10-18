import React from "react";

/* The badge's rounded hexagon (brand/badge/coach-badge-light.svg), drawn at
   the origin so it can be placed and scaled anywhere. */
const HEX = "M 21 -76 L 55.6 -56 Q 76.4 -44 76.4 -20 L 76.4 20 Q 76.4 44 55.6 56 L 21 76 Q 0 88 -21 76 L -55.6 56 Q -76.4 44 -76.4 20 L -76.4 -20 Q -76.4 -44 -55.6 -56 L -21 -76 Q 0 -88 21 -76 Z";

const DRIFT = `
  @keyframes cx-drift { from { transform: translateX(-10px); } to { transform: translateX(10px); } }
  .cx-drift { animation: cx-drift ease-in-out infinite alternate; transform-box: fill-box; }
  .cx-drift-a { animation-duration: 23s; animation-delay: -7s; }
  .cx-drift-b { animation-duration: 31s; animation-delay: -19s; animation-direction: alternate-reverse; }
  .cx-drift-c { animation-duration: 17s; animation-delay: -4s; }
  :root[data-still] .cx-drift { animation: none; }
`;

/**
 * The cerulean field the sign-in screen sits on: Studio's hexagon backdrop,
 * in Coach's colors. Three of the logo's hexagons blown up and cropped by the
 * edges, two filled and one outlined, drifting slowly out of step. Still
 * where motion is reduced (data-still: Accessibility's Motion, or the
 * device's).
 */
export function HexBackdrop() {
  return (
    <svg className="cx-hexbackdrop absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <style>{DRIFT}</style>
      <defs>
        <radialGradient id="cx-glow-a" cx="0.2" cy="0.15" r="0.6">
          <stop offset="0" stopColor="var(--sky)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--sky)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cx-glow-b" cx="0.85" cy="0.9" r="0.55">
          <stop offset="0" stopColor="var(--cerulean)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--cerulean)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cx-fill-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--sky)" stopOpacity="0.30" />
          <stop offset="1" stopColor="var(--cerulean)" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="cx-fill-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.10" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect width="1000" height="1000" fill="url(#cx-glow-a)" />
      <rect width="1000" height="1000" fill="url(#cx-glow-b)" />
      <g transform="translate(110 210) scale(3.6)"><path className="cx-drift cx-drift-a" d={HEX} fill="url(#cx-fill-a)" /></g>
      <g transform="translate(930 760) scale(4.4)"><path className="cx-drift cx-drift-b" d={HEX} fill="url(#cx-fill-b)" /></g>
      <g transform="translate(860 120) scale(1.9)"><path className="cx-drift cx-drift-c" d={HEX} fill="none" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></g>
    </svg>
  );
}
