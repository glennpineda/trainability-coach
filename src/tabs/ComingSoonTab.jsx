import React from "react";
import { TabHeading } from "./TabHeading";
import { ComingSoonCard } from "./ComingSoonCard";

/* A tab for a part of Coach not built yet: its name, and what it will be for. */
export function ComingSoonTab({ section }) {
  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>{section.title}</TabHeading>
      <ComingSoonCard section={section} />
      <p className="text-sm mt-4 px-1" style={{ color: "var(--iron)" }}>
        This part of Coach is being built. It will appear here when it&apos;s ready.
      </p>
    </div>
  );
}
