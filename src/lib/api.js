/* Every request goes to /api on Coach's own origin; Coach's server relays the
   sign-in routes to Studio (server/index.js). `credentials: "include"` carries
   the ts_session cookie Studio issued. The
   error shape matches Studio's apiRequest, so the server's `code`s
   (bad_credentials, archived, locked, rate_limited, password_migrated …)
   can be acted on the same way. */
export const API = import.meta.env.VITE_API_ORIGIN || "";

export async function apiRequest(method, path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.code = data.code;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* Where Studio itself lives, for links out of Coach. */
export const STUDIO_URL = import.meta.env.VITE_STUDIO_URL || (import.meta.env.DEV ? "http://localhost:5173/" : "https://trainabilitystudio.com/");
