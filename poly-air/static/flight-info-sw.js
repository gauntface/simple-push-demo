"use strict";

importScripts("polyfills/serviceworker-cache-polyfill.js");
importScripts("lib/localforage.js");

var baseUrl = new URL("/", this.location.href) + "";

this.addEventListener("install", function(evt) {
  console.log("SW oninstall");
});

this.addEventListener("activate", function(evt) {
  console.log("SW onactivate");
});

this.addEventListener("push", function(evt) {
  var data = evt.data.split(':');
  var title = 'No Title';
  var message = 'No Message';

  if (data[0] == 'gate') {
    localforage.getItem('track').then(function(flight) {
      title = 'Gate changed!';
      message = flight.companyShort + flight.flightNumber + ' gate is ' + data[1];

      flight.depart.gate = data[1];
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
