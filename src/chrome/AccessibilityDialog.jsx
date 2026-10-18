import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { lookOf, THEME_CHIP, TONE_CHIP, CONTRAST_CHIP, COLOR_CHIP, MOTION_CHIP, TEXT_SIZE_CHIP } from "../lib/look";

/*
 * Accessibility, opened from the account menu: Studio's dialog (its
 * AppearanceChoices, in src/components/Appearance.jsx), with its six rows of
 * choices and their words, in Coach's switch (the Clients page's Active and
 * Archived). Nothing to save: the screen changes as each is tapped. A
 * Trainability trainer's are the same in Studio (Glenn, 18 Oct 2026:
 * "Shared with Studio"); a Coach account's are Coach's.
 *
 * The themes are Coach's own versions of Studio's four (Glenn: "Coach
 * versions of each"): Default is Coach's cerulean, and Blue a deep navy so
 * it is not Default again.
 */

function ChoiceChips({ label, options, value, onPick, children }) {
  return (
    <div role="group" aria-label={label}>
      <div className="text-sm font-semibold mb-1.5">{label}</div>
      <div className="flex rounded-[10px] p-1 gap-1" style={{ background: "var(--ghost-fill)" }}>
        {Object.entries(options).map(([key, text]) => (
          <button key={key} type="button" aria-pressed={value === key} onClick={() => onPick(key)}
            className="cx-chip flex-1 min-w-0 px-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={value === key
              ? { background: "var(--chalk)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" }
              : { color: "var(--iron)" }}>
            {text}
          </button>
        ))}
      </div>
      <div className="text-sm mt-2" style={{ color: "var(--iron)" }}>{children}</div>
    </div>
  );
}

export function AccessibilityDialog({ user, chooseLook, onClose }) {
  const look = lookOf(user);
  const [error, setError] = useState("");
  const pick = (key) => (value) => {
    setError("");
    chooseLook(key, value).catch(err => setError(err.status === undefined || err.status >= 500
      ? "Couldn't reach Trainability, so that wasn't saved. Try again in a minute."
      : err.message || "That wasn't saved. Try again."));
  };
  /* Where they are kept: the same in Studio for a Trainability trainer. */
  const everywhere = user.coachAccount ? "on every device you sign in on" : "in Coach and Studio, on every device you sign in on";
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Accessibility" className="cx-card w-full sm:max-w-lg p-5 grid gap-5 overflow-y-auto"
        style={{ borderRadius: 16, maxHeight: "90dvh" }}>
        <div className="flex items-start gap-3">
          <h2 className="cx-display text-xl flex-1">Accessibility</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        {error && <p role="alert" className="text-sm -mt-2" style={{ color: "var(--ember)" }}>{error}</p>}

        <ChoiceChips label="Appearance" options={THEME_CHIP} value={look.theme} onPick={pick("theme")}>
          {look.theme === "light" || look.theme === "dark"
            ? `${THEME_CHIP[look.theme]} ${everywhere}.`
            : "Light or dark to match this phone or computer, and it changes when the device does."}
        </ChoiceChips>

        <ChoiceChips label="Theme" options={TONE_CHIP} value={look.tone} onPick={pick("tone")}>
          {look.tone === "purple"
            ? `An homage to Trainability: violet and periwinkle. In light and in dark, ${everywhere}.`
            : look.tone === "blue"
            ? `A deep navy, a shade darker and calmer than Coach's usual blue. In light and in dark, ${everywhere}.`
            : look.tone === "orange"
            ? `A San Francisco treat: International Orange, the Golden Gate's own. Errors show in rose, so they aren't mistaken for the orange. In light and in dark, ${everywhere}.`
            : look.tone === "green"
            ? `A sexy Olive: moss and sage. Something done shows in teal, so it stands apart from the green. In light and in dark, ${everywhere}.`
            : "Coach's usual cerulean and sky."}
        </ChoiceChips>

        <ChoiceChips label="Contrast" options={CONTRAST_CHIP} value={look.contrast} onPick={pick("contrast")}>
          {look.contrast === "more"
            ? `Black and white with strong outlines, in light or dark, ${everywhere}.`
            : look.contrast === "standard"
              ? "The usual colors, even on a device set to increase contrast."
              : "High contrast when this phone or computer is set to increase contrast in its accessibility settings."}
        </ChoiceChips>

        <ChoiceChips label="Color" options={COLOR_CHIP} value={look.color} onPick={pick("color")}>
          {look.color === "reduced"
            ? `Greys throughout, with one color${look.tone ? ", your theme's own," : ""} kept for buttons, links and whatever is selected. Photos keep theirs.`
            : "The app's usual colors."}
        </ChoiceChips>

        <ChoiceChips label="Motion" options={MOTION_CHIP} value={look.motion} onPick={pick("motion")}>
          {look.motion === "reduced"
            ? `Nothing slides, sways or drifts: panels open at once, Billy holds still and the background stays put, ${everywhere}.`
            : look.motion === "full"
              ? "All the app's movement, even on a device set to reduce motion."
              : "Less movement when this phone or computer is set to reduce motion in its accessibility settings."}
        </ChoiceChips>

        <ChoiceChips label="Text size" options={TEXT_SIZE_CHIP} value={look.textSize} onPick={pick("textSize")}>
          {look.textSize === "small"
            ? "A step down from the usual, so more fits on the screen."
            : look.textSize === "large"
              ? "Everything grows with the words — buttons and spacing too — so nothing ends up cramped."
              : look.textSize === "xlarge"
                ? "The largest size. Everything grows with the words; on a phone, less fits on the screen at once."
                : "The app's usual size."}
        </ChoiceChips>
      </div>
    </div>,
    document.body,
  );
}
