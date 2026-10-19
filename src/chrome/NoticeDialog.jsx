import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/*
 * It worked, with more to say than a toast can (Studio's NoticeDialog, its
 * components/primitives.jsx): a title, the words, and OK. First used when a
 * client added turned out to be somebody already ours (Run 1, U-4).
 */
export function NoticeDialog({ title, children, onClose }) {
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cx-notice-title" className="cx-card w-full sm:max-w-sm p-5 grid gap-3" style={{ borderRadius: 16, color: "var(--ink)" }}>
        <h2 id="cx-notice-title" className="cx-display text-xl">{title}</h2>
        <div className="text-sm grid gap-2">{children}</div>
        <button type="button" autoFocus className="cx-btn-primary w-full py-2.5 text-sm" onClick={onClose}>OK</button>
      </div>
    </div>,
    document.body,
  );
}
