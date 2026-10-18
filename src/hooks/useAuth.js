import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

/**
 * Who is signed in: a Coach account, or a Studio account through Studio's
 * API (Coach's server decides which).
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
    const { user, linked } = await apiRequest("POST", "/auth/login", { email, password, remember });
    /* A Coach account just joined to its Trainability account: Home says so once. */
    if (linked) { try { sessionStorage.setItem("cx-linked", "1"); } catch { /* not kept */ } }
    setOffline(false);
    setUser(user);
    return user;
  }, []);

  /* A new Coach account (Coach's own, for a trainer not on Trainability's
     team), signed in at once. */
  const signup = useCallback(async (name, email, password, remember) => {
    const { user } = await apiRequest("POST", "/auth/signup", { name, email, password, remember });
    setOffline(false);
    setUser(user);
    return user;
  }, []);

  /* Ends Coach's session only; a Studio tab signed in separately stays in. */
  const logout = useCallback(async () => {
    try { await apiRequest("POST", "/auth/logout"); } finally { setUser(null); }
  }, []);

  /* Studio said the session has ended (a 401 from any later request): back
     to sign-in, with nothing to tell Studio. */
  const signedOut = useCallback(() => setUser(null), []);

  return { user, offline, login, signup, logout, signedOut };
}
