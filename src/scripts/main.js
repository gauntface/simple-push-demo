/* global AppController */
/* eslint-env browser */
window.onload = function() {
  const appController = new AppController();
  appController.ready
  .then(() => {
    document.body.dataset.simplePushDemoLoaded = true;

    if (
      window.location.protocol.indexOf('https') === -1 &&
      window.location.hostname !== 'localhost') {
      appController.showErrorMessage(
        'You Need to be HTTPs',
        'Please check out the ' +
        '<a href="https://gauntface.github.io/simple-push-demo/">HTTPs ' +
        'version of this page here</a>'
      );
      return;
    }

    appController.registerServiceWorker();
  });
};
