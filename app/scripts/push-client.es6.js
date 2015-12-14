'use strict';

export default class PushClient {

  constructor(stateChangeCb, subscriptionUpdate) {
    this._stateChangeCb = stateChangeCb;
    this._subscriptionUpdate = subscriptionUpdate;

    this.state = {
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
      this._stateChangeCb(this.state.UNSUPPORTED);
      return;
    }

    if (!('PushManager' in window)) {
      this._stateChangeCb(this.state.UNSUPPORTED);
      return;
    }

    if (!('permissions' in navigator)) {
      this._stateChangeCb(this.state.UNSUPPORTED);
      return;
    }

    if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
      this._stateChangeCb(this.state.UNSUPPORTED);
      return;
    }

    navigator.serviceWorker.ready.then(() => {
      this._stateChangeCb(this.state.INITIALISING);
      this.setUpPushPermission();
    });
  }

  _permissionStateChange(permissionState) {
    // console.log('PushClient.permissionStateChange(): ', permissionState);
    // If the notification permission is denied, it's a permanent block
    switch (permissionState.state) {
    case 'denied':
      this._stateChangeCb(this.state.PERMISSION_DENIED);
      break;
    case 'granted':
      this._stateChangeCb(this.state.PERMISSION_GRANTED);
      break;
    case 'prompt':
      this._stateChangeCb(this.state.PERMISSION_PROMPT);
      break;
    default:
      break;
    }
  }

  setUpPushPermission() {
    console.log('PushClient.setUpPushPermission()');
    navigator.permissions.query({name: 'push', userVisibleOnly: true})
    .then((permissionState) => {
      // Set the initial state
      this._permissionStateChange(permissionState);

      // Handle Permission State Changes
      permissionState.onchange = () => {
        this._permissionStateChange(this);
      };

      // Check what the current push state is
      return navigator.serviceWorker.ready;
    })
    .then((serviceWorkerRegistration) => {
      // Let's see if we have a subscription already
      return serviceWorkerRegistration.pushManager.getSubscription();
    })
    .then((subscription) => {
      if (!subscription) {
        // NOOP since we have no subscription and the permission state
        // will inform whether to enable or disable the push UI
        return;
      }

      this._stateChangeCb(this.state.SUBSCRIBED);

      // Update the current state with the
      // subscriptionid and endpoint
      this._subscriptionUpdate(subscription);
    })
    .catch((err) => {
      console.log('PushClient.setUpPushPermission() Error', err);
      this._stateChangeCb(this.state.ERROR, err);
    });
  }

  subscribeDevice() {
    console.log('PushClient.subscribeDevice()');

    this._stateChangeCb(this.state.STARTING_SUBSCRIBE);


    // We need the service worker registration to access the push manager
    navigator.serviceWorker.ready
    .then((serviceWorkerRegistration) => {
      return serviceWorkerRegistration.pushManager.subscribe(
        {userVisibleOnly: true}
      );
    })
    .then((subscription) => {
      this._stateChangeCb(this.state.SUBSCRIBED);
      this._subscriptionUpdate(subscription);
    })
    .catch((subscriptionErr) => {
      console.log('PushClient.subscribeDevice() Error', subscriptionErr);

      // Check for a permission prompt issue
      return navigator.permissions.query({name: 'push', userVisibleOnly: true})
      .then((permissionState) => {
        this._permissionStateChange(permissionState);

        // window.PushDemo.ui.setPushChecked(false);
        if (permissionState.state !== 'denied' &&
        permissionState.state !== 'prompt') {
          // If the permission wasnt denied or prompt, that means the
          // permission was accepted, so this must be an error
          this._stateChangeCb(this.state.ERROR, subscriptionErr);
        }
      });
    });
  }

  unsubscribeDevice() {
    console.log('PushClient.unsubscribeDevice()');
    // Disable the switch so it can't be changed while
    // we process permissions
    // window.PushDemo.ui.setPushSwitchDisabled(true);

    this._stateChangeCb(this.state.STARTING_UNSUBSCRIBE);

    navigator.serviceWorker.ready
    .then((serviceWorkerRegistration) => {
      return serviceWorkerRegistration.pushManager.getSubscription();
    })
    .then((pushSubscription) => {
      // Check we have everything we need to unsubscribe
      if (!pushSubscription) {
        this._stateChangeCb(this.state.UNSUBSCRIBED);
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
      })
      .catch(function(e) { });
    })
    .then(() => {
      this._stateChangeCb(this.state.UNSUBSCRIBED);
      this._subscriptionUpdate(null);
    })
    .catch((e) => {
      console.error('Error thrown while revoking push notifications. ' +
        'Most likely because push was never registered', e);
    });
  }
}
