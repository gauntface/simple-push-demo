'use strict';

/* eslint-env browser */

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PushClient = function () {
  function PushClient(stateChangeCb, subscriptionUpdate, publicAppKey) {
    var _this = this;

    _classCallCheck(this, PushClient);

    this._stateChangeCb = stateChangeCb;
    this._subscriptionUpdate = subscriptionUpdate;

    this._publicApplicationKey = publicAppKey;

    this._state = {
      UNSUPPORTED: {
        id: 'UNSUPPORTED',
        interactive: false,
        pushEnabled: false
      },
      INITIALISING: {
        id: 'INITIALISING',
        interactive: false,
        pushEnabled: false
      },
      PERMISSION_DENIED: {
        id: 'PERMISSION_DENIED',
        interactive: false,
        pushEnabled: false
      },
      PERMISSION_GRANTED: {
        id: 'PERMISSION_GRANTED',
        interactive: true
      },
      PERMISSION_PROMPT: {
        id: 'PERMISSION_PROMPT',
        interactive: true,
        pushEnabled: false
      },
      ERROR: {
        id: 'ERROR',
        interactive: false,
        pushEnabled: false
      },
      STARTING_SUBSCRIBE: {
        id: 'STARTING_SUBSCRIBE',
        interactive: false,
        pushEnabled: true
      },
      SUBSCRIBED: {
        id: 'SUBSCRIBED',
        interactive: true,
        pushEnabled: true
      },
      STARTING_UNSUBSCRIBE: {
        id: 'STARTING_UNSUBSCRIBE',
        interactive: false,
        pushEnabled: false
      },
      UNSUBSCRIBED: {
        id: 'UNSUBSCRIBED',
        interactive: true,
        pushEnabled: false
      }
    };

    if (!('serviceWorker' in navigator)) {
      this._stateChangeCb(this._state.UNSUPPORTED, 'Service worker not ' + 'available on this browser');
      return;
    }

    if (!('PushManager' in window)) {
      this._stateChangeCb(this._state.UNSUPPORTED, 'PushManager not ' + 'available on this browser');
      return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      this._stateChangeCb(this._state.UNSUPPORTED, 'Showing Notifications ' + 'from a service worker is not available on this browser');
      return;
    }

    navigator.serviceWorker.ready.then(function () {
      _this._stateChangeCb(_this._state.INITIALISING);
      _this.setUpPushPermission();
    });
  }

  _createClass(PushClient, [{
    key: '_permissionStateChange',
    value: function _permissionStateChange(permissionState) {
      // If the notification permission is denied, it's a permanent block
      switch (permissionState) {
        case 'denied':
          this._stateChangeCb(this._state.PERMISSION_DENIED);
          break;
        case 'granted':
          this._stateChangeCb(this._state.PERMISSION_GRANTED);
          break;
        case 'default':
          this._stateChangeCb(this._state.PERMISSION_PROMPT);
          break;
        default:
          console.error('Unexpected permission state: ', permissionState);
          break;
      }
    }
  }, {
    key: 'setUpPushPermission',
    value: function setUpPushPermission() {
      var _this2 = this;

      this._permissionStateChange(Notification.permission);

      return navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        // Let's see if we have a subscription already
        return serviceWorkerRegistration.pushManager.getSubscription();
      }).then(function (subscription) {
        if (!subscription) {
          // NOOP since we have no subscription and the permission state
          // will inform whether to enable or disable the push UI
          return;
        }

        _this2._stateChangeCb(_this2._state.SUBSCRIBED);

        // Update the current state with the
        // subscriptionid and endpoint
        _this2._subscriptionUpdate(subscription);
      }).catch(function (err) {
        console.log('setUpPushPermission() ', err);
        _this2._stateChangeCb(_this2._state.ERROR, err);
      });
    }
  }, {
    key: 'subscribeDevice',
    value: function subscribeDevice() {
      var _this3 = this;

      this._stateChangeCb(this._state.STARTING_SUBSCRIBE);

      return new Promise(function (resolve, reject) {
        if (Notification.permission === 'denied') {
          return reject(new Error('Push messages are blocked.'));
        }

        if (Notification.permission === 'granted') {
          return resolve();
        }

        if (Notification.permission === 'default') {
          Notification.requestPermission(function (result) {
            if (result !== 'granted') {
              reject(new Error('Bad permission result'));
            }

            resolve();
          });
        }
      }).then(function () {
        // We need the service worker registration to access the push manager
        return navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
          var publicServerKey = new Uint8Array(65);
          publicServerKey[0] = 0x04;
          return serviceWorkerRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: _this3._publicApplicationKey
          });
        }).then(function (subscription) {
          _this3._stateChangeCb(_this3._state.SUBSCRIBED);
          _this3._subscriptionUpdate(subscription);
        }).catch(function (subscriptionErr) {
          _this3._stateChangeCb(_this3._state.ERROR, subscriptionErr);
        });
      }).catch(function () {
        // Check for a permission prompt issue
        _this3._permissionStateChange(Notification.permission);
      });
    }
  }, {
    key: 'unsubscribeDevice',
    value: function unsubscribeDevice() {
      var _this4 = this;

      // Disable the switch so it can't be changed while
      // we process permissions
      // window.PushDemo.ui.setPushSwitchDisabled(true);

      this._stateChangeCb(this._state.STARTING_UNSUBSCRIBE);

      navigator.serviceWorker.ready.then(function (serviceWorkerRegistration) {
        return serviceWorkerRegistration.pushManager.getSubscription();
      }).then(function (pushSubscription) {
        // Check we have everything we need to unsubscribe
        if (!pushSubscription) {
          _this4._stateChangeCb(_this4._state.UNSUBSCRIBED);
          _this4._subscriptionUpdate(null);
          return;
        }

        // You should remove the device details from the server
        // i.e. the  pushSubscription.endpoint
        return pushSubscription.unsubscribe().then(function (successful) {
          if (!successful) {
            // The unsubscribe was unsuccessful, but we can
            // remove the subscriptionId from our server
            // and notifications will stop
            // This just may be in a bad state when the user returns
            console.error('We were unable to unregister from push');
          }
        });
      }).then(function () {
        _this4._stateChangeCb(_this4._state.UNSUBSCRIBED);
        _this4._subscriptionUpdate(null);
      }).catch(function (err) {
        console.error('Error thrown while revoking push notifications. ' + 'Most likely because push was never registered', err);
      });
    }
  }]);

  return PushClient;
}();

if (window) {
  window.PushClient = PushClient;
}