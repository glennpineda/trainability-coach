import { API, apiRequest } from "../lib/api";

/*
 * A picture or a video made ready and sent to Coach for a message, Studio's
 * way: a picture shrunk in the browser first (its photos are), a video sent
 * in pieces of 8 MB with a still taken from its first frame (its ad videos
 * are). The server checks what the file really is.
 */

const PICTURE_SIDE = 2048;
const CHUNK = 8 * 1024 * 1024;
export const VIDEO_MAX = 100 * 1024 * 1024;

const loadImage = (url) => new Promise((resolve, reject) => {
  const i = new Image();
  i.onload = () => resolve(i);
  i.onerror = () => reject(new Error("That picture couldn't be opened."));
  i.src = url;
});

/* A JPEG no wider or taller than PICTURE_SIDE. A GIF is left as it is, since
   redrawing it keeps only its first frame. */
async function shrinkPicture(file) {
  if (file.type === "image/gif") return { blob: file, width: null, height: null };
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, PICTURE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";   // a transparent PNG would otherwise go black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) throw new Error("That picture couldn't be opened.");
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* A video's size and a still from just after its start, as a small JPEG.
   Null where the browser can't play it (it is still sent; the server says
   whether it is a video). */
async function videoStill(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    await new Promise((resolve, reject) => {
      v.onloadeddata = resolve; v.onerror = () => reject(new Error("unreadable"));
      setTimeout(() => reject(new Error("slow")), 8000);
    });
    await new Promise((resolve) => { v.onseeked = resolve; v.currentTime = Math.min(0.1, (v.duration || 1) / 2); setTimeout(resolve, 3000); });
    const scale = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(v.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(v.videoHeight * scale));
    canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
    return { still: canvas.toDataURL("image/jpeg", 0.7), width: v.videoWidth, height: v.videoHeight };
  } catch {
    return { still: null, width: null, height: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function sendPiece(upload, piece) {
  const res = await fetch(`${API}/api/attachments/${upload}/chunk`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/octet-stream" }, body: piece,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "That didn't upload. Try again."), { status: res.status, code: data.code });
}

/**
 * A file the trainer picked, uploaded and kept waiting for the message:
 * resolves to the attachment ({ id, kind, … }). `onProgress(0…1)`.
 */
export async function uploadAttachment(file, onProgress = () => {}) {
  const video = file.type.startsWith("video/");
  if (!video && !file.type.startsWith("image/")) throw new Error("Attach a picture or a video.");
  if (video && file.size > VIDEO_MAX) throw new Error("That video is too large. Keep it under 100 MB.");
  const ready = video ? { blob: file, ...(await videoStill(file)) } : await shrinkPicture(file);
  const kind = video ? "video" : "picture";
  const { upload } = await apiRequest("POST", "/attachments/begin", { kind, bytes: ready.blob.size });
  for (let at = 0; at < ready.blob.size; at += CHUNK) {
    await sendPiece(upload, ready.blob.slice(at, at + CHUNK));
    onProgress(Math.min(1, (at + CHUNK) / ready.blob.size));
  }
  return apiRequest("POST", `/attachments/${upload}/finish`, {
    kind, name: file.name, width: ready.width, height: ready.height, ...(video && ready.still ? { still: ready.still } : {}),
  });
}

export const fileUrl = (id) => `${API}/api/attachments/${id}/file`;
