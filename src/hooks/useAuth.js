import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

/**
 * Who is signed in, asked of Studio's API.
 *
 * `undefined` while the first answer is on its way, `null` when nobody is.
 * Somebody who signed in to Coach before (and ticked "Keep me logged in")
 * goes straight to the home screen.
 */
export function useAuth() {
  const [user, setUser] = useState(undefined);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    apiRequest("GET", "/auth/me")
      .then(({ user }) => { if (alive) setUser(user); })
      .catch((err) => {
        if (!alive) return;
        /* A 401 is the ordinary "not signed in". Anything else means Studio's
           API did not answer, which is worth saying rather than showing a
           sign-in screen that cannot work. */
        if (err.status !== 401) setOffline(true);
        setUser(null);
      });
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password, remember) => {
    const { user } = await apiRequest("POST", "/auth/login", { email, password, remember });
    setOffline(false);
    setUser(user);
    return user;
  }, []);

  /* Ends Coach's session only; a Studio tab signed in separately stays in. */
  const logout = useCallback(async () => {
    try { await apiRequest("POST", "/auth/logout"); } finally { setUser(null); }
  }, []);

  return { user, offline, login, logout };
}
