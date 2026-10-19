import React, { useEffect } from "react";
import { createPortal } from "react-dom";

/*
 * A question before something weighty (Studio's confirm dialogs: the quiet
 * control on the row only asks, and the red button lives here; its
 * CONTRIBUTING, "Quiet on the row, weighty in the dialog"). The safe answer
 * first and focused; Escape gives it. First used for archiving a client
 * (Run 1, D-7). `danger={false}` for a question that takes nothing away
 * (sending a program as it is), with the primary button.
 */
export function ConfirmDialog({ title, children, yes, no = "Cancel", busy, onYes, onNo, danger = true }) {
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onNo(); };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onNo]);
  return createPortal(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cx-confirm-title" className="cx-card w-full sm:max-w-sm" style={{ color: "var(--ink)" }}>
        <div className="p-4 grid gap-1">
          <h2 id="cx-confirm-title" className="cx-display text-lg">{title}</h2>
          <p className="text-sm" style={{ color: "var(--iron)" }}>{children}</p>
        </div>
        <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--iron-line)" }}>
          <button type="button" autoFocus className="flex-1 py-2 text-sm" style={{ color: "var(--iron)" }} onClick={onNo}>{no}</button>
          <button type="button" className={`${danger ? "cx-btn-ember" : "cx-btn-primary"} flex-1 py-2 text-sm`} disabled={busy} aria-busy={busy} onClick={onYes}>{yes}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
