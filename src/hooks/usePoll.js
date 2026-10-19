import { useEffect } from "react";

/**
 * `fn` every `ms` while the page is in sight, and once more on coming back
 * to it (Run 1, O-4): a tab left open behind others, or a phone in a
 * pocket, used to keep asking every 15 to 60 seconds all day. `fn` is not
 * run at the start; the caller loads first as it always did.
 */
export function usePoll(fn, ms, on = true) {
  useEffect(() => {
    if (!on) return undefined;
    const seen = () => document.visibilityState === "visible";
    const t = setInterval(() => { if (seen()) fn(); }, ms);
    const back = () => { if (seen()) fn(); };
    document.addEventListener("visibilitychange", back);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", back); };
  }, [fn, ms, on]);
}
