/* global PushClient, EncryptionHelperFactory, MaterialComponentsSnippets */
/* eslint-env browser */

class AppController {
  constructor() {
    // Define a different server URL here if desire.
    this._PUSH_SERVER_URL = '';
    this._API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

    this._applicationKeys = {
      publicKey: window.base64UrlToUint8Array(
        'BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiA' +
        'pwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo'),
      privateKey: window.base64UrlToUint8Array(
        'xKZKYRNdFFn8iQIF2MH54KTfUHwH105zBdzMR7SI3xI'),
    };

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');
    this._payloadTextField = document.querySelector('.js-payload-textfield');
    this._stateMsg = document.querySelector('.js-state-msg');
    this._payloadTextField.oninput = () => {
      this.updatePushInfo();
    };

    // Below this comment is code to initialise a material design lite view.
    const toggleSwitch = document.querySelector('.js-push-toggle-switch');
    if (toggleSwitch.classList.contains('is-upgraded')) {
      this.ready = Promise.resolve();
      this._uiInitialised(toggleSwitch.MaterialSwitch);
    } else {
      this.ready = new Promise((resolve) => {
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
      this._subscriptionUpdate,
      this._applicationKeys.publicKey
    );

    document.querySelector('.js-push-toggle-switch > input')
    .addEventListener('click', (event) => {
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

    // allow snippets to be copied via click
    new MaterialComponentsSnippets().init();
  }

  registerServiceWorker() {
    // Check that service workers are supported
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
      .catch((err) => {
        this.showErrorMessage(
          'Unable to Register SW',
          'Sorry this demo requires a service worker to work and it ' +
          'failed to install - sorry :('
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
      case 'UNSUPPORTED':
        this.showErrorMessage(
          'Push Not Supported',
          data
        );
        break;
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

    this.updatePushInfo();

    // Display the UI
    this._sendPushOptions.style.opacity = 1;
  }

  updatePushInfo() {
    // Let's look at payload
    const payloadText = this._payloadTextField.value;
    let payloadPromise = Promise.resolve(null);
    if (payloadText && payloadText.trim().length > 0) {
      payloadPromise = EncryptionHelperFactory.generateHelper()
      .then((encryptionHelper) => {
        return encryptionHelper.encryptMessage(
          JSON.parse(JSON.stringify(this._currentSubscription)), payloadText);
      });
    }

    // Vapid support
    const vapidPromise = EncryptionHelperFactory.createVapidAuthHeader(
      this._applicationKeys,
      this._currentSubscription.endpoint,
      'mailto:simple-push-demo@gauntface.co.uk');

    return Promise.all([
      payloadPromise,
      vapidPromise,
    ])
    .then((results) => {
      const payload = results[0];
      const vapidHeaders = results[1];

      let infoFunction = this.getWebPushInfo;
      infoFunction = () => {
        return this.getWebPushInfo(this._currentSubscription, payload,
          vapidHeaders);
      };
      if (this._currentSubscription.endpoint.indexOf(
        'https://android.googleapis.com/gcm/send') === 0) {
        infoFunction = () => {
          return this.getGCMInfo(this._currentSubscription, payload,
            this._API_KEY);
        };
      }

      const requestInfo = infoFunction();

      let curlCommand = `curl "${requestInfo.endpoint}" --request POST`;
      let curlError = null;

      document.querySelector('.js-endpoint').textContent = requestInfo.endpoint;
      const headersList = document.querySelector('.js-headers-list');
      while (headersList.hasChildNodes()) {
        headersList.removeChild(headersList.firstChild);
      }
      Object.keys(requestInfo.headers).forEach((header) => {
        const liElement = document.createElement('p');
        liElement.innerHTML = `<span>${header}</span>: ` +
          `${requestInfo.headers[header]}`;
        headersList.appendChild(liElement);

        curlCommand += ` --header "${header}: ${requestInfo.headers[header]}"`;
      });

      const bodyFormat = document.querySelector('.js-body-format');
      const bodyContent = document.querySelector('.js-body-content');
      if (requestInfo.body && requestInfo.body instanceof ArrayBuffer) {
        bodyFormat.textContent = 'Stream';
        bodyContent.textContent = 'Unable to display';

        curlCommand = null;
        curlError = 'Sorry, but because the web push ' +
          'protocol requires a stream as the body of the request, there is ' +
          'no CURL command that will stream an encrypted payload.';
      } else if (requestInfo.body) {
        bodyFormat.textContent = 'String';
        bodyContent.textContent = requestInfo.body;

        curlCommand += ` -d ${JSON.stringify(requestInfo.body)}`;
      } else {
        bodyFormat.textContent = 'No Body';
        bodyContent.textContent = 'N/A';
      }

      this._latestPushInfo = requestInfo;

      const curlCodeElement = document.querySelector('.js-curl-code');
      const curlMsgElement = document.querySelector('.js-curl-copy-msg');
      const curlErrorMsgElement = document.querySelector('.js-curl-error-msg');
      if (curlCommand === null) {
        curlCodeElement.style.display = 'none';
        curlMsgElement.style.display = 'none';
        curlErrorMsgElement.textContent = curlError;
        curlErrorMsgElement.style.display = 'block';
      } else {
        curlCodeElement.textContent = curlCommand;
        curlMsgElement.style.display = 'block';
        curlErrorMsgElement.style.display = 'none';
      }
    });
  }

  getGCMInfo(subscription, payload, apiKey) {
    const headers = {};

    headers.Authorization = `key=${apiKey}`;
    headers['Content-Type'] = `application/json`;

    const endpointSections = subscription.endpoint.split('/');
    const subscriptionId = endpointSections[endpointSections.length - 1];
    const gcmAPIData = {
      to: subscriptionId,
    };

    if (payload) {
      gcmAPIData['raw_data'] = this.toBase64(payload.cipherText); // eslint-disable-line
      headers.Encryption = `salt=${payload.salt}`;
      headers['Crypto-Key'] = `dh=${payload.publicServerKey}`;
      headers['Content-Encoding'] = `aesgcm`;
    }

    return {
      headers: headers,
      body: JSON.stringify(gcmAPIData),
      endpoint: 'https://android.googleapis.com/gcm/send',
    };
  }

  getWebPushInfo(subscription, payload, vapidHeaders) {
    let body = null;
    const headers = {};
    headers.TTL = 60;

    if (payload) {
      body = payload.cipherText;

      headers.Encryption = `salt=${payload.salt}`;
      headers['Crypto-Key'] = `dh=${payload.publicServerKey}`;
      headers['Content-Encoding'] = 'aesgcm';
    } else {
      headers['Content-Length'] = 0;
    }

    if (vapidHeaders) {
      headers.Authorization = `WebPush ${vapidHeaders.authorization}`;

      if (headers['Crypto-Key']) {
        headers['Crypto-Key'] = `${headers['Crypto-Key']}; ` +
          `p256ecdsa=${vapidHeaders.p256ecdsa}`;
      } else {
        headers['Crypto-Key'] = `p256ecdsa=${vapidHeaders.p256ecdsa}`;
      }
    }

    const response = {
      headers: headers,
      endpoint: subscription.endpoint,
    };

    if (body) {
      response.body = body;
    }

    return response;
  }

  sendPushMessage(subscription, payloadText) {
    // Let's look at payload
    let payloadPromise = Promise.resolve(null);
    if (payloadText && payloadText.trim().length > 0) {
      payloadPromise = EncryptionHelperFactory.generateHelper()
      .then((encryptionHelper) => {
        return encryptionHelper.encryptMessage(
          JSON.parse(JSON.stringify(this._currentSubscription)), payloadText);
      });
    }

    // Vapid support
    const vapidPromise = EncryptionHelperFactory.createVapidAuthHeader(
      this._applicationKeys,
      subscription.endpoint,
      'mailto:simple-push-demo@gauntface.co.uk');

    return Promise.all([
      payloadPromise,
      vapidPromise,
    ])
    .then((results) => {
      const payload = results[0];
      const vapidHeaders = results[1];

      let infoFunction = this.getWebPushInfo;
      infoFunction = () => {
        return this.getWebPushInfo(subscription, payload,
          vapidHeaders);
      };
      if (subscription.endpoint.indexOf(
        'https://android.googleapis.com/gcm/send') === 0) {
        infoFunction = () => {
          return this.getGCMInfo(subscription, payload,
            this._API_KEY);
        };
      }

      const requestInfo = infoFunction();

      // Some push services don't allow CORS so have to forward
      // it to a different server to make the request which does support
      // CORs

      this.sendRequestToProxyServer(requestInfo);
    });
  }

  sendRequestToProxyServer(requestInfo) {
    console.log('Sending XHR Proxy Server', requestInfo);

    const fetchOptions = {
      method: 'post',
    };

    // Can't send a stream like is needed for web push protocol,
    // so needs to convert it to base 64 here and the server will
    // convert back and pass as a stream
    if (requestInfo.body && requestInfo.body instanceof ArrayBuffer) {
      requestInfo.body = this.toBase64(requestInfo.body);
      fetchOptions.body = requestInfo;
    }

    fetchOptions.body = JSON.stringify(requestInfo);

    fetch('https://simple-push-demo.appspot.com/api/v2/sendpush', fetchOptions)
    .then(function(response) {
      if (response.status >= 400 && response.status < 500) {
        console.log('Failed web push response: ', response, response.status);
        throw new Error('Failed to send push message via web push protocol');
      }
    })
    .catch((err) => {
      this.showErrorMessage(
        'Ooops Unable to Send a Push',
        err
      );
    });
  }

  toBase64(arrayBuffer, start, end) {
    start = start || 0;
    end = end || arrayBuffer.byteLength;

    const partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
    return btoa(String.fromCharCode.apply(null, partialBuffer));
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

if (window) {
  window.AppController = AppController;
}
