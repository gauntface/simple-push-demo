'use strict';

/* eslint-env browser */

import {base64UrlToUint8Array} from './encryption/helpers.js';
import {logger} from './logger.js';

export class PushClient {
	constructor(stateChangeCb, subscriptionUpdate, publicAppKey) {
		this._stateChangeCb = stateChangeCb;
		this._subscriptionUpdate = subscriptionUpdate;

		this._publicApplicationKey = base64UrlToUint8Array(publicAppKey);

		this._state = {
			UNSUPPORTED: {
				id: 'UNSUPPORTED',
				interactive: false,
				pushEnabled: false,
			},
			INITIALISING: {
				id: 'INITIALISING',
				interactive: false,
				pushEnabled: false,
			},
			PERMISSION_DENIED: {
				id: 'PERMISSION_DENIED',
				interactive: false,
				pushEnabled: false,
			},
			PERMISSION_GRANTED: {
				id: 'PERMISSION_GRANTED',
				interactive: true,
			},
			PERMISSION_PROMPT: {
				id: 'PERMISSION_PROMPT',
				interactive: true,
				pushEnabled: false,
			},
			ERROR: {
				id: 'ERROR',
				interactive: false,
				pushEnabled: false,
			},
			STARTING_SUBSCRIBE: {
				id: 'STARTING_SUBSCRIBE',
				interactive: false,
				pushEnabled: true,
			},
			SUBSCRIBED: {
				id: 'SUBSCRIBED',
				interactive: true,
				pushEnabled: true,
			},
			STARTING_UNSUBSCRIBE: {
				id: 'STARTING_UNSUBSCRIBE',
				interactive: false,
				pushEnabled: false,
			},
			UNSUBSCRIBED: {
				id: 'UNSUBSCRIBED',
				interactive: true,
				pushEnabled: false,
			},
		};

		if (!('serviceWorker' in navigator)) {
			this._stateChangeCb(this._state.UNSUPPORTED, 'Service worker not ' +
        'available on this browser');
			return;
		}

		if (!('PushManager' in window)) {
			this._stateChangeCb(this._state.UNSUPPORTED, 'PushManager not ' +
        'available on this browser');
			return;
		}

		if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
			this._stateChangeCb(this._state.UNSUPPORTED, 'Showing Notifications ' +
        'from a service worker is not available on this browser');
			return;
		}

		this.init();
	}

	async init() {
		await navigator.serviceWorker.ready;
		this._stateChangeCb(this._state.INITIALISING);
		this.setUpPushPermission();
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
			logger.error('Unexpected permission state: ', permissionState);
			break;
		}
	}

	async setUpPushPermission() {
		try {
			this._permissionStateChange(Notification.permission);

			const reg = await navigator.serviceWorker.ready;
			// Let's see if we have a subscription already
			const subscription = await reg.pushManager.getSubscription();
			// Update the current state with the
			// subscriptionid and endpoint
			this._subscriptionUpdate(subscription);
			if (!subscription) {
				// NOOP since we have no subscription and the permission state
				// will inform whether to enable or disable the push UI
				return;
			}

			this._stateChangeCb(this._state.SUBSCRIBED);
		} catch (err) {
			logger.error('setUpPushPermission() ', err);
			this._stateChangeCb(this._state.ERROR, err);
		}
	}

	async subscribeDevice() {
		this._stateChangeCb(this._state.STARTING_SUBSCRIBE);

		try {
			switch (Notification.permission) {
			case 'denied':
				throw new Error('Push messages are blocked.');
			case 'granted':
				break;
			default:
				await new Promise((resolve, reject) => {
					Notification.requestPermission((result) => {
						if (result !== 'granted') {
							reject(new Error('Bad permission result'));
						}

						resolve();
					});
				});
			}

			// We need the service worker registration to access the push manager
			try {
				const reg = await navigator.serviceWorker.ready;
				const subscription = await reg.pushManager.subscribe(
					{
						userVisibleOnly: true,
						applicationServerKey: this._publicApplicationKey,
					},
				);
				this._stateChangeCb(this._state.SUBSCRIBED);
				this._subscriptionUpdate(subscription);
			} catch (err) {
				this._stateChangeCb(this._state.ERROR, err);
			}
		} catch (err) {
			logger.error('subscribeDevice() ', err);
			// Check for a permission prompt issue
			this._permissionStateChange(Notification.permission);
		}
	}

	async unsubscribeDevice() {
		// Disable the switch so it can't be changed while
		// we process permissions
		// window.PushDemo.ui.setPushSwitchDisabled(true);

		this._stateChangeCb(this._state.STARTING_UNSUBSCRIBE);

		try {
			const reg = await navigator.serviceWorker.ready;
			const subscription = await reg.pushManager.getSubscription();

			// Check we have everything we need to unsubscribe
			if (!subscription) {
				this._stateChangeCb(this._state.UNSUBSCRIBED);
				this._subscriptionUpdate(null);
				return;
			}

			// You should remove the device details from the server
			// i.e. the  pushSubscription.endpoint
			const successful = await subscription.unsubscribe();
			if (!successful) {
				// The unsubscribe was unsuccessful, but we can
				// remove the subscriptionId from our server
				// and notifications will stop
				// This just may be in a bad state when the user returns
				logger.warn('We were unable to unregister from push');
			}

			this._stateChangeCb(this._state.UNSUBSCRIBED);
			this._subscriptionUpdate(null);
		} catch (err) {
			logger.error('Error thrown while revoking push notifications. ' +
        'Most likely because push was never registered', err);
		}
	}
}
