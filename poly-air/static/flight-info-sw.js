"use strict";

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
    title = 'Gate changed!';
    message = 'New gate is ' + data[1];

    localforage.getItem('track').then(function(flight) {
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

});
