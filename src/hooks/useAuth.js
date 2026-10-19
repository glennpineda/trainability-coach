import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { ROUTE, CHOICES } from "../lib/look";

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
  /* Signed in, until a later request said the session had ended: asked to
     sign in again over the screen (auth/SignInAgain.jsx), which is kept. */
  const [expired, setExpired] = useState(false);

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
    const { user, linked, samePlaces = [] } = await apiRequest("POST", "/auth/login", { email, password, remember });
    /* A Coach account just joined to its Trainability account: Home says so
       once, and asks about places both had (SamePlaces.jsx; Run 1, B-6). */
    if (linked) {
      try {
        sessionStorage.setItem("cx-linked", "1");
        if (samePlaces.length) sessionStorage.setItem("cx-same-places", JSON.stringify(samePlaces));
      } catch { /* not kept */ }
    }
    setOffline(false);
    setExpired(false);
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
    try { await apiRequest("POST", "/auth/logout"); } finally {
      /* Where they were (the tab, the program, the client, the conversation)
         goes with them, so the next person on this tab starts at Home (Run 1, B-3). */
      try { for (const k of ["coach-tab", "coach-program", "coach-client", "coach-thread"]) sessionStorage.removeItem(k); } catch { /* not kept */ }
      setExpired(false); setUser(null);
    }
  }, []);

  /* Studio said the session has ended (a 401 from any later request): sign
     in again over what they were doing, rather than back to the sign-in
     screen with it lost (Run 1, U-3). */
  const signedOut = useCallback(() => setExpired(true), []);

  /* Their own password chosen after a temporary one. */
  const passwordChosen = useCallback(() => setUser(u => (u ? { ...u, mustChangePassword: false } : u)), []);

  /* One Accessibility choice (src/lib/look.js): on the page at once, as
     Studio's are, then saved on the account (Studio's, for a Trainability
     trainer, through Coach's relay). Put back, and thrown, if it didn't save. */
  const chooseLook = useCallback(async (key, value) => {
    if (!ROUTE[key] || !CHOICES[key].includes(value)) return;
    let before;
    setUser(u => { before = u?.[key]; return u ? { ...u, [key]: value } : u; });
    try {
      const { user: saved } = await apiRequest("POST", ROUTE[key], { [key]: value });
      if (saved && saved[key] !== undefined) setUser(u => (u ? { ...u, [key]: saved[key] } : u));
    } catch (err) {
      setUser(u => (u ? { ...u, [key]: before } : u));
      throw err;
    }
  }, []);

  /* Wide screen, Studio's (its App.jsx, toggleWide): on the page at once, then
     kept with the person, on their Studio account through the relay for a
     Trainability trainer, so it is the same in both apps (Glenn, 19 Oct 2026). */
  const chooseWide = useCallback(async (on) => {
    setUser(u => (u ? { ...u, wideScreen: on } : u));
    try {
      const { user: saved } = await apiRequest("POST", "/auth/wide-screen", { on });
      if (saved && saved.wideScreen !== undefined) setUser(u => (u ? { ...u, wideScreen: !!saved.wideScreen } : u));
    } catch {
      setUser(u => (u ? { ...u, wideScreen: !on } : u));
    }
  }, []);

  return { user, offline, expired, login, signup, logout, signedOut, passwordChosen, chooseLook, chooseWide };
}
