import React, { useEffect, useRef } from "react";
import { roundedPath } from "../lib/hexagon";
import { reducedMotionNow, watchReducedMotion } from "../lib/motion";

/**
 * The drifting backdrop: the logo's hexagon, many times over, in Coach's
 * blues (Glenn, 18 Oct 2026: "Can you replicate the floating [hexes] on the
 * background of Studio in Coach? But it different blue hues"). Studio's own
 * (its src/chrome/DriftingHexes.jsx), copied as it is: the same count, sizes,
 * speeds, strengths and frame rate, with four blues (--hex-1 … --hex-4 in
 * index.css) where it has its purples, and Coach's header and tab bar
 * (.cx-headbar, .cx-navwrap) where it has its .iw-navbar. Studio's notes:
 *
 * Glenn, 2026-09-25: different purple tones, different sizes, overlapping,
 * moving slowly at a random speed and angle — behind the whole of Today, and
 * behind the header and the tab bar on every other tab, whose own middles keep
 * the still grey field (HexField). One field for all of it, mounted once, so a
 * tab switch does not start the shapes over: `barsOnly` only changes where it
 * is drawn. The bars are found by their class and measured every frame, which
 * follows them wherever the layout puts them — the tab bar stands up beside
 * the screen on a phone held sideways.
 *
 * Quiet on purpose. Each shape is laid down at a few percent, so where two
 * overlap they only deepen a little, and text over any of it reads as it does
 * on the plain ground. Slow enough — a few pixels a second, a turn every few
 * minutes — that nothing on the screen appears to move while it is being read.
 *
 * Canvas rather than SVG: a dozen shapes redrawn every frame is one paint on a
 * canvas and a dozen style recalculations in the DOM. It sits where HexField
 * does, behind everything in the shell, and takes no pointer events.
 *
 * Still where motion is turned down (the Motion setting, or the device when it
 * is left to decide), and absent where contrast is turned up: a backdrop is
 * exactly what that reader asked to have taken away.
 */

/* The tokens drawn with, read from the page so each palette brings its own. */
const TONES = ["--hex-1", "--hex-2", "--hex-3", "--hex-4"];

const COUNT = 12;
/* Radius as a share of the frame's shorter side, so a phone and a desktop both
   get a few large shapes and more small ones. */
const SIZE_MIN = 0.08, SIZE_MAX = 0.42;
/* Pixels a second. Under the lower bound a shape looks stopped; over the upper
   it starts to draw the eye away from what is written on top. */
const SPEED_MIN = 3, SPEED_MAX = 12;
/* Radians a second, either way. */
const TURN_MAX = 0.02;
const ALPHA_MIN = 0.05, ALPHA_MAX = 0.12;
/* Behind the body of the screen, a share of that: the header and the tab bar
   have little to read on them and carry the field at full strength, the list
   under it less (Glenn, 25 Sep). Half by default — the client's page — and
   the staff app asks for more with `bodyShare` (Glenn, the same day). */
const BODY_SHARE = 0.5;

/* Under a driven browser (the manual's camera) the field is laid out from a
   fixed seed and held still, so the pictures come out the same every run and
   only change when the screen does (Run 12). */
const posed = () => typeof navigator !== "undefined" && !!navigator.webdriver;
let seedState = 0x2f6b1d;
const seeded = () => {
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 2 ** 32;
};
const rand = (a, b) => a + (posed() ? seeded() : Math.random()) * (b - a);

/** A hexagon of radius r around the origin, its corners softened as the mark's are. */
function hexPath(r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return new Path2D(roundedPath(pts, r * 0.1));
}

const moreContrast = () => {
  const pick = document.documentElement.dataset.contrast;
  if (pick === "more") return true;
  if (pick === "standard") return false;
  return !!window.matchMedia?.("(prefers-contrast: more)").matches;
};

