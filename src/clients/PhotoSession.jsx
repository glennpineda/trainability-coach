import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ChevronLeft, Ghost, RefreshCw, SwitchCamera, Timer, Upload, X } from "lucide-react";
import { ANGLES, CHECKLIST, PHOTO_W, PHOTO_H } from "../lib/progress-photos";
import { todayIso } from "../lib/date";

/*
 * Taking a set of progress photos (Glenn, 19 Oct 2026: "Is there a way we
 * can help guide to create similar pictures?"; he chose all four kinds of
 * guidance): a checklist first, then Front, Left side, Right side and Back in
 * turn, each with last time's photo of that angle faintly over the camera
 * (the ghost) to line the client up with, an outline with lines for the head
 * and the feet, a level on a phone, and a 10-second timer. Then all four to
 * look over, the day and a note, and Save.
 *
 * The camera is Studio's way (its Join page's PhotoPart, public/JoinPage.jsx):
 * drawn in the page with getUserMedia, and where there is no camera, a
 * picture chosen instead. Here the back camera first, since a trainer holds
 * the phone, and not mirrored, so left is left in every photo.
 *
 * Every photo is 3:4 upright, cropped from the middle of the camera's view
 * exactly as the view shows it, so the ghost and the photo line up.
 */

const RATIO = PHOTO_W / PHOTO_H;

/* The middle 3:4 of a picture or a video frame, as a JPEG data URI. */
function crop(source, sw, sh) {
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_W; canvas.height = PHOTO_H;
  const ctx = canvas.getContext("2d");
  let cw = sw, ch = sw / RATIO;
  if (ch > sh) { ch = sh; cw = sh * RATIO; }
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, PHOTO_W, PHOTO_H);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/* A body to stand in: lines for the top of the head and the feet, and a
   figure facing the camera or side on. In the photo's own 300 by 400. */
function Outline({ side }) {
  return (
    <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
      <g stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" strokeDasharray="6 5" fill="none">
        <line x1="20" x2="280" y1="34" y2="34" />
        <line x1="20" x2="280" y1="378" y2="378" />
      </g>
      <g fill="#fff" fillOpacity="0.9" fontSize="11" fontFamily="Roboto, sans-serif">
        <text x="22" y="29">Top of the head</text>
        <text x="22" y="392">Feet</text>
      </g>
      <g stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {side ? (
          <>
            <ellipse cx="152" cy="66" rx="24" ry="29" />
            <path d="M146 95 L144 112 Q124 130 128 180 Q130 215 134 240 L138 300 L136 376 M158 95 L162 112 Q182 136 176 190 Q172 220 168 244 L162 300 L160 376 M150 128 Q140 180 150 236" />
          </>
        ) : (
          <>
            <ellipse cx="150" cy="64" rx="25" ry="29" />
            <path d="M138 93 L136 106 Q104 112 96 128 L84 210 L80 262 M162 93 L164 106 Q196 112 204 128 L216 210 L220 262 M108 130 Q104 190 114 240 L120 300 L124 376 M192 130 Q196 190 186 240 L180 300 L176 376 M150 252 L147 376" />
          </>
        )}
      </g>
    </svg>
  );
}

/* The phone's tilt, on a phone: null where there is no sensor (a computer),
   or until it says. Upright is beta 90 and gamma 0. */
function useLevel(on) {
  const [tilt, setTilt] = useState(null);
  useEffect(() => {
    if (!on) return undefined;
    const read = (e) => { if (e.beta != null && e.gamma != null) setTilt({ beta: e.beta, gamma: e.gamma }); };
    window.addEventListener("deviceorientation", read);
    return () => window.removeEventListener("deviceorientation", read);
  }, [on]);
  return tilt;
}
const LEVEL = 4;   // degrees either way that count as upright
function levelSays(t) {
  if (!t) return null;
  if (t.beta < 90 - LEVEL) return "Tilt the top of the phone toward you";
  if (t.beta > 90 + LEVEL) return "Tilt the top of the phone away from you";
  if (t.gamma > LEVEL) return "Straighten the phone: it leans right";
  if (t.gamma < -LEVEL) return "Straighten the phone: it leans left";
  return "";
}

