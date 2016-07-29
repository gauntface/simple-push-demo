"use strict";

/* global AppController */
/* eslint-env browser */
window.onload = function () {
  var appController = new AppController();
  appController.ready.then(function () {
    document.body.dataset.simplePushDemoLoaded = true;

    var host = "gauntface.github.io";
    if (window.location.host === host && window.location.protocol !== "https:") {
      window.location.protocol = "https";
    }

    appController.registerServiceWorker();
  });
};