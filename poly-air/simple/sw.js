'use strict';

importScripts('scripts/polyfills/serviceworker-cache-polyfill.js');

var version = 14;
var CACHE_NAME = 'push-demo-v' + version.toString();
var cacheWhitelist = [CACHE_NAME];

var USE_CACHE = false;
var resourceUrls = [
];

var notify = function(title, body, icon) {
  if (self.Notification && self.Notification.permission === 'granted') {
    return new Notification(title, {
      serviceWorker: true,
      body: body,
      icon: icon || 'icons/icon-96.png'
    });
  } else {
    console.error('failed to notify');
    console.error('  notificaton permission set to:',
    self.Notification.permission);
  }
};

self.addEventListener('install', function(e) {
  console.log('oninstall');

  e.waitUntil(
    caches.open(CACHE_NAME).then(
      function(core) {
        return core.addAll(resourceUrls);
      }
    )
    .then(
      caches.keys().then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            return caches.delete(cacheName);
          })
        );
      })
    )
  );
});

self.addEventListener('activate', function(e) {
  console.log('onactivate');

  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(e) {
  console.log('onfetch:', e.request.url);

  e.respondWith(
    caches.match(e.request)
      .then(function(response) {
        if (response) {
          return response;
        }

        return fetch(e.request.clone())
          .then(function(response) {
            console.log('response', response);
            // Check if we received a valid response
            if (!response || response.status !== 200 ||
                response.type !== 'basic') {
              return response;
            }

            if (USE_CACHE) {
              // IMPORTANT: Clone the response. A response is a stream
              // and because we want the browser to consume the response
              // as well as the cache consuming the response, we need
              // to clone it so we have 2 stream.
              var responseToCache = response.clone();

              caches.open(CACHE_NAME)
              .then(function(cache) {
                var cacheRequest = e.request.clone();
                cache.put(cacheRequest, responseToCache);
              });
            }

            return response;
          });
      })
  );
});

self.addEventListener('push', function(evt) {
  console.log('Push Event Received');
  return notify('Title', 'Message');
});
