import { useCallback, useState } from "react";
import { apiRequest } from "../lib/api";

/**
 * The signed-in trainer's clients, read from Studio through Coach's server
 * (/api/clients). Coach keeps no copy: `refresh` asks again, and the list
 * already on screen stays there while it does.
 *
 * `clients` is `undefined` while loading; `error` holds a message when the
 * answer did not come. A 401 means the session ended, and `onSignedOut` takes
 * the app back to sign-in.
 */
export function useClients(onSignedOut) {
  const [clients, setClients] = useState(undefined);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    let alive = true;
    setError("");
    apiRequest("GET", "/clients")
      .then(({ clients }) => { if (alive) setClients(clients || []); })
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

  return { clients, error, retry, refresh: load };
}
