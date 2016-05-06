/* eslint-env browser */

import PushClient from './push-client.js';
import EncryptionHelperFactory from './encryption/encryption-helper';

export default class AppController {
  constructor() {
    // Define a different server URL here if desire.
    this._PUSH_SERVER_URL = '';
    this._API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');
    this._payloadTextField = document.querySelector('.js-payload-textfield');
    this._stateMsg = document.querySelector('.js-state-msg');
    this._payloadTextField.oninput = () => {
      Promise.all([
        this.updateCurlCommand(),
        this.updateXHRButton()
      ])
      .then(() => {
        this.updateOrMessage();
      });
    };

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

    const sendPushViaXHRButton = document.querySelector('.js-send-push-button');
    sendPushViaXHRButton.addEventListener('click', () => {
      if (this._currentSubscription) {
        this.sendPushMessage(this._currentSubscription,
          this._payloadTextField.value);
      }
    });
  }

  registerServiceWorker() {
    // Check that service workers are supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
      .catch(err => {
        this.showErrorMessage(
          'Unable to Register SW',
          'Sorry this demo requires a service worker to work and it ' +
          'was didn\'t seem to install - sorry :('
        );
        console.error(err);
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
    this._currentSubscription = subscription;

    if (!subscription) {
      // Remove any subscription from your servers if you have
      // set it up.
      this._sendPushOptions.style.opacity = 0;
      return;
    }

    // This is too handle old versions of Firefox where keys would exist
    // but auth wouldn't
    const payloadTextfieldContainer = document.querySelector(
      '.js-payload-textfield-container');
    const subscriptionObject = JSON.parse(JSON.stringify(subscription));
    if (
      subscriptionObject &&
      subscriptionObject.keys &&
      subscriptionObject.keys.auth &&
      subscriptionObject.keys.p256dh) {
      payloadTextfieldContainer.classList.remove('hidden');
    } else {
      payloadTextfieldContainer.classList.add('hidden');
    }

    Promise.all([
      this.updateCurlCommand(),
      this.updateXHRButton()
    ])
    .then(() => {
      this.updateOrMessage();
    });

    // Display the UI
    this._sendPushOptions.style.opacity = 1;
  }

  updateCurlCommand() {
    const payloadText = this._payloadTextField.value;
    let payloadPromise = Promise.resolve(null);
    if (payloadText && payloadText.trim().length > 0) {
      payloadPromise = EncryptionHelperFactory.generateHelper()
      .then(encryptionHelper => {
        return encryptionHelper.encryptMessage(
          JSON.parse(JSON.stringify(this._currentSubscription)), payloadText);
      });
    }

    return payloadPromise.then(encryptedPayload => {
      const curlContainer = document.querySelector('.js-curl-container');
      let curlCommand;

      // GCM Command
      if (this._currentSubscription.endpoint.indexOf(
        'https://android.googleapis.com/gcm/send') === 0) {
        curlCommand = this.produceGCMProprietaryCURLCommand(
          this._currentSubscription, encryptedPayload);

      // Web Push Protocol
      } else if (payloadText && payloadText.trim().length > 0) {
        // Turn off curl command
        curlContainer.style.display = 'none';
        this._stateMsg.textContent = 'Note: Push messages with a payload ' +
          'can\'t be sent with a cURL command due to the body of the web ' +
          'push protocol request being a stream.';
        return;
      } else {
        this._stateMsg.textContent = '';
        curlCommand = this.produceWebPushProtocolCURLCommand(
          this._currentSubscription, encryptedPayload);
      }

      curlContainer.style.display = 'block';
      const curlCodeElement = document.querySelector('.js-curl-code');
      curlCodeElement.innerHTML = curlCommand;
    });
  }

  updateXHRButton() {
    const buttonContainer = document.querySelector('.js-xhr-button-container');
    if (this._currentSubscription.endpoint.indexOf(
      'https://android.googleapis.com/gcm/send') === 0 &&
      this._payloadTextField.value.trim().length > 0
    ) {
      buttonContainer.style.display = 'none';
      return;
    }

    buttonContainer.style.display = 'block';
  }

  updateOrMessage() {
    const orMessage = document.querySelector('.js-push-options-or');
    const buttonContainer = document.querySelector('.js-xhr-button-container');
    const curlContainer = document.querySelector('.js-curl-container');

    const orDisplay = (
      buttonContainer.style.display === 'none' ||
      curlContainer.style.display === 'none') ? 'none' : 'block';

    orMessage.style.display = orDisplay;
  }

  sendPushMessage(subscription, payloadText) {
    let payloadPromise = Promise.resolve(null);
    if (payloadText && payloadText.trim().length > 0) {
      payloadPromise = EncryptionHelperFactory.generateHelper()
      .then(encryptionHelper => {
        console.log(JSON.stringify(subscription));
        return encryptionHelper.encryptMessage(
          JSON.parse(JSON.stringify(subscription)), payloadText);
      });
    }

    payloadPromise.then(encryptedPayload => {
      if (subscription.endpoint.indexOf(
        'https://android.googleapis.com/gcm/send') === 0) {
        this.useGCMProtocol(subscription, encryptedPayload);
      } else {
        this.useWebPushProtocol(subscription, encryptedPayload);
      }
    });
  }

  toBase64(arrayBuffer, start, end) {
    start = start || 0;
    end = end || arrayBuffer.byteLength;

    const partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
    return btoa(String.fromCharCode.apply(null, partialBuffer));
  }

  useGCMProtocol(subscription, encryptedPayload) {
    console.log('Sending XHR to GCM Protocol endpoint');

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Authorization', 'key=' + this._API_KEY);

    const endpointSections = subscription.endpoint.split('/');
    const subscriptionId = endpointSections[endpointSections.length - 1];
    const msgBody = {
      registration_ids: [subscriptionId] // eslint-disable-line camelcase
    };

    if (encryptedPayload) {
      msgBody.raw_data = this.toBase64(encryptedPayload.cipherText); // eslint-disable-line camelcase

      headers.append('Encryption', 'salt=' + encryptedPayload.salt);
      headers.append('Crypto-Key', 'dh=' + encryptedPayload.publicServerKey);
      headers.append('Content-Encoding', 'aesgcm');
    }

    fetch('https://android.googleapis.com/gcm/send', {
      method: 'post',
      headers: headers,
      body: JSON.stringify(msgBody)
    })
    .then(function(response) {
      if (response.type === 'opaque') {
        return;
      }

      return response.json()
      .then(responseObj => {
        if (responseObj.failure !== 0) {
          console.log('Failed GCM response: ', responseObj);
          throw new Error('Failed to send push message via GCM');
        }
      });
    })
    .catch(err => {
      this.showErrorMessage(
        'Ooops Unable to Send a Push',
        err
      );
    });
  }

  useWebPushProtocol(subscription, encryptedPayload) {
    console.log('Sending XHR to Web Push Protocol endpoint');
    const headers = new Headers();
    headers.append('TTL', 60);

    const fetchOptions = {
      method: 'post',
      headers: headers
    };

    if (encryptedPayload) {
      fetchOptions.body = encryptedPayload.cipherText;

      headers.append('Encryption', 'salt=' +
        encryptedPayload.salt);
      headers.append('Crypto-Key', 'dh=' +
        encryptedPayload.publicServerKey);
      headers.append('Content-Encoding', 'application/octet-stream');
      headers.append('Content-Encoding', 'aesgcm');
    }

    fetch(subscription.endpoint, fetchOptions)
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

  produceGCMProprietaryCURLCommand(subscription, encryptedPayload) {
    let additionalHeaders = '';
    let additionalBody = '';
    if (encryptedPayload) {
      additionalBody = ', \\"raw_data\\": \\"' +
        this.toBase64(encryptedPayload.cipherText) + '\\"';

      additionalHeaders += ' --header "Encryption: salt=' +
        encryptedPayload.salt + '"';
      additionalHeaders += ' --header "Crypto-Key: dh=' +
        encryptedPayload.publicServerKey + '"';
      additionalHeaders += ' --header "Content-Encoding: aesgcm"';

      this._stateMsg.textContent = 'Note: Push messages with a payload ' +
        'can\'t be sent to GCM due to a CORs issue. Trigger a push ' +
        'message with the cURL command below.';
    } else {
      this._stateMsg.textContent = '';
    }

    const curlEndpoint = 'https://android.googleapis.com/gcm/send';
    const endpointSections = subscription.endpoint.split('/');
    const subscriptionId = endpointSections[endpointSections.length - 1];
    const curlCommand = 'curl --header "Authorization: key=' +
      this._API_KEY + '" --header "Content-Type: application/json"' +
      additionalHeaders + ' ' +
      curlEndpoint + ' -d "{\\"to\\":\\"' +
      subscriptionId + '\\"' + additionalBody + '}"';
    return curlCommand;
  }

  produceWebPushProtocolCURLCommand(subscription) {
    // Payload body is a byte array so can't add to cURL command
    const curlEndpoint = subscription.endpoint;
    const curlCommand = 'curl --header "TTL: 60" --request POST ' +
      curlEndpoint;
    return curlCommand;
  }

  showErrorMessage(title, message) {
    const errorContainer = document
      .querySelector('.js-error-message-container');

    const titleElement = errorContainer.querySelector('.js-error-title');
    const messageElement = errorContainer.querySelector('.js-error-message');
    titleElement.textContent = title;
    messageElement.innerHTML = message;
    errorContainer.style.opacity = 1;

    const pushOptionsContainer = document
      .querySelector('.js-send-push-options');
    pushOptionsContainer.style.display = 'none';
  }
}
