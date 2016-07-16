'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global PushClient, EncryptionHelperFactory, MaterialComponentsSnippets */
/* eslint-env browser */

var AppController = function () {
  function AppController() {
    var _this = this;

    _classCallCheck(this, AppController);

    // Define a different server URL here if desire.
    this._PUSH_SERVER_URL = '';
    this._API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

    this._applicationKeys = {
      publicKey: window.base64UrlToUint8Array('BDd3_hVL9fZi9Ybo2UUzA284WG5FZR30_95YeZJsiA' + 'pwXKpNcF1rRPF3foIiBHXRdJI2Qhumhf6_LFTeZaNndIo'),
      privateKey: window.base64UrlToUint8Array('xKZKYRNdFFn8iQIF2MH54KTfUHwH105zBdzMR7SI3xI')
    };

    // This div contains the UI for CURL commands to trigger a push
    this._sendPushOptions = document.querySelector('.js-send-push-options');
    this._payloadTextField = document.querySelector('.js-payload-textfield');
    this._stateMsg = document.querySelector('.js-state-msg');
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
      this._pushClient = new PushClient(this._stateChangeListener, this._subscriptionUpdate, this._applicationKeys.publicKey);

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
      var _this4 = this;

      // Let's look at payload
      var payloadText = this._payloadTextField.value;
      var payloadPromise = Promise.resolve(null);
      if (payloadText && payloadText.trim().length > 0) {
        payloadPromise = EncryptionHelperFactory.generateHelper().then(function (encryptionHelper) {
          return encryptionHelper.encryptMessage(JSON.parse(JSON.stringify(_this4._currentSubscription)), payloadText);
        });
      }

      // Vapid support
      var vapidPromise = EncryptionHelperFactory.createVapidAuthHeader(this._applicationKeys, this._currentSubscription.endpoint, 'mailto:simple-push-demo@gauntface.co.uk');

      return Promise.all([payloadPromise, vapidPromise]).then(function (results) {
        var payload = results[0];
        var vapidHeaders = results[1];

        var infoFunction = _this4.getWebPushInfo;
        infoFunction = function infoFunction() {
          return _this4.getWebPushInfo(_this4._currentSubscription, payload, vapidHeaders);
        };
        if (_this4._currentSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
          infoFunction = function infoFunction() {
            return _this4.getGCMInfo(_this4._currentSubscription, payload, _this4._API_KEY);
          };
        }

        var requestInfo = infoFunction();

        var curlCommand = 'curl "' + requestInfo.endpoint + '" --request POST';
        var curlError = null;

        document.querySelector('.js-endpoint').textContent = requestInfo.endpoint;
        var headersList = document.querySelector('.js-headers-list');
        while (headersList.hasChildNodes()) {
          headersList.removeChild(headersList.firstChild);
        }
        Object.keys(requestInfo.headers).forEach(function (header) {
          var liElement = document.createElement('p');
          liElement.innerHTML = '<span>' + header + '</span>: ' + ('' + requestInfo.headers[header]);
          headersList.appendChild(liElement);

          curlCommand += ' --header "' + header + ': ' + requestInfo.headers[header] + '"';
        });

        var bodyFormat = document.querySelector('.js-body-format');
        var bodyContent = document.querySelector('.js-body-content');
        if (requestInfo.body && requestInfo.body instanceof ArrayBuffer) {
          bodyFormat.textContent = 'Stream';
          bodyContent.textContent = 'Unable to display';

          curlCommand = null;
          curlError = 'Sorry, but because the web push ' + 'protocol requires a stream as the body of the request, there is ' + 'no CURL command that will stream an encrypted payload.';
        } else if (requestInfo.body) {
          bodyFormat.textContent = 'String';
          bodyContent.textContent = requestInfo.body;

          curlCommand += ' -d ' + JSON.stringify(requestInfo.body);
        } else {
          bodyFormat.textContent = 'No Body';
          bodyContent.textContent = 'N/A';
        }

        _this4._latestPushInfo = requestInfo;

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
        headers['Content-Encoding'] = 'aesgcm';
      }

      return {
        headers: headers,
        body: JSON.stringify(gcmAPIData),
        endpoint: 'https://android.googleapis.com/gcm/send'
      };
    }
  }, {
    key: 'getWebPushInfo',
    value: function getWebPushInfo(subscription, payload, vapidHeaders) {
      var body = null;
      var headers = {};
      headers.TTL = 60;

      if (payload) {
        body = payload.cipherText;

        headers.Encryption = 'salt=' + payload.salt;
        headers['Crypto-Key'] = 'dh=' + payload.publicServerKey;
        headers['Content-Encoding'] = 'aesgcm';
      } else {
        headers['Content-Length'] = 0;
      }

      if (vapidHeaders) {
        headers.Authorization = 'Bearer ' + vapidHeaders.bearer;

        if (headers['Crypto-Key']) {
          headers['Crypto-Key'] = headers['Crypto-Key'] + '; ' + ('p256ecdsa=' + vapidHeaders.p256ecdsa);
        } else {
          headers['Crypto-Key'] = 'p256ecdsa=' + vapidHeaders.p256ecdsa;
        }
      }

      var response = {
        headers: headers,
        endpoint: subscription.endpoint
      };

      if (body) {
        response.body = body;
      }

      return response;
    }
  }, {
    key: 'sendPushMessage',
    value: function sendPushMessage(subscription, payloadText) {
      var _this5 = this;

      // Let's look at payload
      var payloadPromise = Promise.resolve(null);
      if (payloadText && payloadText.trim().length > 0) {
        payloadPromise = EncryptionHelperFactory.generateHelper().then(function (encryptionHelper) {
          return encryptionHelper.encryptMessage(JSON.parse(JSON.stringify(_this5._currentSubscription)), payloadText);
        });
      }

      // Vapid support
      var vapidPromise = EncryptionHelperFactory.createVapidAuthHeader(this._applicationKeys, subscription.endpoint, 'mailto:simple-push-demo@gauntface.co.uk');

      return Promise.all([payloadPromise, vapidPromise]).then(function (results) {
        var payload = results[0];
        var vapidHeaders = results[1];

        var infoFunction = _this5.getWebPushInfo;
        infoFunction = function infoFunction() {
          return _this5.getWebPushInfo(subscription, payload, vapidHeaders);
        };
        if (subscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
          infoFunction = function infoFunction() {
            return _this5.getGCMInfo(subscription, payload, _this5._API_KEY);
          };
        }

        var requestInfo = infoFunction();

        // Some push services don't allow CORS so have to forward
        // it to a different server to make the request which does support
        // CORs

        _this5.sendRequestToProxyServer(requestInfo);
      });
    }
  }, {
    key: 'sendRequestToProxyServer',
    value: function sendRequestToProxyServer(requestInfo) {
      var _this6 = this;

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

      fetch('https://simple-push-demo.appspot.com/api/v2/sendpush', fetchOptions).then(function (response) {
        if (response.status >= 400 && response.status < 500) {
          console.log('Failed web push response: ', response, response.status);
          throw new Error('Failed to send push message via web push protocol');
        }
      }).catch(function (err) {
        _this6.showErrorMessage('Ooops Unable to Send a Push', err);
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
  window.AppController = AppController;
}