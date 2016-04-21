/* eslint-env browser */

import PushClient from './push-client.js';

export default class AppController {
  constructor() {
    // Define a different server URL here if desire.
    this._PUSH_SERVER_URL = '';
    this._API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');

    // Below this comment is code to initialise a material design lite view.
    const toggleSwitch = document.querySelector('.js-push-toggle-switch');
    if (toggleSwitch.classList.contains('is-upgraded')) {
      this.ready = Promise.resolve();
      this._uiInitialised(toggleSwitch.MaterialSwitch);
    } else {
      this.ready = new Promise(resolve => {
        const mdlUpgradeCb = () => {
          if (!toggleSwitch.classList.contains('is-upgraded')) {
            return;
          }

          this._uiInitialised(toggleSwitch.MaterialSwitch);
          document.removeEventListener(mdlUpgradeCb);

          resolve();
        };

        // This is to wait for MDL initialising
        document.addEventListener('mdl-componentupgraded', mdlUpgradeCb);
      });
    }
  }

  _uiInitialised(toggleSwitch) {
    this._stateChangeListener = this._stateChangeListener.bind(this);
    this._subscriptionUpdate = this._subscriptionUpdate.bind(this);

    this._toggleSwitch = toggleSwitch;
    this._pushClient = new PushClient(
      this._stateChangeListener,
      this._subscriptionUpdate
    );

    document.querySelector('.js-push-toggle-switch > input')
    .addEventListener('click', event => {
      // Inverted because clicking will change the checked state by
      // the time we get here
      if (event.target.checked) {
        this._pushClient.subscribeDevice();
      } else {
        this._pushClient.unsubscribeDevice();
      }
    });
  }

  registerServiceWorker() {
    // Check that service workers are supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
      .catch(() => {
        this.showErrorMessage(
          'Unable to Register SW',
          'Sorry this demo requires a service worker to work and it ' +
          'was didn\'t seem to install - sorry :('
        );
      });
    } else {
      this.showErrorMessage(
        'Service Worker Not Supported',
        'Sorry this demo requires service worker support in your browser. ' +
        'Please try this demo in Chrome or Firefox Nightly.'
      );
    }
  }

  _stateChangeListener(state, data) {
    // console.log(state);
    if (typeof state.interactive !== 'undefined') {
      if (state.interactive) {
        this._toggleSwitch.enable();
      } else {
        this._toggleSwitch.disable();
      }
    }

    if (typeof state.pushEnabled !== 'undefined') {
      if (state.pushEnabled) {
        this._toggleSwitch.on();
      } else {
        this._toggleSwitch.off();
      }
    }

    switch (state.id) {
      case 'ERROR':
        this.showErrorMessage(
          'Ooops a Problem Occurred',
          data
        );
        break;
      default:
        break;
    }
  }

  _subscriptionUpdate(subscription) {
    if (!subscription) {
      // Remove any subscription from your servers if you have
      // set it up.
      this._sendPushOptions.style.opacity = 0;
      return;
    }

    var curlCommand;
    if (subscription.endpoint.indexOf(
      'https://android.googleapis.com/gcm/send') === 0) {
      curlCommand = this.produceGCMProprietaryCURLCommand(subscription);
    } else {
      curlCommand = this.produceWebPushProtocolCURLCommand(subscription);
    }

    var curlCodeElement = document.querySelector('.js-curl-code');
    curlCodeElement.innerHTML = curlCommand;

    // Code to handle the XHR
    var sendPushViaXHRButton = document.querySelector('.js-send-push-button');
    sendPushViaXHRButton.addEventListener('click', () => {
      this.sendPushMessage(subscription);
    });

    // Display the UI
    this._sendPushOptions.style.opacity = 1;
  }

  sendPushMessage(subscription) {
    if (subscription.endpoint.indexOf(
      'https://android.googleapis.com/gcm/send') === 0) {
      this.useGCMProtocol(subscription);
    } else {
      this.useWebPushProtocol(subscription);
    }
  }

  useGCMProtocol(subscription) {
    console.log('Sending XHR to GCM Protocol endpoint');

    var headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', 'key=' + this._API_KEY);

    var endpointSections = subscription.endpoint.split('/');
    var subscriptionId = endpointSections[endpointSections.length - 1];

    fetch('https://android.googleapis.com/gcm/send', {
      method: 'post',
      headers: headers,
      body: JSON.stringify({
        registration_ids: [subscriptionId] // eslint-disable-line camelcase
      })
    })
    .then(function(response) {
      return response.json();
    })
    .then(responseObj => {
      if (responseObj.failure !== 0) {
        console.log('Failed GCM response: ', responseObj);
        throw new Error('Failed to send push message via GCM');
      }
    })
    .catch(err => {
      this.showErrorMessage(
        'Ooops Unable to Send a Push',
        err
      );
    });
  }

  useWebPushProtocol(subscription) {
    console.log('Sending XHR to Web Push Protocol endpoint');

    fetch(subscription.endpoint, {
      method: 'post'
    })
    .then(function(response) {
      if (response.status >= 400 && response.status < 500) {
        console.log('Failed web push response: ', response, response.status);
        throw new Error('Failed to send push message via web push protocol');
      }
    })
    .catch(err => {
      this.showErrorMessage(
        'Ooops Unable to Send a Push',
        err
      );
    });
  }

  produceGCMProprietaryCURLCommand(subscription) {
    var curlEndpoint = 'https://android.googleapis.com/gcm/send';
    var endpointSections = subscription.endpoint.split('/');
    var subscriptionId = endpointSections[endpointSections.length - 1];
    var curlCommand = 'curl --header "Authorization: key=' +
      this._API_KEY + '" --header Content-Type:"application/json" ' +
      curlEndpoint + ' -d "{\\"registration_ids\\":[\\"' +
      subscriptionId + '\\"]}"';
    return curlCommand;
  }

  produceWebPushProtocolCURLCommand(subscription) {
    var curlEndpoint = subscription.endpoint;
    var curlCommand = 'curl --request POST ' + curlEndpoint;
    return curlCommand;
  }

  showErrorMessage(title, message) {
    var errorContainer = document.querySelector('.js-error-message-container');

    var titleElement = errorContainer.querySelector('.js-error-title');
    var messageElement = errorContainer.querySelector('.js-error-message');
    titleElement.textContent = title;
    messageElement.textContent = message;
    errorContainer.style.opacity = 1;

    var pushOptionsContainer = document.querySelector('.js-send-push-options');
    pushOptionsContainer.style.display = 'none';
  }
}
