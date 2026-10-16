import React from "react";
import lockupLight from "../assets/coach-lockup-light.svg";
import lockupDark from "../assets/coach-lockup-dark.svg";

/* The stacked mark and TRAINABILITY® COACH, as the logo kit draws it: the
   cerulean version on a light card, the white one on a dark card. */
export function CoachLockup({ className = "", style }) {
  return (
    <picture>
      <source srcSet={lockupDark} media="(prefers-color-scheme: dark)" />
      <img src={lockupLight} alt="Trainability Coach" className={className} style={style} />
    </picture>
  );
}
