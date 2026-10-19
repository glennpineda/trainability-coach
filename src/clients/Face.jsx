import React, { useState } from "react";

/*
 * A client's photo from Studio (Glenn, 19 Oct 2026), or, when they have none
 * or it won't load, what was there before: their initials on a disc, passed
 * in as `children` so each screen keeps its own. The photo is round and the
 * size of the disc.
 */
export function Face({ photoUrl, size = 40, children }) {
  const [broken, setBroken] = useState(null);
  if (photoUrl && broken !== photoUrl) {
    return <img src={photoUrl} alt="" loading="lazy" onError={() => setBroken(photoUrl)}
      className="rounded-full object-cover flex-none" style={{ width: size, height: size, background: "var(--ghost-fill)" }} />;
  }
  return children;
}
