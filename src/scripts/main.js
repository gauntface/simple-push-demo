/* eslint-env browser */
import AppController from './app-controller.js';

window.onload = function() {
  const appController = new AppController();
  appController.ready
  .then(() => {
    appController.registerServiceWorker();
  });
};
