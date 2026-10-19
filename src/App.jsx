import React, { useEffect } from "react";
import { applyLook, lookOf, rememberLook } from "./lib/look";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { Shell } from "./Shell";
import { PrintProgram } from "./programs/PrintProgram";
import { ForcedPasswordScreen } from "./auth/ForcedPasswordScreen";

export default function App() {
  const { user, offline, login, signup, logout, signedOut, passwordChosen, chooseLook, chooseWide } = useAuth();
  /* Their Accessibility on the page, and kept for the next time this browser
     opens it (index.html puts it on first). Nobody signed in: the device's
     own. Untouched while the first answer is on its way, since index.html
     has already put on the last one. */
  const look = lookOf(user);
  const lookKey = JSON.stringify(look);
  useEffect(() => {
    if (user === undefined) return;
    applyLook(look);
    rememberLook(look);
  }, [user === undefined, lookKey]);

  /* The first answer from /auth/me. Brief, and on the sign-in screen's own
     color, so nothing flashes between here and whichever screen comes next. */
  if (user === undefined) {
    return <div className="min-h-dvh" style={{ background: "var(--ground)" }} />;
  }
  if (!user) return <LoginScreen onLogin={login} onSignup={signup} offline={offline} />;
  /* Signed in with a temporary password: their own first, as Studio does. */
  if (user.mustChangePassword) return <ForcedPasswordScreen user={user} onDone={passwordChosen} onLogout={logout} />;
  /* A program printed for the client, in its own tab (programs/PrintProgram.jsx). */
  const print = /^\/print\/program\/([a-z0-9]+)$/.exec(window.location.pathname);
  if (print) return <PrintProgram id={print[1]} />;
  /* A program as it was sent in a message (MessagesTab), printed the same way. */
  const sent = /^\/print\/sent\/([a-z0-9]+)$/.exec(window.location.pathname);
  if (sent) return <PrintProgram sent={sent[1]} />;
  return <Shell user={user} onLogout={logout} onSignedOut={signedOut} chooseLook={chooseLook} chooseWide={chooseWide} />;
}
