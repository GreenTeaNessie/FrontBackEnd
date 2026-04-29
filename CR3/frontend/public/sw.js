const SHELL_CACHE = "estatehub-cr3-shell-v1";
const RUNTIME_CACHE = "estatehub-cr3-runtime-v1";
const API_BASE_URL = "http://localhost:3018/api";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/favicon-16x16.png",
  "/icons/favicon-32x32.png",
  "/icons/favicon-48x48.png",
  "/icons/favicon-64x64.png",
  "/icons/favicon-128x128.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const activeCaches = [SHELL_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !activeCaches.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {
    title: "EstateHub",
    body: "Новое событие",
    reminderId: null,
    notificationType: "property",
    timestamp: Date.now()
  };
  if (event.data) data = event.data.json();

  const isReminder = data.notificationType === "reminder" || Boolean(data.reminderId);

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-48x48.png",
    image: "/icons/icon-512.png",
    tag: isReminder ? `reminder-${data.reminderId}` : `property-${data.propertyId || "event"}`,
    renotify: true,
    requireInteraction: isReminder,
    timestamp: data.timestamp || Date.now(),
    data: {
      reminderId: data.reminderId || null,
      propertyId: data.propertyId || null,
      url: "/"
    },
    actions: [
      { action: "open", title: "Открыть EstateHub" }
    ]
  };

  if (isReminder) {
    options.actions.unshift({ action: "snooze", title: "Отложить на 5 минут" });
  }

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  const reminderId = event.notification.data && event.notification.data.reminderId;

  if (event.action === "snooze" && reminderId) {
    event.waitUntil(
      fetch(`${API_BASE_URL}/snooze?reminderId=${reminderId}`, { method: "POST" })
        .finally(() => event.notification.close())
    );
    return;
  }

  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
