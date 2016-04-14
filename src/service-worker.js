'use strict';

/* eslint-env serviceworker */

self.addEventListener('push', function(event) {
  console.log('ServiceWorker: Received a push message');
  var notificationOptions = {
    body: 'Thanks for sending this push msg.',
    icon: '/images/icon-192x192.png',
    tag: 'simple-push-demo-notification',
    data: {
      url: 'https://developers.google.com/web/fundamentals/getting-started/push-notifications/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('Hello', notificationOptions)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (!event.nofication.data) {
    return;
  }

  if (event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
