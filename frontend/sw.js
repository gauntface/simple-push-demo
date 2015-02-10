'use strict';

self.addEventListener('install', function(e) {
  console.log('oninstall');
});

self.addEventListener('activate', function(e) {
  console.log('onactivate');
});

self.addEventListener('fetch', function(e) {
  console.log('onfetch:', e);
});

self.addEventListener('push', function(e) {
  console.log('Push Event Received');

  if (!(self.Notification && self.Notification.permission === 'granted')) {
    console.error('Failed to display notification - not supported');

    // Perhaps we don't have permission to show a notification
    if (self.Notification) {
      console.error('  notificaton permission set to:',
        self.Notification.permission);
    }
    return;
  }

  var data = {};
  if (e.data) {
    data = e.data.json();
  }
  var title = data.title || 'No Payload with Message';
  var message = data.message || 'This will change in future versions of Chrome.';
  var icon = 'images/touch/chrome-touch-icon-192x192.png';

  var notification = new Notification(title, {
    body: message,
    icon: icon,
    tag: 'simple-push-demo-notification'
  });

  // This should be swapped out by the notificationclick event
  notification.addEventListener('click', function() {
    if (clients.openWindow) {
      console.log('Notification clicked, trying to call clients.openWindow');
      clients.openWindow('https://gauntface.com/blog/2014/12/15/push-notifications-service-worker');
    } else {
      console.log('Notification clicked, but clients.openWindow is not currently supported');
    }
  });

  return notification;
});

self.addEventListener('pushsubscriptionlost', function(e) {
  console.log(e);
});

self.addEventListener('notificationclick', function(e) {
  console.log('Notification click yo.');

  if (clients.openWindow) {
    clients.openWindow('https://gauntface.com/blog/2014/12/15/push-notifications-service-worker');
  } else {
    console.log('Notification clicked, but clients.openWindow is not currently supported');
  }
});
