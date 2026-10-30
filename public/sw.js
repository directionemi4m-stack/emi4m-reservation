// Service worker de l'appli EMI4M : affiche les notifications (rappels des bulletins CHAM…)
// et ouvre la bonne page quand on les touche. Aucun cache hors ligne.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "EMI4M", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/accueil" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/accueil", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.startsWith(self.location.origin) && "focus" in fenetre) {
          if ("navigate" in fenetre) fenetre.navigate(url);
          return fenetre.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
