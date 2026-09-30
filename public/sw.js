// EduTrack Service Worker for Web Push & PWA Offline Support
const SW_VERSION = 'edutrack-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications from server
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: event.data.text() };
    }
  }

  const title = data.title || '🔔 EduTrack Schedule Reminder';
  const options = {
    body: data.body || 'You have an upcoming class or timetable event.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'edutrack-schedule-alert',
    renotify: true,
    data: data.data || { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click: focus app window or open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle direct message from client app to display a notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [200, 100, 200],
      tag: 'edutrack-schedule-alert',
      renotify: true,
      ...options
    };
    event.waitUntil(
      self.registration.showNotification(title || '🔔 EduTrack Notification', finalOptions)
    );
  }
});
