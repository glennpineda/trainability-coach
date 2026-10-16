import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../lib/api";

/* Claude takes a photo up to 5 MB and a whole request up to 32 MB. A phone's
   photo is shrunk here to well under that, so it travels quickly and is read
   as well as at full size; a PDF goes as it is, up to this much. */
const PHOTO_SIDE = 1600;
const PDF_MAX = 15 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const readAsDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

/* A photo as a JPEG no wider or taller than PHOTO_SIDE. A GIF is left alone,
   since redrawing it would keep only its first frame. */
async function shrinkPhoto(file) {
  if (file.type === "image/gif") return readAsDataUrl(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That photo couldn't be opened."));
      i.src = url;
    });
    const scale = Math.min(1, PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";   // a transparent PNG would otherwise go black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * A file the trainer picked, made ready for Billy: the block Claude reads and
 * what the screen shows of it. Throws with a message for the screen when it
 * is a kind he does not read or too big.
 */
export async function prepareFile(file) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (isPdf) {
    if (file.size > PDF_MAX) throw new Error("That PDF is too big for Billy. Try one under 15 MB.");
    const data = (await readAsDataUrl(file)).split(",")[1];
    return { name: file.name, kind: "pdf", block: { type: "document", source: { type: "base64", media_type: "application/pdf", data } } };
  }
  if (file.type.startsWith("image/")) {
    if (!PHOTO_TYPES.includes(file.type)) {
      throw new Error("Billy reads JPEG, PNG, GIF and WebP photos. On an iPhone, a photo shared from Photos is sent as a JPEG.");
    }
    const dataUrl = await shrinkPhoto(file);
    const [head, data] = dataUrl.split(",");
    const media = /data:([^;]+)/.exec(head)?.[1] || "image/jpeg";
    return { name: file.name, kind: "photo", preview: dataUrl, block: { type: "image", source: { type: "base64", media_type: media, data } } };
  }
  throw new Error("Billy reads photos and PDFs.");
}

/**
 * Billy in Coach: whether he is here, his panel, and the conversation.
 *
 * The conversation is kept here, in the tab, and sent whole with each
 * question (the server keeps none of it). `thread` is Claude's own copy,
 * tool results and all, as the server last handed it back; `turns` is what
 * the panel shows. Closing the panel keeps both; "New conversation" clears
 * them, and so does leaving the page.
 */
export function useBilly(onSignedOut) {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const thread = useRef([]);

  useEffect(() => {
    let alive = true;
    apiRequest("GET", "/assistant")
      .then(({ available }) => { if (alive) setAvailable(!!available); })
      .catch(() => { /* no Billy: nothing to offer, nothing to say */ });
    return () => { alive = false; };
  }, []);

  /* `file` is what prepareFile made, or null. */
  const ask = useCallback(async (text, file) => {
    const words = text.trim() || (file ? "Have a look at this." : "");
    if (!words || asking) return false;
    const content = [...(file ? [file.block] : []), { type: "text", text: words }];
    const turn = { who: "you", text: words, file: file ? { name: file.name, kind: file.kind, preview: file.preview } : null };
    setTurns(t => [...t, turn]);
    setAsking(true);
    setError("");
    try {
      const out = await apiRequest("POST", "/assistant", { messages: [...thread.current, { role: "user", content }] });
      thread.current = out.messages;
      setTurns(t => [...t, { who: "billy", text: out.reply }]);
      return true;
    } catch (err) {
      if (err.status === 401) { onSignedOut?.(); return false; }
      /* Not asked after all: the question comes off the screen, and the
         panel puts it back in the box to try again. */
      setTurns(t => t.filter(x => x !== turn));
      setError(err.code === "studio_unreachable" || !err.status
        ? "Couldn't reach Trainability. Check your connection and try again."
        : err.message);
      return false;
    } finally {
      setAsking(false);
    }
  }, [asking, onSignedOut]);

  const reset = useCallback(() => { thread.current = []; setTurns([]); setError(""); }, []);

  return { available, open, setOpen, turns, asking, error, ask, reset };
}
