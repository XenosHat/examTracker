// ═══════════════════════════════════════════════════════════
//  Pomodoro Service Worker
//  - Does NOT keep time itself (SWs can be suspended anytime).
//  - The main app is the single source of truth for the timer and
//    posts messages here whenever it wants the notification updated.
//  - "Live" notification uses a fixed tag so each update REPLACES
//    the previous one instead of stacking new notifications.
//  - "Complete" notification uses a different (unique) tag so it
//    never gets clobbered by / doesn't clobber the live one.
// ═══════════════════════════════════════════════════════════

const LIVE_TAG = 'pomodoro-timer';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function formatMMSS(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'pomodoro-update') {
    // Live, periodically-refreshed notification. Same tag => replaces in place.
    const timeStr = formatMMSS(data.remainingMs);
    const icon = data.mode === 'focus' ? '🍅' : '☕';
    self.registration.showNotification(`${icon} ${data.modeLabel || data.mode} — ${timeStr} remaining`, {
      tag: 'Pomodoro is running…',
      renotify: false,
      silent: true,
      body: LIVE_TAG,
      icon: 'https://files.catbox.moe/0pvkt0.png',
      badge: 'https://files.catbox.moe/0pvkt0.png',
      requireInteraction: false,
      data: { kind: 'live' }
    });
  }

  else if (data.type === 'pomodoro-complete') {
    // Separate one-off notification — different tag so it does not
    // replace (or get replaced by) the live timer notification.
    const label = data.modeLabel || data.mode;
    self.registration.showNotification(`${label} session completed!`, {
      tag: 'pomodoro-complete-' + Date.now(),
      renotify: true,
      silent: false,
      body: data.mode === 'focus' ? 'Nice focus sprint — time for a break.' : 'Break’s over — ready for another focus round?',
      icon: 'https://files.catbox.moe/0pvkt0.png',
      badge: 'https://files.catbox.moe/0pvkt0.png',
      requireInteraction: false,
      data: { kind: 'complete' }
    });
    // Once a session completes, the "live" notification for the finished
    // session is no longer relevant — close it (a fresh one will appear
    // once the next session's updates start coming in).
    self.registration.getNotifications({ tag: LIVE_TAG }).then(list => {
      list.forEach(n => n.close());
    });
  }

  else if (data.type === 'pomodoro-clear') {
    // Timer paused / stopped / reset — stop showing the live notification.
    self.registration.getNotifications({ tag: LIVE_TAG }).then(list => {
      list.forEach(n => n.close());
    });
  }
});

// Focus (or open) the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
