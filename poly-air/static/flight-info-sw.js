"use strict";

importScripts("polyfills/serviceworker-cache-polyfill.js");
importScripts("lib/localforage.js");

var version = 1;
var coreCacheName = "poly-air-" + version.toString();
var baseUrl = new URL("/", this.location.href) + "";

var log = console.log.bind(console);
var err = console.error.bind(console);
this.onerror = err;


this.addEventListener("install", function(e) {

  e.waitUntil(cachesPolyfill.open(coreCacheName).then(function(core) {
    var resourceUrls = [
      "",
      /*
      "lib/localforage.js",
      "components/webcomponentsjs/webcomponents.min.js",
      "theme.css",
      "components/font-roboto/roboto.html",
      "components/core-icons/core-icons.html",
      "components/core-icons/av-icons.html",
      "components/core-icons/social-icons.html",
      "components/core-icons/maps-icons.html",
      "components/core-drawer-panel/core-drawer-panel.html",
      "components/core-animated-pages/core-animated-pages.html",
      "components/core-animated-pages/transitions/slide-from-right.html",
      "components/core-scaffold/core-scaffold.html",
      "components/paper-button/paper-button.html",
      "components/paper-icon-button/paper-icon-button.html",
      "components/paper-checkbox/paper-checkbox.html",
      "components/paper-fab/paper-fab.html",
      "components/paper-input/paper-input.html",
      "components/paper-item/paper-item.html",
      "components/paper-toast/paper-toast.html",
      "flight-panel.html",
      "components/core-icon/core-icon.html",
      "components/core-iconset-svg/core-iconset-svg.html",
      "components/core-media-query/core-media-query.html",
      "components/core-selector/core-selector.html",
      "components/core-animated-pages/transitions/hero-transition.html",
      "components/core-animated-pages/transitions/cross-fade.html",
      "components/core-animated-pages/transitions/core-transition-pages.html",
      "components/core-toolbar/core-toolbar.html",
      "components/core-header-panel/core-header-panel.html",
      "components/core-icon-button/core-icon-button.html",
      "components/polymer/polymer.html",
      "components/paper-button/paper-button-base.html",
      "components/paper-ripple/paper-ripple.html",
      "components/core-input/core-input.html",
      "components/core-style/core-style.html",
      "components/paper-item/paper-item.css",
      "components/paper-shadow/paper-shadow.html",
      "components/paper-radio-button/paper-radio-button.html",
      "components/core-overlay/core-overlay.html",
      "components/core-transition/core-transition-css.html",
      "components/core-iconset/core-iconset.html",
      "components/core-icon/core-icon.css",
      "components/core-selection/core-selection.html",
      "components/core-transition/core-transition.html",
      "components/polymer/layout.html",
      "components/polymer/polymer.js",
      "components/paper-focusable/paper-focusable.html",
      "components/core-a11y-keys/core-a11y-keys.html",
      "components/core-overlay/core-key-helper.html",
      "components/core-overlay/core-overlay-layer.html",
      "components/core-meta/core-meta.html",
      "components/core-drawer-panel/core-drawer-panel.css",
      "components/core-animated-pages/core-animated-pages.css",
      "components/core-toolbar/core-toolbar.css",
      "components/core-header-panel/core-header-panel.css",
      "components/core-icon-button/core-icon-button.css",
      "components/paper-shadow/paper-shadow.css",
      "components/paper-radio-button/paper-radio-button.css",
      "components/paper-checkbox/paper-checkbox.css",
      "components/core-input/core-input.css",
      "components/paper-input/paper-input.css",
      "components/core-transition/core-transition-overlay.css",
      "components/paper-toast/paper-toast.css",
      "components/core-icon/core-icon.html",
      "components/core-iconset-svg/core-iconset-svg.html",
      "components/core-media-query/core-media-query.html",
      "components/core-selector/core-selector.html",
      "components/core-animated-pages/transitions/hero-transition.html",
      "components/core-animated-pages/transitions/cross-fade.html",
      "components/core-animated-pages/transitions/core-transition-pages.html",
      "components/core-toolbar/core-toolbar.html",
      "components/core-header-panel/core-header-panel.html",
      "components/core-icon-button/core-icon-button.html",
      "components/polymer/polymer.html",
      "components/paper-ripple/paper-ripple.html",
      "components/paper-shadow/paper-shadow.html",
      "components/paper-button/paper-button-base.html",
      "components/paper-radio-button/paper-radio-button.html",
      "components/core-input/core-input.html",
      "components/core-style/core-style.html",
      "components/paper-item/paper-item.css",
      "components/core-overlay/core-overlay.html",
      "components/core-transition/core-transition-css.html",
      "components/more-routing/routing.html",
      "components/more-routing/driver/hash.html",
      "components/more-routing/driver/mock.html",
      "components/more-routing/driver/path.html",
      "components/more-switch/template-switch.html",
      "icons/icon.svg",
      "icons/icon-96.png",
      "favicon.ico",
      */
      // TODO: figure out a local copy of RobotoDraft
    ];

    return core.addAll(resourceUrls.map(function(relativeUrl) {
      return (baseUrl + relativeUrl);
    }));
  }));
});

this.addEventListener("activate", function(evt) {
  log("onactivate");
});

this.addEventListener("fetch", function(e) {
  return;

  var request = e.request;
  var coreCache = null;

  if (request.url.indexOf(this.scope) != 0) {
    log("x-origin requests can't be cached using the polyfill:", request.url);
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
    cachesPolyfill.open(coreCacheName).
      then(function(core) {
        coreCache = core;
        return coreCache.match(request);
      }).
      then(function(response) {
        if (response) {
          return response;
        }

        // we didn't have it in the cache, so add it to the cache and return it
        log("runtime caching:", request.url);

        return coreCache.add(request).then(
          function(response) { return coreCache.match(request); }
        );
      }, err)
  );
});


this.addEventListener("push", function(evt) {
  var data = evt.data.split(':');
  console.log(data);
  var title = 'No Title';
  var message = 'No Message';

  if (data[0] == 'gate') {
    localforage.getItem('track').then(function(flight) {
      title = 'Gate changed!';
      message = flight.companyShort + flight.flightNumber + ' gate is ' + data[1];

      flight.departGate = data[1];
      localforage.setItem('track', flight).then(function() {
        new Notification(title, {
          serviceWorker: true,
          body: message,
          icon: 'icons/icon-96.png'
        });
      });
    });
  }

  if (data[0] == 'delay') {
    localforage.getItem('track').then(function(flight) {
      title = 'Flight delay!';
      message = flight.companyShort + flight.flightNumber + ' has a ' + data[1] + ' minutes delay';

      flight.status = 'Delay of ' + data[1] + ' minutes';
      localforage.setItem('track', flight).then(function() {
        new Notification(title, {
          serviceWorker: true,
          body: message,
          icon: 'icons/icon-96.png'
        });
      });
    });
  }
});
