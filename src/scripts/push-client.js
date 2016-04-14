'use strict';

/* eslint-env browser */

export default class PushClient {

  constructor(stateChangeCb, subscriptionUpdate) {
    this._stateChangeCb = stateChangeCb;
    this._subscriptionUpdate = subscriptionUpdate;

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
      this._stateChangeCb(this._state.UNSUPPORTED);
      return;
    }

    if (!('PushManager' in window)) {
      this._stateChangeCb(this._state.UNSUPPORTED);
      return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      this._stateChangeCb(this._state.UNSUPPORTED);
      return;
    }

    navigator.serviceWorker.ready.then(() => {
      this._stateChangeCb(this._state.INITIALISING);
      this.setUpPushPermission();
    });
  }

  _permissionStateChange(permissionState) {
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

  setUpPushPermission() {
    this._permissionStateChange(Notification.permission);

    return navigator.serviceWorker.ready
    .then(serviceWorkerRegistration => {
      // Let's see if we have a subscription already
      return serviceWorkerRegistration.pushManager.getSubscription();
    })
    .then(subscription => {
      if (!subscription) {
        // NOOP since we have no subscription and the permission state
        // will inform whether to enable or disable the push UI
        return;
      }

      this._stateChangeCb(this._state.SUBSCRIBED);

      // Update the current state with the
      // subscriptionid and endpoint
      this._subscriptionUpdate(subscription);
    })
    .catch(err => {
      console.log(err);
      this._stateChangeCb(this._state.ERROR, err);
    });
  }

  subscribeDevice() {
    this._stateChangeCb(this._state.STARTING_SUBSCRIBE);

    // We need the service worker registration to access the push manager
    navigator.serviceWorker.ready
    .then(serviceWorkerRegistration => {
      return serviceWorkerRegistration.pushManager.subscribe(
        {userVisibleOnly: true}
      );
    })
    .then(subscription => {
      this._stateChangeCb(this._state.SUBSCRIBED);
      this._subscriptionUpdate(subscription);
    })
    .catch(subscriptionErr => {
      // Check for a permission prompt issue
      this._permissionStateChange(Notification.permission);

      if (Notification.permission !== 'denied' &&
      Notification.permission !== 'default') {
        // If the permission wasnt denied or prompt, that means the
        // permission was accepted, so this must be an error
        this._stateChangeCb(this._state.ERROR, subscriptionErr);
      }
    });
  }

  unsubscribeDevice() {
    // Disable the switch so it can't be changed while
    // we process permissions
    // window.PushDemo.ui.setPushSwitchDisabled(true);

    this._stateChangeCb(this._state.STARTING_UNSUBSCRIBE);

    navigator.serviceWorker.ready
    .then(serviceWorkerRegistration => {
      return serviceWorkerRegistration.pushManager.getSubscription();
    })
    .then(pushSubscription => {
      // Check we have everything we need to unsubscribe
      if (!pushSubscription) {
        this._stateChangeCb(this._state.UNSUBSCRIBED);
        this._subscriptionUpdate(null);
        return;
      }

      // TODO: Remove the device details from the server
      // i.e. the pushSubscription.subscriptionId and
      // pushSubscription.endpoint
      return pushSubscription.unsubscribe()
      .then(function(successful) {
        if (!successful) {
          // The unsubscribe was unsuccessful, but we can
          // remove the subscriptionId from our server
          // and notifications will stop
          // This just may be in a bad state when the user returns
          console.error('We were unable to unregister from push');
        }
      });
    })
    .then(() => {
      this._stateChangeCb(this._state.UNSUBSCRIBED);
      this._subscriptionUpdate(null);
    })
    .catch(err => {
      console.error('Error thrown while revoking push notifications. ' +
        'Most likely because push was never registered', err);
    });
  }
}
