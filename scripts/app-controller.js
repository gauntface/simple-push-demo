'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global PushClient, MaterialComponentsSnippets */
/* eslint-env browser */

var BACKEND_ORIGIN = 'https://simple-push-demo.appspot.com';
// const BACKEND_ORIGIN = `http://localhost:8080`;

var AppController = function () {
  function AppController() {
    var _this = this;

    _classCallCheck(this, AppController);

    this._encryptionHelper = window.gauntface.EncryptionHelperFactory.generateHelper();

    var contentEncodingCode = document.querySelector('.js-supported-content-encodings');
    contentEncodingCode.textContent = JSON.stringify(PushManager.supportedContentEncodings || ['aesgcm'], null, 2);

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');
    this._subscriptionJSONCode = document.querySelector('.js-subscription-json');
    this._payloadTextField = document.querySelector('.js-payload-textfield');
    this._payloadTextField.oninput = function () {
      _this.updatePushInfo();
    };

    // Below this comment is code to initialise a material design lite view.
    var toggleSwitch = document.querySelector('.js-push-toggle-switch');
    if (toggleSwitch.classList.contains('is-upgraded')) {
      this.ready = Promise.resolve();
      this._uiInitialised(toggleSwitch.MaterialSwitch);
    } else {
      this.ready = new Promise(function (resolve) {
        var mdlUpgradeCb = function mdlUpgradeCb() {
          if (!toggleSwitch.classList.contains('is-upgraded')) {
            return;
          }

          _this._uiInitialised(toggleSwitch.MaterialSwitch);
          document.removeEventListener(mdlUpgradeCb);

          resolve();
        };

        // This is to wait for MDL initialising
        document.addEventListener('mdl-componentupgraded', mdlUpgradeCb);
      });
    }
  }

  _createClass(AppController, [{
    key: '_uiInitialised',
    value: function _uiInitialised(toggleSwitch) {
      var _this2 = this;

      this._stateChangeListener = this._stateChangeListener.bind(this);
      this._subscriptionUpdate = this._subscriptionUpdate.bind(this);

      this._toggleSwitch = toggleSwitch;
      this._pushClient = new PushClient(this._stateChangeListener, this._subscriptionUpdate, window.gauntface.CONSTANTS.APPLICATION_KEYS.publicKey);

      document.querySelector('.js-push-toggle-switch > input').addEventListener('click', function (event) {
        // Inverted because clicking will change the checked state by
        // the time we get here
        if (event.target.checked) {
          _this2._pushClient.subscribeDevice();
        } else {
          _this2._pushClient.unsubscribeDevice();
        }
      });

      var sendPushViaXHRButton = document.querySelector('.js-send-push-button');
      sendPushViaXHRButton.addEventListener('click', function () {
        if (_this2._currentSubscription) {
          _this2.sendPushMessage(_this2._currentSubscription, _this2._payloadTextField.value);
        }
      });

      // allow snippets to be copied via click
      new MaterialComponentsSnippets().init();
    }
  }, {
    key: 'registerServiceWorker',
    value: function registerServiceWorker() {
      var _this3 = this;

      // Check that service workers are supported
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(function (err) {
          _this3.showErrorMessage('Unable to Register SW', 'Sorry this demo requires a service worker to work and it ' + 'failed to install - sorry :(');
          console.error(err);
        });
      } else {
        this.showErrorMessage('Service Worker Not Supported', 'Sorry this demo requires service worker support in your browser. ' + 'Please try this demo in Chrome or Firefox Nightly.');
      }
    }
  }, {
    key: '_stateChangeListener',
    value: function _stateChangeListener(state, data) {
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
          this.showErrorMessage('Push Not Supported', data);
          break;
        case 'ERROR':
          this.showErrorMessage('Ooops a Problem Occurred', data);
          break;
        default:
          break;
      }
    }
  }, {
    key: '_subscriptionUpdate',
    value: function _subscriptionUpdate(subscription) {
      this._currentSubscription = subscription;
      if (!subscription) {
        // Remove any subscription from your servers if you have
        // set it up.
        this._sendPushOptions.style.opacity = 0;
        return;
      }

      this._subscriptionJSONCode.textContent = JSON.stringify(subscription, null, 2);

      // This is too handle old versions of Firefox where keys would exist
      // but auth wouldn't
      var payloadTextfieldContainer = document.querySelector('.js-payload-textfield-container');
      var subscriptionObject = JSON.parse(JSON.stringify(subscription));
      if (subscriptionObject && subscriptionObject.keys && subscriptionObject.keys.auth && subscriptionObject.keys.p256dh) {
        payloadTextfieldContainer.classList.remove('hidden');
      } else {
        payloadTextfieldContainer.classList.add('hidden');
      }

      this.updatePushInfo();

      // Display the UI
      this._sendPushOptions.style.opacity = 1;
    }
  }, {
    key: 'updatePushInfo',
    value: function updatePushInfo() {
      // Let's look at payload
      var payloadText = this._payloadTextField.value;
      return this._encryptionHelper.getRequestDetails(this._currentSubscription, payloadText).then(function (requestDetails) {
        var curlCommand = 'curl "' + requestDetails.endpoint + '" --request POST';
        var curlError = null;

        document.querySelector('.js-endpoint').textContent = requestDetails.endpoint;
        var headersList = document.querySelector('.js-headers-list');
        while (headersList.hasChildNodes()) {
          headersList.removeChild(headersList.firstChild);
        }
        Object.keys(requestDetails.headers).forEach(function (header) {
          var liElement = document.createElement('p');
          liElement.innerHTML = '<span>' + header + '</span>: ' + ('' + requestDetails.headers[header]);
          headersList.appendChild(liElement);

          curlCommand += ' --header "' + header + ': ' + requestDetails.headers[header] + '"';
        });

        var bodyFormat = document.querySelector('.js-body-format');
        var bodyContent = document.querySelector('.js-body-content');
        if (requestDetails.body && requestDetails.body instanceof ArrayBuffer) {
          bodyFormat.textContent = 'Stream';
          bodyContent.textContent = 'Unable to display';

          curlCommand = null;
          curlError = 'Sorry, but because the web push ' + 'protocol requires a stream as the body of the request, there is ' + 'no CURL command that will stream an encrypted payload.';
        } else if (requestDetails.body) {
          bodyFormat.textContent = 'String';
          bodyContent.textContent = requestDetails.body;

          curlCommand += ' -d ' + JSON.stringify(requestDetails.body);
        } else {
          bodyFormat.textContent = 'No Body';
          bodyContent.textContent = 'N/A';
        }

        var curlCodeElement = document.querySelector('.js-curl-code');
        var curlMsgElement = document.querySelector('.js-curl-copy-msg');
        var curlErrorMsgElement = document.querySelector('.js-curl-error-msg');
        if (curlCommand === null) {
          curlCodeElement.style.display = 'none';
          curlMsgElement.style.display = 'none';
          curlErrorMsgElement.textContent = curlError;
          curlErrorMsgElement.style.display = 'block';
        } else {
          curlCodeElement.textContent = curlCommand;
          curlCodeElement.style.display = 'block';
          curlMsgElement.style.display = 'block';
          curlErrorMsgElement.style.display = 'none';
        }
      });
    }
  }, {
    key: 'getGCMInfo',
    value: function getGCMInfo(subscription, payload, apiKey) {
      var headers = {};

      headers.Authorization = 'key=' + apiKey;
      headers['Content-Type'] = 'application/json';

      var endpointSections = subscription.endpoint.split('/');
      var subscriptionId = endpointSections[endpointSections.length - 1];
      var gcmAPIData = {
        to: subscriptionId
      };

      if (payload) {
        gcmAPIData['raw_data'] = this.toBase64(payload.cipherText); // eslint-disable-line
        headers.Encryption = 'salt=' + payload.salt;
        headers['Crypto-Key'] = 'dh=' + payload.publicServerKey;
        headers['Content-Encoding'] = payload.contentEncoding;
      }

      return {
        headers: headers,
        body: JSON.stringify(gcmAPIData),
        endpoint: 'https://android.googleapis.com/gcm/send'
      };
    }
  }, {
    key: 'sendPushMessage',
    value: function sendPushMessage(subscription, payloadText) {
      var _this4 = this;

      return this._encryptionHelper.getRequestDetails(this._currentSubscription, payloadText).then(function (requestDetails) {
        // Some push services don't allow CORS so have to forward
        // it to a different server to make the request which does support
        // CORs
        return _this4.sendRequestToProxyServer(requestDetails);
      });
    }
  }, {
    key: 'sendRequestToProxyServer',
    value: function sendRequestToProxyServer(requestInfo) {
      var _this5 = this;

      console.log('Sending XHR Proxy Server', requestInfo);

      var fetchOptions = {
        method: 'post'
      };

      // Can't send a stream like is needed for web push protocol,
      // so needs to convert it to base 64 here and the server will
      // convert back and pass as a stream
      if (requestInfo.body && requestInfo.body instanceof ArrayBuffer) {
        requestInfo.body = this.toBase64(requestInfo.body);
        fetchOptions.body = requestInfo;
      }

      fetchOptions.body = JSON.stringify(requestInfo);

      fetch(BACKEND_ORIGIN + '/api/v2/sendpush', fetchOptions).then(function (response) {
        if (response.status >= 400 && response.status < 500) {
          return response.text().then(function (responseText) {
            console.log('Failed web push response: ', response, response.status);
            throw new Error('Failed to send push message via web push protocol: ' + ('<pre>' + encodeURI(responseText) + '</pre>'));
          });
        }
      }).catch(function (err) {
        console.log(err);
        _this5.showErrorMessage('Ooops Unable to Send a Push', err);
      });
    }
  }, {
    key: 'toBase64',
    value: function toBase64(arrayBuffer, start, end) {
      start = start || 0;
      end = end || arrayBuffer.byteLength;

      var partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
      return btoa(String.fromCharCode.apply(null, partialBuffer));
    }
  }, {
    key: 'showErrorMessage',
    value: function showErrorMessage(title, message) {
      var errorContainer = document.querySelector('.js-error-message-container');

      var titleElement = errorContainer.querySelector('.js-error-title');
      var messageElement = errorContainer.querySelector('.js-error-message');
      titleElement.textContent = title;
      messageElement.innerHTML = message;
      errorContainer.style.opacity = 1;

      var pushOptionsContainer = document.querySelector('.js-send-push-options');
      pushOptionsContainer.style.display = 'none';
    }
  }]);

  return AppController;
}();

if (window) {
  window.onload = function () {
    if (!navigator.serviceWorker) {
      console.warn('Service worker not supported.');
      return;
    }
    if (!('PushManager' in window)) {
      console.warn('Push not supported.');
      return;
    }

    var appController = new AppController();
    appController.ready.then(function () {
      document.body.dataset.simplePushDemoLoaded = true;

      var host = 'gauntface.github.io';
      if (window.location.host === host && window.location.protocol !== 'https:') {
        // Enforce HTTPS
        window.location.protocol = 'https';
      }

      appController.registerServiceWorker();
    });
  };
}