export function PhotoSession({ firstName, previous, onSave, onClose, busy, error }) {
  const [step, setStep] = useState("check");     // "check", 0 to 3, or "review"
  const [shots, setShots] = useState({});        // angle → data URI
  const [shown, setShown] = useState(null);      // a photo just taken, to keep or take again
  const [facing, setFacing] = useState("environment");
  const [ghost, setGhost] = useState(true);
  const [timer, setTimer] = useState(false);
  const [count, setCount] = useState(0);
  const [camera, setCamera] = useState("off");   // "off", "starting", "on", "none"
  const [takenOn, setTakenOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [said, setSaid] = useState("");
  const [redo, setRedo] = useState(false);      // taking one again from the review
  const video = useRef(null);
  const file = useRef(null);
  const angle = typeof step === "number" ? ANGLES[step] : null;
  const tilt = useLevel(typeof step === "number");
  /* Closing with photos taken asks first (Run 1, U-2), as Studio's
     DiscardDialog does: the X used to lose them at once. Escape asks the same,
     and leaving the page asks the browser's own question. */
  const [asking, setAsking] = useState(false);
  const taken = Object.keys(shots).length + (shown ? 1 : 0);
  const close = () => (taken ? setAsking(true) : onClose());
  useEffect(() => {
    if (!taken) return undefined;
    const stay = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", stay);
    return () => window.removeEventListener("beforeunload", stay);
  }, [taken]);
  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") { if (asking) setAsking(false); else close(); } };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /* The camera, while an angle is being taken. */
  const live = typeof step === "number" && !shown;
  useEffect(() => {
    if (!live) return undefined;
    if (!navigator.mediaDevices?.getUserMedia) { setCamera("none"); return undefined; }
    let stream = null, gone = false;
    setCamera("starting");
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (gone) { stream.getTracks().forEach(t => t.stop()); return; }
        video.current.srcObject = stream;
        await video.current.play();
        setCamera("on");
      } catch {
        if (!gone) setCamera("none");
      }
    })();
    return () => { gone = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [live, facing]);

  /* The timer's count down, then the photo. */
  useEffect(() => {
    if (!count) return undefined;
    const t = setTimeout(() => { if (count === 1) { setCount(0); snap(); } else setCount(count - 1); }, 1000);
    return () => clearTimeout(t);
  }, [count]);

  const snap = () => {
    const v = video.current;
    if (!v?.videoWidth) return;
    setShown(crop(v, v.videoWidth, v.videoHeight));
  };
  const take = () => (timer ? setCount(10) : snap());
  const picked = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSaid("");
    try {
      const bitmap = await createImageBitmap(f, { imageOrientation: "from-image" });
      setShown(crop(bitmap, bitmap.width, bitmap.height));
      bitmap.close?.();
    } catch { setSaid("That picture couldn't be read. Try a JPEG or PNG, or take one with the camera."); }
  };
  /* iOS asks before it gives the phone's tilt, and only on a tap. */
  const start = async () => {
    try { if (typeof DeviceOrientationEvent?.requestPermission === "function") await DeviceOrientationEvent.requestPermission(); } catch { /* the level just doesn't show */ }
    setStep(0);
  };
  /* On to the next angle, or back to the review when one was being taken again. */
  const next = (keep) => {
    if (keep) setShots(s => ({ ...s, [angle.key]: shown }));
    setShown(null); setCount(0);
    if (!redo && step < ANGLES.length - 1) setStep(step + 1);
    else { setRedo(false); setStep("review"); }
  };
  const level = levelSays(tilt);
  const before = angle && previous?.photos?.[angle.key];

  /* Over the whole app, its bars included: in a portal, since the page's
     main area is a layer of its own that a fixed child can't rise above. */
  return createPortal(
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 60, background: "#0B141C", color: "#fff" }} role="dialog" aria-modal="true" aria-label="Progress photos">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="p-2 rounded-lg" aria-label="Close" onClick={close}><X size={22} aria-hidden="true" /></button>
        <div className="flex-1 min-w-0 text-center">
          <div className="font-medium truncate">{step === "check" ? `Progress photos of ${firstName}` : step === "review" ? "Look them over" : `${angle.label} · ${step + 1} of ${ANGLES.length}`}</div>
          {angle && <div className="text-xs" style={{ opacity: 0.75 }}>{angle.say}</div>}
        </div>
        <span className="w-10" />
      </div>

      {step === "check" && (
        <div className="flex-1 overflow-y-auto px-5 pb-6 max-w-md mx-auto w-full">
          <p className="text-sm mt-2 mb-3" style={{ opacity: 0.85 }}>So that each set can be put beside the last, take them the same way every time:</p>
          <ul className="grid gap-2.5">
            {CHECKLIST.map(line => (
              <li key={line} className="flex gap-2.5 text-sm"><Check size={18} className="flex-none mt-0.5" style={{ color: "#4FA8DC" }} aria-hidden="true" />{line}</li>
            ))}
          </ul>
          <p className="text-sm mt-4" style={{ opacity: 0.85 }}>
            You&apos;ll take the front, the left side, the right side and the back in turn.
            {previous ? " Last time's photo of each shows faintly over the camera: line them up with it." : " Next time, these will show faintly over the camera to line up with."}
          </p>
          <button type="button" className="cx-btn-primary w-full mt-5 py-3 text-base" onClick={start}>Start</button>
        </div>
      )}

      {angle && (
        <div className="flex-1 min-h-0 flex flex-col items-center px-3">
          {/* The view, 3:4, as large as the screen allows. */}
          <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
            <div className="relative overflow-hidden rounded-xl" style={{ aspectRatio: "3 / 4", height: "100%", maxWidth: "100%", background: "#1d2a35" }}>
              {shown ? (
                <img src={shown} alt={`${angle.label}, just taken`} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <>
                  <video ref={video} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                  {ghost && before && <img src={before} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.35 }} />}
                  <Outline side={angle.key === "left" || angle.key === "right"} />
                  {camera === "starting" && <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ opacity: 0.8 }}>Starting the camera…</div>}
                  {camera === "none" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm" style={{ background: "rgba(11,20,28,0.85)" }}>
                      Coach couldn&apos;t use the camera here. Choose a photo instead.
                      <button type="button" className="cx-btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5" onClick={() => file.current?.click()}><Upload size={16} aria-hidden="true" /> Choose a photo</button>
                    </div>
                  )}
                  {level != null && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap" role="status"
                      style={{ background: level ? "rgba(255,170,60,0.92)" : "rgba(40,160,110,0.92)", color: "#0B141C" }}>
                      {level || "Level"}
                    </div>
                  )}
                  {count > 0 && <div className="absolute inset-0 flex items-center justify-center text-7xl font-medium" aria-live="assertive">{count}</div>}
                </>
              )}
            </div>
          </div>
          {said && <p className="text-sm mt-2" role="alert" style={{ color: "#ffb4a8" }}>{said}</p>}
          {shown ? (
            <div className="flex gap-2 py-3 w-full max-w-md">
              <button type="button" className="flex-1 py-3 rounded-xl border inline-flex items-center justify-center gap-1.5" style={{ borderColor: "rgba(255,255,255,0.35)" }} onClick={() => setShown(null)}><RefreshCw size={16} aria-hidden="true" /> Take it again</button>
              <button type="button" className="cx-btn-primary flex-1 py-3" onClick={() => next(true)}>{!redo && step < ANGLES.length - 1 ? "Use it, next" : "Use it"}</button>
            </div>
          ) : (
            <div className="w-full max-w-md py-3">
              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                {before && (
                  <button type="button" aria-pressed={ghost} onClick={() => setGhost(g => !g)} className="px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border"
                    style={ghost ? { background: "#fff", color: "#0B141C", borderColor: "#fff" } : { borderColor: "rgba(255,255,255,0.4)" }}><Ghost size={14} aria-hidden="true" /> Last time</button>
                )}
                <button type="button" aria-pressed={timer} onClick={() => setTimer(t => !t)} className="px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border"
                  style={timer ? { background: "#fff", color: "#0B141C", borderColor: "#fff" } : { borderColor: "rgba(255,255,255,0.4)" }}><Timer size={14} aria-hidden="true" /> 10 s timer</button>
                <button type="button" onClick={() => setFacing(f => (f === "environment" ? "user" : "environment"))} className="px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border" style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                  <SwitchCamera size={14} aria-hidden="true" /> Switch camera</button>
                <button type="button" onClick={() => file.current?.click()} className="px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 border" style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                  <Upload size={14} aria-hidden="true" /> Choose a photo</button>
              </div>
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="px-3 py-2 text-sm inline-flex items-center gap-1" style={{ opacity: step && !redo ? 1 : 0.4 }} disabled={!step || redo}
                  onClick={() => { setStep(step - 1); setCount(0); }}><ChevronLeft size={16} aria-hidden="true" /> Back</button>
                <button type="button" aria-label={count ? "Counting down" : `Take the ${angle.label.toLowerCase()} photo`} disabled={camera !== "on" || count > 0} onClick={take}
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center disabled:opacity-40" style={{ background: "#fff", boxShadow: "0 0 0 4px rgba(255,255,255,0.35)" }}>
                  <Camera size={28} style={{ color: "#0B141C" }} aria-hidden="true" />
                </button>
                <button type="button" className="px-3 py-2 text-sm" onClick={() => next(false)}>{redo ? "Cancel" : "Skip"}</button>
              </div>
            </div>
          )}
          <input ref={file} type="file" accept="image/*" onChange={picked} className="hidden" aria-label="Choose a photo" />
        </div>
      )}

      {step === "review" && (
        <div className="flex-1 overflow-y-auto px-4 pb-6 max-w-lg mx-auto w-full">
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ANGLES.map((a, i) => (
              <div key={a.key} className="rounded-lg overflow-hidden relative" style={{ aspectRatio: "3 / 4", background: "#1d2a35" }}>
                {shots[a.key] ? <img src={shots[a.key]} alt={a.label} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs" style={{ opacity: 0.6 }}>Not taken</div>}
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1.5 text-xs" style={{ background: "rgba(11,20,28,0.7)" }}>
                  <span>{a.label}</span>
                  <button type="button" className="px-2 py-0.5 rounded-full border text-xs" style={{ borderColor: "rgba(255,255,255,0.5)" }} onClick={() => { setRedo(true); setStep(i); }}>{shots[a.key] ? "Take again" : "Take it"}</button>
                </div>
              </div>
            ))}
          </div>
          <label className="grid gap-1 text-xs mt-4" style={{ opacity: 0.85 }}>Day taken
            <input type="date" className="cx-input" max={todayIso()} value={takenOn} onChange={e => setTakenOn(e.target.value)} />
          </label>
          <label className="grid gap-1 text-xs mt-3" style={{ opacity: 0.85 }}>Note (optional)
            <textarea className="cx-input text-sm" rows={2} maxLength={1000} value={note} placeholder="Such as: morning, before training" onChange={e => setNote(e.target.value)} />
          </label>
          {error && <p className="text-sm mt-3" role="alert" style={{ color: "#ffb4a8" }}>{error}</p>}
          <button type="button" className="cx-btn-primary w-full mt-4 py-3 text-base" disabled={busy || !Object.keys(shots).length} aria-busy={busy}
            onClick={() => onSave({ takenOn, note, photos: shots })}>{busy ? "Saving…" : "Save"}</button>
          <p className="text-xs mt-2 text-center" style={{ opacity: 0.7 }}>Every trainer of {firstName} will see these.</p>
        </div>
      )}
      {asking && (
        /* Studio's DiscardDialog, in Coach's colors; keeping them is the safe answer. */
        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ zIndex: 70, background: "rgba(0,0,0,0.5)" }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="cx-discard-title" className="cx-card w-full sm:max-w-sm" style={{ color: "var(--ink)" }}>
            <div className="p-4 grid gap-1">
              <h2 id="cx-discard-title" className="cx-display text-lg">Discard the photos taken?</h2>
              <p className="text-sm" style={{ color: "var(--iron)" }}>{taken === 1 ? "The photo taken hasn't" : `The ${taken} photos taken haven't`} been saved, so closing now loses {taken === 1 ? "it" : "them"}.</p>
            </div>
            <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--iron-line)" }}>
              <button type="button" autoFocus className="flex-1 py-2 text-sm" style={{ color: "var(--iron)" }} onClick={() => setAsking(false)}>Keep taking</button>
              <button type="button" className="cx-btn-ember flex-1 py-2 text-sm" onClick={onClose}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
