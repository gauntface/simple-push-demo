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

    // Prove that we did actually get a push
    var data = e.data.json();
    console.log('Title = ' + data.title);
    console.log('Message = ' + data.message);

    // Perhaps we don't have permission to show a notification
    if (self.Notification) {
      console.error('  notificaton permission set to:',
        self.Notification.permission);
    }
    return;
  }

  var data = e.data.json();
  var title = data.title || 'Why you no title?';
  var message = data.message || 'Hello World!....I guess.';
  var icon = 'images/touch/chrome-touch-icon-192x192.png';

  return new Notification(title, {
    serviceWorker: true,
    body: message,
    icon: icon || 'images/touch/chrome-touch-icon-192x192.png'
  });
});
