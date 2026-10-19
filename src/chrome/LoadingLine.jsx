import React from "react";
import { Loader2 } from "lucide-react";

/**
 * The one line that says something is being read: a small spinner and the
 * words, in iron (Studio's primitives.jsx, LoadingLine; Run 1, D-12). There
 * were about twenty plain "Loading…" lines. A busy button keeps its own words.
 */
export function LoadingLine({ children = "Loading…", className = "" }) {
  return (
    <div role="status" className={`flex items-center gap-2 text-sm ${className}`} style={{ color: "var(--iron)" }}>
      <Loader2 size={14} className="animate-spin flex-none" aria-hidden="true" />
      {children}
    </div>
  );
}

/**
 * "Nothing here", where a whole list or view is empty: one centred line in
 * iron (Studio's EmptyState). A note inside a card that one part of it is
 * empty stays a plain text-sm line in iron; this is for the list itself.
 */
export function EmptyState({ children }) {
  return <div className="text-base text-center py-6" style={{ color: "var(--iron)" }}>{children}</div>;
}
