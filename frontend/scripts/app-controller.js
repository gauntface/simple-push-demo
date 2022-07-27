/* global PushClient, MaterialComponentsSnippets */
/* eslint-env browser */

const BACKEND_ORIGIN = `https://simple-push-demo-api.glitch.me`;
// const BACKEND_ORIGIN = `http://localhost:8080`;

class AppController {
  constructor() {
    this._encryptionHelper =
      window.gauntface.EncryptionHelperFactory.generateHelper();

    const contentEncodingCode = document.querySelector(
        '.js-supported-content-encodings');
    contentEncodingCode.textContent =
      JSON.stringify(
          PushManager.supportedContentEncodings ||
        ['aesgcm'], null, 2);

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');
    this._subscriptionJSONCode = document.querySelector(
        '.js-subscription-json');
    this._payloadTextField = document.querySelector('.js-payload-textfield');
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
        window.gauntface.CONSTANTS.APPLICATION_KEYS.publicKey,
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

    const sendPushViaFetchButton =
      document.querySelector('.js-send-push-button');
    sendPushViaFetchButton.addEventListener('click', () => {
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
                'failed to install - sorry :(',
            );
            console.error(err);
          });
    } else {
      this.showErrorMessage(
          'Service Worker Not Supported',
          'Sorry this demo requires service worker support in your browser. ' +
          'Please try this demo in Chrome or Firefox Nightly.',
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
            data,
        );
        break;
      case 'ERROR':
        this.showErrorMessage(
            'Ooops a Problem Occurred',
            data,
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

    this._subscriptionJSONCode.textContent =
      JSON.stringify(subscription, null, 2);

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
    return this._encryptionHelper.getRequestDetails(
        this._currentSubscription, payloadText)
        .then((requestDetails) => {
          let curlCommand = `curl "${requestDetails.endpoint}" --request POST`;

          document.querySelector('.js-endpoint').textContent =
            requestDetails.endpoint;
          const headersList = document.querySelector('.js-headers-list');
          while (headersList.hasChildNodes()) {
            headersList.removeChild(headersList.firstChild);
          }
          Object.keys(requestDetails.headers).forEach((header) => {
            const liElement = document.createElement('p');
            liElement.innerHTML = `<span>${header}</span>: ` +
              `${requestDetails.headers[header]}`;
            headersList.appendChild(liElement);

            curlCommand +=
              ` --header "${header}: ${requestDetails.headers[header]}"`;
          });

          const bodyFormat = document.querySelector('.js-body-format');
          const bodyContent = document.querySelector('.js-body-content');
          const payloadDownloadElement =
            document.querySelector('.js-payload-download');
          if (requestDetails.body &&
            requestDetails.body instanceof ArrayBuffer) {
            bodyFormat.textContent =
              'Encrypted binary (see hexadecimal representation below)';
            bodyContent.textContent = this.toHex(requestDetails.body);

            curlCommand += ' --data-binary @payload.bin';

            payloadDownloadElement.style.display = 'inline';

            const payloadLink = document.querySelector('.js-payload-link');
            const blob = new Blob([requestDetails.body]);
            payloadLink.href = URL.createObjectURL(blob);
            payloadLink.download = 'payload.bin';
          } else if (requestDetails.body) {
            bodyFormat.textContent = 'String';
            bodyContent.textContent = requestDetails.body;

            curlCommand += ` -d ${JSON.stringify(requestDetails.body)}`;

            payloadDownloadElement.style.display = 'none';
          } else {
            bodyFormat.textContent = 'No Body';
            bodyContent.textContent = 'N/A';

            payloadDownloadElement.style.display = 'none';
          }

          const curlCodeElement = document.querySelector('.js-curl-code');
          curlCodeElement.textContent = curlCommand;
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
      headers['Content-Encoding'] = payload.contentEncoding;
    }

    return {
      headers: headers,
      body: JSON.stringify(gcmAPIData),
      endpoint: 'https://android.googleapis.com/gcm/send',
    };
  }

  sendPushMessage(subscription, payloadText) {
    return this._encryptionHelper.getRequestDetails(
        this._currentSubscription, payloadText)
        .then((requestDetails) => {
          // Some push services don't allow CORS so have to forward
          // it to a different server to make the request which does support
          // CORs
          return this.sendRequestToProxyServer(requestDetails);
        });
  }

  sendRequestToProxyServer(requestInfo) {
    console.log('Sending network request to CORS proxy server', requestInfo);

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

    fetch(`${BACKEND_ORIGIN}/api/v3/sendpush`, fetchOptions)
        .then(function(response) {
          if (response.status >= 400 && response.status < 500) {
            return response.text()
                .then((responseText) => {
                  console.log('Failed web push response: ',
                      response, response.status);
                  throw new Error(
                      `Failed to send push message via web push protocol: ` +
                      `<pre>${encodeURI(responseText)}</pre>`);
                });
          }
        })
        .catch((err) => {
          console.log(err);
          this.showErrorMessage(
              'Ooops Unable to Send a Push',
              err,
          );
        });
  }

  toBase64(arrayBuffer, start, end) {
    start = start || 0;
    end = end || arrayBuffer.byteLength;

    const partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
    return btoa(String.fromCharCode.apply(null, partialBuffer));
  }

  toHex(arrayBuffer) {
    return [...new Uint8Array(arrayBuffer)]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join(' ');
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
  window.onload = function() {
    if (!navigator.serviceWorker) {
      console.warn('Service worker not supported.');
      return;
    }
    if (!('PushManager' in window)) {
      console.warn('Push not supported.');
      return;
    }

    const appController = new AppController();
    appController.ready
        .then(() => {
          document.body.dataset.simplePushDemoLoaded = true;

          const host = 'gauntface.github.io';
          if (
            window.location.host === host &&
            window.location.protocol !== 'https:') {
            // Enforce HTTPS
            window.location.protocol = 'https';
          }

          appController.registerServiceWorker();
        });
  };
}
