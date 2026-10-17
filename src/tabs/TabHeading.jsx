import React from "react";

/* A screen's name at its top, as Studio sets them: capitals, Roboto medium
   at 20px (its iw-display text-2xl). */
export function TabHeading({ children }) {
  return <h1 className="cx-display text-2xl uppercase pt-6 pb-4">{children}</h1>;
}
