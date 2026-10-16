import { useCallback, useEffect, useState } from "react";

/**
 * Which screen is showing, from the address bar: `/` is home, `/clients` the
 * client list. The server hands every path the same page, so a reload or a
 * shared link lands on the right screen, and Back works as people expect.
 */
export function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const back = () => setPath(window.location.pathname);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);

  const go = useCallback((to) => {
    if (to === window.location.pathname) return;
    window.history.pushState(null, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return [path, go];
}
