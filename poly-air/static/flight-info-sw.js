"use strict";

var baseUrl = new URL("/", this.location.href) + "";

this.addEventListener("install", function(evt) {
  console.log("SW oninstall");
});

this.addEventListener("activate", function(evt) {
  console.log("SW onactivate");
});

this.addEventListener("push", function(evt) {
  console.log(evt.data);
  new Notification("push!", {
    serviceWorker: true,
    body: 'push message',
    icon: 'icons/icon-96.png'
  });
});
