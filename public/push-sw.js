/* global self, URL */
/*
 * Notifications on this device (server/push.js; Glenn, 18 Oct 2026), Studio's
 * public/push-sw.js. It does nothing but notifications: no fetch handler, no
 * cache, so an update is never held back by a worker serving yesterday's page.
 * Registered only when somebody turns notifications on, never on page load.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

/* `{ title, body, url, tag }` from the server. A tag replaces the one before
   it with the same tag: a run of messages from one client is one entry. */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Coach", {
    body: data.body || "",
    tag: data.tag || undefined,
    icon: "/coach-app-icon-192.png?v=5",
    badge: "/coach-app-icon-192.png?v=5",
    data: { url: data.url || "/" },
  }));
});

/* A tap opens where it is about. An open Coach window is brought forward and
   told where to go (Studio's way: `navigate` only works on a window this
   worker controls, and Safari has none), and the app opens the screen itself
   (Shell.jsx, `push-open`). With no window open, a new one opens there. */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const same = open.find(w => new URL(w.url).origin === url.origin);
    if (same) {
      try { await same.focus(); } catch { /* told where to go all the same */ }
      same.postMessage({ type: "push-open", url: url.pathname + url.search });
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});
