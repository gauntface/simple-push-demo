"use strict";

importScripts("polyfills/serviceworker-cache-polyfill.js");

var log = console.log.bind(console);
var err = console.error.bind(console);
this.onerror = err;

var notify = function() {
  if (self.Notification && self.Notification.permission == "granted") {
    new self.Notification(arguments[0], {
      icon: "icons/icon-196.png",
      serviceWorker: true
    });
  } else {
    log.apply(arguments)
  }
};

var baseUrl = (new URL("./", this.location.href) + "");

this.addEventListener("install", function(e) {
  e.waitUntil(cachesPolyfill.open("core").then(function(core) {
    var resourceUrls = [
      "",
      // TODO
      /*
      "icons/icon-196.png",
      "icons/icon-72.png",
      "icons/quizapp.png",
      "icons/ginger-cat.png",
      "images/splash.svg",
      "index.html",
      "vulcanized.html",
      */
    ];

    return Promise.all(resourceUrls.map(function(relativeUrl) {
      return core.add(baseUrl + relativeUrl);
    }));
  }));
});

var pendingPush;

this.addEventListener("fetch", function(e) {
  var request = e.request;

  if (this.scope.indexOf(request.origin) == -1) {
    return;
  }

  var requestUrl = new URL(request.url);
  if (requestUrl.pathname == "/push") {
    if (!navigator.onLine) {

    }
    return;
  }

  // TODO: Make sure we aren't caching the posts to /push

  // Basic read-through caching.
  e.respondWith(
    cachesPolyfill.open("core").then(function(core) { return core.match(request); }).then(
      function(response) {
        return response;
      },
      function() {
        // we didn't have it in the cache, so add it to the cache and return it
        return cachesPolyfill.get("core").then(
          function(core) {
            log("runtime caching:", request.url);

            // FIXME(slighltyoff): add should take/return an array
            return core.add(request).then(
              function(response) {
                return response;
              }
            );
          }
        );
      }
    )
  );
});

/*
this.addEventListener("sync", function(e) {
  // notify("Synchronizing scores");
  clients.getServiced().then(function(clients) {
    clients.forEach(function(c) {
      c.postMessage("sync");
    });
 }, err);
});
*/

var lastPushNotification;

this.addEventListener("push", function(e) {
  console.log(e.data);
  var message = JSON.parse(e.data);
  // FIXME(slightlyoff): filter these! Don't want our own winning notices.
  if (message.title) {
    if (lastPushNotification) {
      lastPushNotification.close();
    }
    lastPushNotification = new Notification(message.title, {
      body: message.body || "",
      icon: "icons/ginger-cat.png",
      serviceWorker: true
    });
  }
});

this.addEventListener("notificationclick", function(e) {
  if (lastPushNotification) {
    // FIXME: figure out some way to focus the app!
    lastPushNotification.close();
    lastPushNotification = null;
  }
});

this.addEventListener("notificationclose", function(e) {
  log("notificationclose");
  for (var x in e) { log(x); log(e[x]); }
});
