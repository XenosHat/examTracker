// ═══════════════════════════════════════════════════════════════
//  Progress Tracker — Pomodoro Notification Service Worker
// ═══════════════════════════════════════════════════════════════
// This file must be hosted in the SAME directory as index.html
// (e.g. https://yoursite.com/sw.js), because service workers can
// only control pages within their own scope/origin.
//
// Why this exists: on Android Chrome, `new Notification(...)` from
// a plain page context is not supported — notifications must be
// shown via a registered ServiceWorkerRegistration's showNotification().
// The main app (index.html) registers this worker and then calls
// `registration.showNotification(...)` directly from the page any
// time it needs to post or update a notification — this file itself
// doesn't need to do much beyond installing/activating and handling
// notification clicks.
//
// Tag-based update behaviour (per Pomodoro spec):
//  - Progress updates reuse { tag:'pomodoro-timer', renotify:false }
//    so the OS updates the existing notification in place instead of
//    stacking new ones.
//  - Phase-complete alerts use { tag:'pomodoro-timer', renotify:true }
//    so the user gets a fresh alert/sound/vibration when Focus or
//    Break actually ends.

const SW_VERSION = 'pomo-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Clicking a notification focuses (or opens) the app and closes the notification.
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./');
      }
    })
  );
});

// Optional: support real push notifications in the future (server-driven).
// Not currently used by the Pomodoro feature, which drives notifications
// directly from the page via registration.showNotification(), but kept
// here so the worker degrades gracefully if push ever gets wired up.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* ignore */ }
  const title = data.title || 'Pomodoro';
  const options = Object.assign({
    body: data.body || '',
    tag: 'pomodoro-timer',
    icon: 'https://files.catbox.moe/0pvkt0.png',
    badge: 'https://files.catbox.moe/0pvkt0.png'
  }, data.options || {});
  event.waitUntil(self.registration.showNotification(title, options));
});
