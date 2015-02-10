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

  return new Notification(title, {
    body: message,
    icon: icon || 'images/touch/chrome-touch-icon-192x192.png'
  });
});

self.addEventListener('pushsubscriptionlost', function(e) {
  console.log(e);
  
});
