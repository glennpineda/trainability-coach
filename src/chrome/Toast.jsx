import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AssistantMark } from "../billy/AssistantMark";

/*
 * A short "done" that goes by itself, risen off the tab bar: Studio's toast
 * (its App.jsx, "iw-toast", and hooks/useToast.js), in Coach's colors. Only
 * for a short confirmation such as "Jamie Ortiz added."; anything longer is a
 * NoticeDialog with OK (Studio's rule, CONTRIBUTING "Toasts are for short
 * confirmations"). Billy happy beside the words; tap it to close. Inside the
 * app's card, so on a desktop it rises over the app rather than the page.
 * First used for a client added or changed (Run 1, U-4).
 */

/* Studio's showFor: about 18 characters a second, 2.4 to 7 seconds. */
const showFor = (msg) => Math.min(7000, Math.max(2400, 1200 + String(msg ?? "").length * 55));

export function Toast({ toast, onGone }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(onGone, showFor(toast.message));
    return () => clearTimeout(t);
  }, [toast, onGone]);
  if (!toast) return null;
  return createPortal(
    <div className="fixed inset-x-0 flex justify-center px-4 pointer-events-none"
      style={{ zIndex: 40, bottom: "calc(max(10px, env(safe-area-inset-bottom, 0px) - 14px) + 76px)" }}>
      <div role="status" className="cx-card w-full max-w-sm p-3 flex items-center gap-3 text-sm" onClick={onGone}
        title="Tap to close" style={{ pointerEvents: "auto", cursor: "pointer", color: "var(--ink)", boxShadow: "0 10px 30px -12px rgba(23, 42, 58, 0.45)" }}>
        <AssistantMark key={toast.id} id={`toast-billy-${toast.id}`} size={40} mood="happy" />
        <div>{toast.message}</div>
      </div>
    </div>,
    document.querySelector(".cx-app-shell") || document.body,
  );
}