export function DriftingHexes({ barsOnly = false, bodyShare = BODY_SHARE }) {
  const ref = useRef(null);
  const bars = useRef(barsOnly);
  bars.current = barsOnly;
  const share = useRef(bodyShare);
  share.current = bodyShare;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, frame = 0, last = 0, tones = [];
    let hexes = [];

    const readTones = () => {
      const css = getComputedStyle(canvas);
      tones = TONES.map(t => css.getPropertyValue(t).trim()).filter(Boolean);
      /* No palette (the tokens missing): the four blues as index.css sets them. */
      if (!tones.length) {
        tones = window.matchMedia?.("(prefers-color-scheme: dark)").matches
          ? ["#4FA8DC", "#7EC3EA", "#2E8BC0", "#6E9EE0"] : ["#007BA7", "#4FA8DC", "#0B5C8A", "#3D7BC4"];
      }
    };

    const seed = () => {
      /* Carried on from the field before (below, on unmount): the sign-in
         screen's, handed to the app's once signed in, so the shapes do not
         jump when one screen gives way to the next. Taken, so two fields
         never move the same shapes. */
      const boot = typeof window !== "undefined" && window.__cxHexes;
      if (boot?.length && !posed()) {
        window.__cxHexes = null;
        hexes = boot.map(x => ({ ...x, path: hexPath(x.r), tone: x.tone % Math.max(1, TONES.length) }));
        return;
      }
      const side = Math.min(w, h) || 400;
      seedState = 0x2f6b1d;
      hexes = Array.from({ length: COUNT }, (_, i) => {
        const r = side * rand(SIZE_MIN, SIZE_MAX);
        const angle = rand(0, Math.PI * 2), speed = rand(SPEED_MIN, SPEED_MAX);
        return {
          r, path: hexPath(r),
          x: rand(-r * 0.5, w + r * 0.5), y: rand(-r * 0.5, h + r * 0.5),
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          turn: rand(-TURN_MAX, TURN_MAX), spin: rand(0, Math.PI / 3),
          tone: i % Math.max(1, TONES.length), alpha: rand(ALPHA_MIN, ALPHA_MAX),
        };
      });
    };

    /* The header and the tab bar, where they are now, in the canvas's own
       coordinates. Measured every frame, so they follow the layout. */
    const barRects = () => {
      const at = canvas.getBoundingClientRect();
      return [...document.querySelectorAll(".cx-headbar, .cx-navwrap")]
        .map(el => el.getBoundingClientRect())
        .filter(r => r.width && r.height)
        .map(r => [r.left - at.left, r.top - at.top, r.width, r.height]);
    };

    const paint = (share) => {
      for (const x of hexes) {
        ctx.save();
        ctx.translate(x.x, x.y);
        ctx.rotate(x.spin);
        ctx.globalAlpha = x.alpha * share;
        ctx.fillStyle = tones[x.tone % tones.length];
        ctx.fill(x.path);
        ctx.restore();
      }
    };

    /* The body at its share (not at all where only the bars carry it), then
       the bars cleared and painted again at full strength. */
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      if (moreContrast()) return;
      if (!bars.current) paint(share.current);
      const rects = barRects();
      if (!rects.length) return;
      ctx.save();
      const clip = new Path2D();
      for (const r of rects) clip.rect(...r);
      ctx.clip(clip);
      for (const r of rects) ctx.clearRect(...r);
      paint(1);
      ctx.restore();
    };

    /* Off one edge and back in at the opposite one, fully out of sight both
       times, so a shape never visibly pops. */
    const step = (dt) => {
      for (const x of hexes) {
        x.x += x.vx * dt; x.y += x.vy * dt; x.spin += x.turn * dt;
        const m = x.r * 1.1;
        if (x.x < -m) x.x = w + m; else if (x.x > w + m) x.x = -m;
        if (x.y < -m) x.y = h + m; else if (x.y > h + m) x.y = -m;
      }
    };

    /* Twenty frames a second, not sixty (Run 19's speed audit, P3): at 3–12px
       a second a step of a twentieth is under a pixel, which nobody sees,
       and each frame also had the GPU blur again everything frosted over
       the field. A timer between frames, so the page isn't woken every
       vsync for nothing. */
    let wait = 0;
    const tick = (now) => {
      /* Capped, so coming back to a tab left in the background does not jump
         every shape by however long it was away. */
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      step(dt);
      draw();
      wait = setTimeout(() => { frame = requestAnimationFrame(tick); }, 45);
    };

    const start = () => {
      clearTimeout(wait);
      cancelAnimationFrame(frame);
      last = 0;
      if (reducedMotionNow() || posed()) draw();
      else frame = requestAnimationFrame(tick);
    };

    const size = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const first = !w;
      w = box.width; h = box.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first || !hexes.length) seed();
      draw();
    };

    readTones();
    size();
    start();

    const resized = new ResizeObserver(size);
    resized.observe(canvas);
    /* The palette can change while the app is open — Accessibility (light or
       dark, or the theme's colour), or the device going dark at sunset — and
       the colours come from it. */
    const themed = new MutationObserver(() => { readTones(); draw(); });
    themed.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-tone", "data-color", "data-contrast"] });
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)");
    const retone = () => { readTones(); draw(); };
    dark?.addEventListener("change", retone);
    const unwatch = watchReducedMotion(start);
    canvas.addEventListener("cx-redraw", draw);

    return () => {
      /* Handed on to whichever field mounts next — the loading hive gives way
         to the app — so the shapes carry on rather than starting over. */
      if (typeof window !== "undefined" && !posed()) window.__cxHexes = hexes;
      clearTimeout(wait);
      cancelAnimationFrame(frame);
      resized.disconnect();
      themed.disconnect();
      dark?.removeEventListener("change", retone);
      unwatch();
      canvas.removeEventListener("cx-redraw", draw);
    };
  }, []);

  /* Held still, nothing redraws on its own, so a tab switch asks for one. */
  useEffect(() => { ref.current?.dispatchEvent(new Event("cx-redraw")); }, [barsOnly]);

  /* Placed by its own style, as Studio's is. */
  return <canvas ref={ref} aria-hidden="true" className="cx-drifthex"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}
