import React from "react";
import lockupLight from "../assets/coach-lockup-light.svg";
import lockupDark from "../assets/coach-lockup-dark.svg";
import { useScheme } from "../hooks/useScheme";

/* The stacked mark and TRAINABILITY® COACH, as the logo kit draws it: the
   cerulean version on a light card, the white one on a dark card: dark as
   the page is (useScheme), which may be chosen rather than the device's. */
export function CoachLockup({ className = "", style }) {
  const scheme = useScheme();
  return <img src={scheme === "dark" ? lockupDark : lockupLight} alt="Trainability Coach" className={className} style={style} />;
}
