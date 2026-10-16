import React, { useState } from "react";

const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("") || "?";

/* Somebody's photo, or their initials on a cerulean disc when there is none or
   it will not load. */
export function Avatar({ user, size = 32, ring }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size, ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : null) };
  if (user.photoUrl && !broken) {
    return <img src={user.photoUrl} alt="" onError={() => setBroken(true)} className="rounded-full object-cover flex-none" style={style} />;
  }
  return (
    <span className="rounded-full flex-none flex items-center justify-center font-semibold text-white"
      style={{ ...style, background: "var(--cerulean)", fontSize: size * 0.4 }} aria-hidden="true">
      {initials(user.name)}
    </span>
  );
}
