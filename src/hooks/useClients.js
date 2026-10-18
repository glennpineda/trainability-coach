import { useCallback, useState } from "react";
import { apiRequest } from "../lib/api";

/**
 * The signed-in trainer's clients, read from Studio through Coach's server
 * (/api/clients), and added, changed and archived there the same way. Coach
 * keeps no copy: `refresh` asks again, and the list already on screen stays
 * there while it does.
 *
 * `clients` is `undefined` while loading; `error` holds a message when the
 * answer did not come. A 401 means the session ended, and `onSignedOut` takes
 * the app back to sign-in.
 */
export function useClients(onSignedOut) {
  const [clients, setClients] = useState(undefined);
  const [error, setError] = useState("");
  /* A linked Coach account's clients still kept in Coach, waiting for the
     trainer to say they may move into Trainability (stage three). */
  const [toMove, setToMove] = useState(0);

  const load = useCallback(() => {
    let alive = true;
    setError("");
    apiRequest("GET", "/clients")
      .then(({ clients, toMove }) => { if (alive) { setClients(clients || []); setToMove(toMove || 0); } })
      .catch((err) => {
        if (!alive) return;
        if (err.status === 401) return onSignedOut?.();
        setError(err.code === "studio_unreachable" || !err.status
          ? "Couldn't reach Trainability. Check your connection and try again."
          : "Your clients couldn't be loaded. Try again in a minute.");
      });
    return () => { alive = false; };
  }, [onSignedOut]);

  const retry = useCallback(() => { setClients(undefined); load(); }, [load]);

  /* A new client, kept in Studio (POST /api/clients): the list comes back
     with it, and what happened (added, linked, back, already). Errors are
     thrown for the form to show. */
  const add = useCallback(async (fields) => {
    try {
      const out = await apiRequest("POST", "/clients", fields);
      setClients(out.clients || []);
      return out;
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      throw err;
    }
  }, [onSignedOut]);

  /* A client's details changed, or archived / put back (PATCH and POST
     /api/clients/:id…), the same way. */
  const send = useCallback(async (method, path, body) => {
    try {
      const out = await apiRequest(method, path, body);
      setClients(out.clients || []);
      return out;
    } catch (err) {
      if (err.status === 401) onSignedOut?.();
      throw err;
    }
  }, [onSignedOut]);
  const edit = useCallback((id, fields) => send("PATCH", `/clients/${id}`, fields), [send]);
  const archive = useCallback((id, archived) => send("POST", `/clients/${id}/archive`, { archived }), [send]);

  /* Moving them: { moved, kept: [{ name, why }] }. */
  const move = useCallback(async () => {
    const out = await send("POST", "/clients/move");
    setToMove(out.toMove || 0);
    return out;
  }, [send]);

  return { clients, error, retry, refresh: load, add, edit, archive, toMove, move };
}
