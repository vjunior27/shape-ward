// ─── Firebase Cloud Messaging Service Worker ──────────────────────────────────
// SETUP: Copy your Firebase config values from your .env file below.
// These CANNOT use import.meta.env (service workers are not bundled by Vite).
// ─────────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// TODO: Replace placeholder values with your actual Firebase config
// (same values as your VITE_FIREBASE_* env variables)
firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY__ || 'REPLACE_WITH_VITE_FIREBASE_API_KEY',
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || 'REPLACE_WITH_VITE_FIREBASE_AUTH_DOMAIN',
  projectId: self.__FIREBASE_PROJECT_ID__ || 'REPLACE_WITH_VITE_FIREBASE_PROJECT_ID',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || 'REPLACE_WITH_VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || 'REPLACE_WITH_VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: self.__FIREBASE_APP_ID__ || 'REPLACE_WITH_VITE_FIREBASE_APP_ID',
});

const messaging = firebase.messaging();

// Handle background push notifications (app not focused)
messaging.onBackgroundMessage((payload) => {
  const { title = 'Shape Ward', body = '', icon = '/icon-192.png' } = payload.notification ?? {};

  self.registration.showNotification(title, {
    body,
    icon,
    badge: icon,
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  });
});

// Navigate to app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        return windowClients[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
