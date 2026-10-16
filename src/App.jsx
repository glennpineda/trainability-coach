import React from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginScreen } from "./auth/LoginScreen";
import { HomeScreen } from "./home/HomeScreen";

export default function App() {
  const { user, offline, login, logout } = useAuth();

  /* The first answer from /auth/me. Brief, and on the sign-in screen's own
     color, so nothing flashes between here and whichever screen comes next. */
  if (user === undefined) {
    return <div className="min-h-dvh" style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 45%, #172A3A 100%)" }} />;
  }
  if (!user) return <LoginScreen onLogin={login} offline={offline} />;
  return <HomeScreen user={user} onLogout={logout} />;
}
