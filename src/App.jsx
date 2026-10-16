import React, { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { usePath } from "./hooks/usePath";
import { useClients } from "./hooks/useClients";
import { LoginScreen } from "./auth/LoginScreen";
import { HomeScreen } from "./home/HomeScreen";
import { ClientsScreen } from "./clients/ClientsScreen";

export default function App() {
  const { user, offline, login, logout, signedOut } = useAuth();

  /* The first answer from /auth/me. Brief, and on the sign-in screen's own
     color, so nothing flashes between here and whichever screen comes next. */
  if (user === undefined) {
    return <div className="min-h-[100dvh]" style={{ background: "linear-gradient(150deg, #007BA7 0%, #0B4F6E 45%, #172A3A 100%)" }} />;
  }
  if (!user) return <LoginScreen onLogin={login} offline={offline} />;
  return <SignedIn user={user} onLogout={logout} onSignedOut={signedOut} />;
}

/* The screens behind sign-in. The client list is held here, so home can count
   it and the Clients screen opens on it without waiting, and asked for again
   on every change of screen so it never sits stale. */
function SignedIn({ user, onLogout, onSignedOut }) {
  const [path, go] = usePath();
  const clients = useClients(onSignedOut);
  const { refresh } = clients;
  useEffect(() => refresh(), [path, refresh]);
  if (path === "/clients") {
    return <ClientsScreen user={user} onLogout={onLogout} onHome={() => go("/")} {...clients} />;
  }
  return <HomeScreen user={user} onLogout={onLogout} onOpen={go} clients={clients.clients} />;
}
