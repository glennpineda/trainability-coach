/* Copied from Studio's server/json-gzip.js (Run 1, O-7), unchanged but for this line. */
/**
 * Big JSON answers go out gzipped (Glenn, 30 Sep: a cancel in a room with no
 * CRM still took a while). The schedule is every appointment the business has
 * ever had — 46,000 on a copy of live, about 15 MB as JSON — and it went to
 * the phone as it was, after every change. Gzipped it is about a tenth.
 *
 * Only past a size where squeezing it is worth the time, and only for a
 * browser that says it can read gzip. Squeezed off the main loop (zlib's own
 * threads), so a big answer doesn't hold up everybody else's.
 */
import zlib from "node:zlib";

const WORTH_IT = 32 * 1024;

/** Send JSON already turned into text, gzipped when it is worth it. */
export function sendJsonText(req, res, text) {
  if (Buffer.byteLength(text) < WORTH_IT || !/\bgzip\b/.test(req.get("Accept-Encoding") || "")
    || res.get("Content-Encoding")) {
    return res.type("application/json").send(text);
  }
  zlib.gzip(text, { level: 5 }, (err, out) => {
    if (res.headersSent) return;
    if (err) { res.type("application/json").send(text); return; }
    res.set("Content-Type", "application/json; charset=utf-8");
    res.set("Content-Encoding", "gzip");
    res.set("Content-Length", String(out.length));
    res.vary("Accept-Encoding");
    res.end(out);
  });
  return res;
}

/** Every `res.json` under it, through `sendJsonText`. */
export function jsonGzip() {
  return (req, res, next) => {
    const send = res.json.bind(res);
    res.json = (body) => {
      const text = JSON.stringify(body);
      return text === undefined ? send(body) : sendJsonText(req, res, text);
    };
    next();
  };
}
