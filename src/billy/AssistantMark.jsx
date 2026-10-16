import React, { useId, useMemo } from "react";
import normal from "./normal.svg?raw";
import thinking from "./thinking.svg?raw";
import happy from "./happy.svg?raw";
import serious from "./serious.svg?raw";
import waving from "./waving.svg?raw";
import listening from "./listening.svg?raw";
import talking from "./talking.svg?raw";
import sad from "./sad.svg?raw";

/**
 * Billy's face, copied from Studio (src/components/AssistantMark.jsx) with
 * his eight pictures beside it, so he looks the same in both apps.
 *
 * The studio's hexagon as a speech bubble, with a face in it — Glenn's
 * artwork (redrawn 9 Oct 2026: glasses, dark eyes, a lit and shaded bubble).
 * Each mood is one of his pictures, kept as the file he drew
 * (`src/assets/billy/<mood>.svg`) and set into the page as vector, so it is
 * sharp in a 22-pixel button and at four times that in the panel. To change a
 * face, replace its file.
 *
 * **Eight moods, one mark.** Same bubble, same tail, same gradient, so a change
 * reads as Billy's expression changing rather than as a different icon
 * arriving:
 *
 *   - `normal` — breathing, blinking.
 *   - `thinking` — head tilted, eyes up and moving from side to side: an
 *     answer is being worked out.
 *   - `happy` — bouncing, a wide grin and rays. Something he was asked to do
 *     is done.
 *   - `serious` — one eye narrowed under a raised brow, and a question mark.
 *     He has asked something and is waiting on the answer.
 *   - `waving` — hello, with a hand up beside the bubble. For the screen that
 *     introduces him.
 *   - `listening` — leaning toward the sound, which arrives at his side. The
 *     microphone is open.
 *   - `talking` — mouth opening and closing, sound leaving. He is reading
 *     something out.
 *   - `sad` — head low and sighing, the mouth turned down, and a tear. A
 *     client has asked all they can today (Glenn, 29 Sep).
 *
 * A picture arrives as a whole document with a style block of its own, and
 * three things in it would be global the moment it is inlined, so `prepare`
 * rewrites them once when the app loads:
 *
 *   - its **class names** (`.head`, `.eyes`, `.w1`) and **keyframes**
 *     (`blink`, `sway` — two moods have a different `blink` each) are
 *     prefixed with the mood, and the styles of all eight go into the page
 *     once;
 *   - its **ids** (the gradients, the clip, the shadow) are prefixed per mark
 *     drawn, because two marks on one page sharing a gradient's id would have
 *     the second quietly claim the first one's;
 *   - its own "less motion" rule stopped every animation on the page, not
 *     just his. It is dropped; `src/index.css` holds him still (`.cx-billy`)
 *     when the device asks for less motion instead.
 *
 * `still` draws the mood without its style: the pose as drawn, nothing
 * moving. The box is the artwork's own `-14 -16 128 128`, wider than the
 * bubble, so the bounce, the rays, the hand and the question mark have room;
 * `size` is that whole box.
 */
const ART = { normal, thinking, happy, serious, waving, listening, talking, sad };

function prepare(mood, svg) {
  const p = `cx-billy-${mood}-`;
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] || "-14 -16 128 128";
  const style = /<style>([\s\S]*?)<\/style>/.exec(svg)?.[1] || "";
  const body = svg
    .replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")
    .replace(/<style>[\s\S]*?<\/style>/, "");
  const classes = [...new Set([...body.matchAll(/class="([^"]+)"/g)].flatMap(m => m[1].split(/\s+/)))]
    .sort((a, b) => b.length - a.length);
  let css = style
    .replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^{}]*\{[^{}]*\}\s*\}/g, "")
    .replace(/@keyframes\s+([\w-]+)/g, `@keyframes ${p}$1`)
    .replace(/animation:\s*([\w-]+)/g, `animation:${p}$1`);
  for (const c of classes) css = css.replace(new RegExp(`\\.${c}(?![\\w-])`, "g"), `.${p}${c}`);
  return {
    viewBox,
    css,
    moving: body.replace(/class="([^"]+)"/g, (_, names) => `class="${names.split(/\s+/).map(n => p + n).join(" ")}"`),
    held: body.replace(/\sclass="[^"]+"/g, ""),
  };
}

const FACES = Object.fromEntries(Object.entries(ART).map(([mood, svg]) => [mood, prepare(mood, svg)]));

/* The eight moods' movement, in the page once however many marks are drawn. */
if (typeof document !== "undefined" && !document.getElementById("cx-billy-moods")) {
  const sheet = document.createElement("style");
  sheet.id = "cx-billy-moods";
  sheet.textContent = Object.values(FACES).map(f => f.css).join("\n");
  document.head.appendChild(sheet);
}

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function AssistantMark({ size = 28, id = "assistant-mark", title, still = false, mood = "normal" }) {
  const face = FACES[mood] || FACES.normal;
  /* The caller's id says which mark this is; React's makes it this mark alone. */
  const own = `${id}-${useId().replace(/[^\w-]/g, "")}`;
  const markup = useMemo(() => {
    const art = (still ? face.held : face.moving)
      .replace(/\bid="([^"]+)"/g, `id="${own}-$1"`)
      .replace(/url\(#([^)]+)\)/g, `url(#${own}-$1)`);
    return (title ? `<title>${escape(title)}</title>` : "") + art;
  }, [face, still, own, title]);

  return (
    <svg
      className="cx-billy"
      viewBox={face.viewBox}
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      style={{ flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
