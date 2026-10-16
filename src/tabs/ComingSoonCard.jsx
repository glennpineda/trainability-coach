import React from "react";

export function ComingSoonCard({ section, onOpen }) {
  const { icon: Icon, title, body } = section;
  const Tag = onOpen ? "button" : "div";
  return (
    <Tag type={onOpen ? "button" : undefined} onClick={onOpen}
      className={`cx-card p-5 flex gap-4 w-full text-left${onOpen ? " cx-card-press" : ""}`}>
      <span className="flex-none w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-soft)" }}>
        <Icon size={22} style={{ color: "var(--accent)" }} aria-hidden="true" />
      </span>
      <span className="min-w-0 block">
        <span className="flex items-center gap-2">
          <span className="font-semibold text-base">{title}</span>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--ghost-fill)", color: "var(--iron)" }}>Coming soon</span>
        </span>
        <span className="block text-sm mt-1" style={{ color: "var(--iron)" }}>{body}</span>
      </span>
    </Tag>
  );
}
