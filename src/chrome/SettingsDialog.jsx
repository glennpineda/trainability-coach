import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMySettings } from "../hooks/useUnits";

/*
 * The trainer's own settings (Glenn, 19 Oct 2026: "For units and
 * measurement weeks, create a new settings item on the profile menu
 * containing those two"): their units, and how many weeks apart their
 * clients' measurements are due. Laid out as Accessibility is
 * (AccessibilityDialog.jsx): each a heading, a segmented row or a choice,
 * and a line saying what it does. Each trainer's own, kept in Coach.
 */

const UNITS = [["imperial", "Imperial", "lb, in, ft"], ["metric", "Metric", "kg, cm, m"]];
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function SettingsDialog({ onClose }) {
  const [s, change] = useMySettings();
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-label="Settings" className="cx-card w-full sm:max-w-lg p-5 grid gap-5 overflow-y-auto" style={{ borderRadius: 16, maxHeight: "90dvh" }}>
        <div className="flex items-start gap-3">
          <h2 className="cx-display text-xl flex-1">Settings</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close"><X size={18} aria-hidden="true" /></button>
        </div>

        <div role="group" aria-label="Units">
          <div className="text-sm font-semibold mb-1.5">Units</div>
          <div className="flex rounded-[10px] p-1 gap-1" style={{ background: "var(--ghost-fill)" }}>
            {UNITS.map(([key, word, hint]) => (
              <button key={key} type="button" aria-pressed={s.units === key} onClick={() => change({ units: key })}
                className="cx-chip flex-1 min-w-0 px-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={s.units === key ? { background: "var(--chalk)", color: "var(--ink)", boxShadow: "0 1px 2px rgba(23,42,58,0.15)" } : { color: "var(--iron)" }}>
                {word} <span className="text-xs font-normal" style={{ opacity: 0.8 }}>{hint}</span>
              </button>
            ))}
          </div>
          <div className="text-sm mt-2" style={{ color: "var(--iron)" }}>
            How weights, measurements and distances are shown to you, in Coach IQ and by Billy. Loads are rounded to what a gym has: 5 lb or 2.5 kg.
          </div>
        </div>

        <div role="group" aria-label="Measurements every">
          <label className="text-sm font-semibold mb-1.5 block" htmlFor="measure-every">Measurements every</label>
          <select id="measure-every" className="cx-input text-sm" style={{ color: "var(--ink)" }}
            value={s.measureEvery} onChange={e => change({ measureEvery: Number(e.target.value) })}>
            {WEEKS.map(n => <option key={n} value={n}>{n === 1 ? "1 week" : `${n} weeks`}</option>)}
            <option value={0}>Off</option>
          </select>
          <div className="text-sm mt-2" style={{ color: "var(--iron)" }}>
            {s.measureEvery
              ? `When a client's last measurements are ${s.measureEvery === 1 ? "a week" : `${s.measureEvery} weeks`} old, or they have none, the Clients list says Measurements due.`
              : "The Clients list never says Measurements due."}
          </div>
        </div>

        <p className="text-xs" style={{ color: "var(--iron)" }}>These are yours; other trainers keep their own.</p>
      </div>
    </div>,
    document.body,
  );
}
