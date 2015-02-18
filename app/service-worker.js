'use strict';

importScripts('/scripts/indexdbwrapper.js');

var YAHOO_WEATHER_API_ENDPOINT = 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22london%2C%20uk%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
var KEY_VALUE_STORE_NAME = 'key-value-store';

var idb;

// avoid opening idb until first call
function getIdb() {
  if (!idb) {
    idb = new IndexDBWrapper('key-value-store', 1, function(db) {
      db.createObjectStore(KEY_VALUE_STORE_NAME);
    });
  }
  return idb;
}

self.addEventListener('push', function(event) {
  console.log('Received a push message', event);

  // Since this is no payload data with the first version
  // of Push notifications, here we'll grab some data from
  // an API and use it to populate a notification
  event.waitUntil(
    fetch(YAHOO_WEATHER_API_ENDPOINT).then(function(response) {
      if (response.status !== 200) {
        console.log('Looks like there was a problem. Status Code: ' + response.status);
        return;
      }

      // Examine the text in the response
      return response.json().then(function(data) {
        console.log('Data = ', JSON.stringify(data));
        if (data.query.count === 0) {
          return;
        }
        
        var title = 'What\'s the weather like in London?';
        var message = 'Well, we have ' +
          data.query.results.channel.item.condition.text.toLowerCase() +
          ' at the moment';
        var icon = data.query.results.channel.image.url || 
          'images/touch/chrome-touch-icon-192x192.png';
        var notificationTag = 'simple-push-demo-notification';

        // Add this to the data of the notification
        var urlToOpen = data.query.results.channel.link;
        
        // Since Chrome doesn't support data at the moment
        // Store the URL in IndexDB
        getIdb().put(KEY_VALUE_STORE_NAME, notificationTag, urlToOpen);

        return self.registration.showNotification(title, {
          body: message,
          icon: icon,
          tag: notificationTag,
          data: {
            url: urlToOpen
          }
        });
      });
    }).catch(function(err) {
      console.error('Unable to retrieve data', err);
    })
  );
});

self.addEventListener('pushsubscriptionlost', function(event) {
  console.log('Push subscription lost' + event);
});

self.addEventListener('notificationclick', function(event) {
  console.log('On notification click: ', event);

  if (event.notification.data) {
    // At the moment you cannot open third party URL's, a simple trick
    // is to redirect to the desired URL from a URL on your domain
    var redirectUrl = self.location.origin + '/redirect.html?redirect=' +
      event.notification.data.url;
    clients.openWindow(redirectUrl);
  } else {
    event.waitUntil(getIdb().get(KEY_VALUE_STORE_NAME, event.notification.tag).then(function(url) {
      console.log('url = ' + url);
      // At the moment you cannot open third party URL's, a simple trick
      // is to redirect to the desired URL from a URL on your domain
      var redirectUrl = self.location.origin + '/redirect.html?redirect=' +
        url;
      return clients.openWindow(redirectUrl);
    }));
  }
});
