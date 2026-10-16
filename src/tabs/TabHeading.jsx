import React from "react";

/* A screen's name at its top, as Studio sets them: capitals, bold. */
export function TabHeading({ children }) {
  return <h1 className="text-2xl font-bold uppercase tracking-wide pt-6 pb-4">{children}</h1>;
}
