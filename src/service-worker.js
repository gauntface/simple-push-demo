'use strict';

/* eslint-env browser, serviceworker */

importScripts('./scripts/analytics.js');

self.analytics.trackingId = 'UA-77119321-2';

self.addEventListener('push', function(event) {
  var notificationOptions = {
    body: 'Thanks for sending this push msg.',
    icon: './images/icon-192x192.png',
    tag: 'simple-push-demo-notification',
    data: {
      url: 'https://developers.google.com/web/fundamentals/getting-started/push-notifications/'
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification('Hello', notificationOptions),
      self.analytics.trackEvent('push-received')
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  let clickResponsePromise = Promise.resolve();
  if (event.notification.data && event.notification.data.url) {
    clickResponsePromise = clients.openWindow(event.notification.data.url);
  }

  event.waitUntil(
    Promise.all([
      clickResponsePromise,
      self.analytics.trackEvent('notification-click')
    ])
  );
});
