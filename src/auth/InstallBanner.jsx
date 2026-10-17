import React, { useEffect, useState } from "react";
import { Download, Share, SquarePlus, Smartphone, X } from "lucide-react";
import { useInstall, touchFirst, bannerHidden, hideBanner } from "../lib/install";

/**
 * The offer to put Coach on a home screen, along the bottom of the sign-in
 * screen, as Studio has it (its components/InstallApp.jsx; Glenn, 17 Oct
 * 2026: "add the “add to Home Screen” like on Studio at the bottom of the
 * login screen"). A pane of glass over the backdrop, out of the way of the
 * form; phones and tablets only, since a desk computer has the address bar's
 * install button if it wants one. "Not now" puts it away on this device for a
 * month. Chrome and Android open their own install box; an iPhone or iPad,
 * where no page can start an install, is shown the steps.
 */

/* The three steps for an iPhone or iPad: a dialog with an OK rather than a
   toast, since it is instructions followed with the screen in front of them. */
function HomeScreenSteps({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const steps = [
    { icon: Share, text: <>Tap the <strong>Share</strong> button — at the bottom of Safari on an iPhone, at the top on an iPad.</> },
    { icon: SquarePlus, text: <>Scroll down and tap <strong>Add to Home Screen</strong>.</> },
    { icon: Smartphone, text: <>Tap <strong>Add</strong>. Coach appears on your Home Screen and opens full screen from there.</> },
  ];
  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 50, background: "rgba(0,0,0,0.4)" }}>
      <div role="dialog" aria-modal="true" aria-label="Add to Home Screen" className="cx-card w-full max-w-sm" style={{ color: "var(--ink)" }}>
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="cx-display text-lg uppercase">Add to Home Screen</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close" title="Close"><X size={18} aria-hidden="true" /></button>
        </div>
        <ol className="p-4 space-y-3 text-base">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex items-center justify-center flex-none" style={{ width: 40, height: 40, color: "var(--accent)" }} aria-hidden="true"><step.icon size={20} /></span>
              <div className="pt-1"><span className="font-semibold">{i + 1}.</span> {step.text}</div>
            </li>
          ))}
        </ol>
        <div className="p-4 border-t" style={{ borderColor: "var(--iron-line)" }}>
          <button type="button" onClick={onClose} className="cx-btn-primary w-full py-2 text-base">OK</button>
        </div>
      </div>
    </div>
  );
}

export function InstallBanner() {
  const { how, install } = useInstall();
  const [hidden, setHidden] = useState(bannerHidden);
  const [steps, setSteps] = useState(false);

  if (steps) return <HomeScreenSteps onClose={() => setSteps(false)} />;
  if (!how || hidden || !touchFirst()) return null;

  return (
    <div
      className="fixed left-3 right-3 mx-auto max-w-sm flex items-center text-base"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        zIndex: 20,
        color: "#fff",
        background: "rgba(255,255,255,0.14)",
        border: "1px solid rgba(255,255,255,0.28)",
        borderRadius: 14,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <button type="button" onClick={() => (how === "ios" ? setSteps(true) : install())}
        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left">
        <Download size={18} style={{ flexShrink: 0 }} aria-hidden="true" />
        {how === "ios" ? "Add Coach to your Home Screen" : "Install the app"}
      </button>
      <button type="button" onClick={() => { hideBanner(); setHidden(true); }} aria-label="Not now" title="Not now" className="p-2.5 flex-shrink-0">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
