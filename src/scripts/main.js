/* global AppController */
/* eslint-env browser */
window.onload = function() {
  const appController = new AppController();
  appController.ready
  .then(() => {
    document.body.dataset.simplePushDemoLoaded = true;

    const host = "gauntface.github.io";
    if (
      window.location.host === host &&
      window.location.protocol !== "https:") {
      window.location.protocol = "https";
    }

    appController.registerServiceWorker();
  });
};
