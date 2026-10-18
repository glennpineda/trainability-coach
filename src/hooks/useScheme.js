import { useEffect, useState } from "react";

/**
 * Light or dark as the page is now (data-scheme, src/lib/look.js): the
 * device's, or the one chosen under Accessibility. For pictures that come in
 * a light and a dark version, which a <picture>'s media query can only match
 * to the device.
 */
export function useScheme() {
  const read = () => (typeof document !== "undefined" && document.documentElement.dataset.scheme === "dark" ? "dark" : "light");
  const [scheme, setScheme] = useState(read);
  useEffect(() => {
    const watch = new MutationObserver(() => setScheme(read()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme"] });
    return () => watch.disconnect();
  }, []);
  return scheme;
}
