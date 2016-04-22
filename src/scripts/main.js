/* eslint-env browser */
import AppController from './app-controller.js';

window.onload = function() {
  const appController = new AppController();
  appController.ready
  .then(() => {
    document.body.dataset.simplePushDemoLoaded = true;
    appController.registerServiceWorker();
  });
};
