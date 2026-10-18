import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/* What Studio offers for a client's gender and pronouns (its lib/people.js),
   in its order; anything else can still be typed. Gender keeps Studio's
   "Other" last, for the CRM's answer of that name. */
export const GENDER_SUGGESTIONS = [
  "Woman", "Man", "Non-binary", "Trans woman", "Trans man", "Transgender",
  "Transmasculine", "Transfeminine", "Genderqueer", "Genderfluid", "Agender",
  "Bigender", "Demigirl", "Demiboy", "Other",
];
export const GENDER_MAX = 40;
export const PRONOUN_SUGGESTIONS = [
  "he/him", "she/her", "they/them", "she/they", "he/they",
  "ze/zir", "xe/xem", "ey/em", "any/all",
];
export const PRONOUNS_MAX = 30;
export const lowercase = (v) => v.toLowerCase();

/**
 * A box to type in with a list of common choices behind its arrow, Studio's
 * SuggestInput (components/primitives.jsx): the arrow, or the down key,
 * opens the list; a choice fills the box and closes it; Escape or a press
 * elsewhere closes it. `transform` is applied to what is typed and picked
 * (pronouns are kept lowercase, as Studio keeps them).
 */
export function SuggestInput({ id, value, onChange, suggestions, placeholder = "Type or pick", maxLength, transform = (v) => v }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  const pick = (s) => { onChange(transform(s)); setOpen(false); };
  return (
    <div className="relative" ref={ref}>
      <div className="cx-input flex items-center" style={{ padding: 0 }}>
        <input id={id} value={value} maxLength={maxLength} autoCapitalize="none" autoComplete="off" placeholder={placeholder}
          role="combobox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="none"
          onChange={e => onChange(transform(e.target.value))}
          onKeyDown={e => {
            if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); }
            if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
          }}
          className="flex-1 min-w-0 bg-transparent outline-none" style={{ padding: "0.6rem 0.75rem", color: "var(--ink)" }} />
        <button type="button" onClick={() => setOpen(o => !o)} aria-label="Show common choices" aria-expanded={open}
          className="px-2.5 self-stretch flex items-center">
          <ChevronDown size={16} style={{ color: "var(--iron)" }} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={listId} role="listbox" className="cx-card absolute left-0 right-0 mt-1 overflow-y-auto"
          style={{ zIndex: 30, maxHeight: "14rem", borderRadius: 12 }}>
          {suggestions.map(s => {
            const on = transform(s) === value;
            return (
              <button key={s} type="button" role="option" aria-selected={on} onClick={() => pick(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm border-b last:border-b-0"
                style={{ borderColor: "var(--iron-line)", color: "var(--ink)", ...(on ? { background: "var(--accent-soft)" } : {}) }}>
                <span className="flex-1 truncate">{s}</span>
                {on && <Check size={14} style={{ color: "var(--accent)" }} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
