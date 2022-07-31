/* eslint-env browser */

import {EncryptionFactory} from './encryption/encryption-factory.js';
import {APPLICATION_KEYS, BACKEND_ORIGIN} from './constants.js';
import {PushClient} from './push-client.js';
import {logger} from './logger.js';

class AppController {
	constructor() {
		this._encryptionHelper = EncryptionFactory.generateHelper();
		this._stateChangeListener = this._stateChangeListener.bind(this);
		this._subscriptionUpdate = this._subscriptionUpdate.bind(this);

		this._pushClient = new PushClient(
			this._stateChangeListener,
			this._subscriptionUpdate,
			APPLICATION_KEYS.publicKey,
		);

		// This div contains the UI for CURL commands to trigger a push
		this._sendPushOptions = getElement('.js-send-push-options');
		this._subscriptionJSONCode = getElement('.js-subscription-json');
		this._payloadContainer = getElement('.js-payload-textfield-container');
		this._infoPayload = getElement('.js-endpoint');
		this._infoHeadersTable = getElement('.js-headers-table');
		this._infoBodyTable = getElement('.js-request-body-table');
		this._curlElement = getElement('.js-curl-code');
		this._payloadDownload = getElement('.js-payload-download');
		this._payloadLink = getElement('.js-payload-link');
		this._errorContainer = getElement('.js-error-message-container');
		this._errorTitle = getElement('.js-error-title');
		this._errorMessage = getElement('.js-error-message');

		this._encodingElement = getElement('.js-supported-content-encodings');
		this.setupEncoding();

		this._payloadTextField = getElement('.js-payload-textfield');
		this._payloadTextField.oninput = () => this.updatePushInfo();

		this._toggleSwitch = getElement('.js-enable-checkbox');
		this._toggleSwitch.addEventListener('click', () => this.togglePush());

		this._sendPush = getElement('.js-send-push-button');
		this._sendPush.addEventListener('click', () => this.sendPushMessage());
	}

	setupEncoding() {
		const encodings = EncryptionFactory.supportedEncodings();
		this._encodingElement.textContent = JSON.stringify(encodings, null, 2);
	}

	togglePush() {
		if (this._toggleSwitch.checked) {
			this._pushClient.subscribeDevice();
		} else {
			this._pushClient.unsubscribeDevice();
		}
	}

	registerServiceWorker() {
		// Check that service workers are supported
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('./service-worker.js')
				.catch((err) => {
					logger.error(err);
					this.showErrorMessage(
						'Unable to Register SW',
						'Sorry this demo requires a service worker to work and it ' +
                'failed to install - sorry :(',
					);
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
				this._toggleSwitch.disabled = false;
			} else {
				this._toggleSwitch.disabled = true;
			}
		}

		if (typeof state.pushEnabled !== 'undefined') {
			if (state.pushEnabled) {
				this._toggleSwitch.checked = true;
			} else {
				this._toggleSwitch.checked = false;
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
		const subscriptionObject = JSON.parse(JSON.stringify(subscription));
		if (
			subscriptionObject &&
      subscriptionObject.keys &&
      subscriptionObject.keys.auth &&
      subscriptionObject.keys.p256dh) {
			this._payloadContainer.classList.remove('hidden');
		} else {
			this._payloadContainer.classList.add('hidden');
		}

		this.updatePushInfo();

		// Display the UI
		this._sendPushOptions.style.opacity = 1;
	}

	async updatePushInfo() {
		// Let's look at payload
		const pt = this._payloadTextField.value;
		const s = this._currentSubscription;
		const reqDetails = await this._encryptionHelper.getRequestDetails(s, pt);

		const curlCommandParts = [
			'curl',
			`"${reqDetails.endpoint}"`,
			'--request POST',
		];

		this._infoPayload.textContent = reqDetails.endpoint;

		this._infoHeadersTable.innerHTML = '';

		Object.keys(reqDetails.headers).forEach((header) => {
			const value = reqDetails.headers[header];

			const row = document.createElement('tr');
			row.innerHTML = `<th>${header}</th><td>${value}</td>`;
			this._infoHeadersTable.appendChild(row);

			curlCommandParts.push(`--header "${header}: ${value}"`);
		});

		const bodyDetails = {
			Type: 'No Body',
			Content: 'N/A',
		};
		if (reqDetails.body && reqDetails.body instanceof ArrayBuffer) {
			bodyDetails.Type =
        'Encrypted binary (see hexadecimal representation below)';
			bodyDetails.Content = this.toHex(reqDetails.body);

			curlCommandParts.push('--data-binary @payload.bin');

			this._payloadDownload.style.display = 'inline';

			const blob = new Blob([reqDetails.body]);
			this._payloadLink.href = URL.createObjectURL(blob);
			this._payloadLink.download = 'payload.bin';
		} else if (reqDetails.body) {
			bodyDetails.Type = 'String';
			bodyDetails.Content = reqDetails.body;

			curlCommandParts.push(`-d ${JSON.stringify(reqDetails.body)}`);

			this._payloadDownload.style.display = 'none';
		} else {
			this._payloadDownload.style.display = 'none';
		}

		this._infoBodyTable.innerHTML = '';
		for (const k of Object.keys(bodyDetails)) {
			const value = bodyDetails[k];
			const row = document.createElement('tr');
			row.innerHTML = `<th>${k}</th><td>${value}</td>`;
			this._infoBodyTable.appendChild(row);
		}

		this._curlElement.textContent = curlCommandParts.join(' \\' + '\n  ');
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

	async sendPushMessage() {
		if (!this._currentSubscription) {
			logger.error('Cannot send push because there is no subscription.');
			return;
		}

		const pt = this._payloadTextField.value;
		const s = this._currentSubscription;
		const reqDetails = await this._encryptionHelper.getRequestDetails(s, pt);
		// Some push services don't allow CORS so have to forward
		// it to a different server to make the request which does support
		// CORs
		return this.sendRequestToProxyServer(reqDetails);
	}

	async sendRequestToProxyServer(requestInfo) {
		logger.groupCollapsed('Sending push message via proxy server');
		console.log(requestInfo);
		logger.groupEnd();

		const fopts = {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
		};

		// Can't send a stream like is needed for web push protocol,
		// so needs to convert it to base 64 here and the server will
		// convert back and pass as a stream
		if (requestInfo.body && requestInfo.body instanceof ArrayBuffer) {
			requestInfo.body = this.toBase64(requestInfo.body);
			fopts.body = requestInfo;
		}

		fopts.body = JSON.stringify(requestInfo);

		try {
			const response = await fetch(`${BACKEND_ORIGIN}/api/v3/sendpush`, fopts);
			if (response.status >= 400 && response.status < 500) {
				const text = await response.text();
				logger.error('Failed web push response: ',
					response.status, response.statusText, text);
				throw new Error(
					`Failed to send push message via web push protocol: ` +
            `<pre>${encodeURI(text)}</pre>`);
			}
		} catch (err) {
			logger.error(err);
			this.showErrorMessage(
				'Ooops Unable to Send a Push',
				err,
			);
		}
	}

	toBase64(arrayBuffer, start, end) {
		start = start || 0;
		end = end || arrayBuffer.byteLength;

		const partialBuffer = new Uint8Array(arrayBuffer.slice(start, end));
		return window.btoa(String.fromCharCode.apply(null, partialBuffer));
	}

	toHex(arrayBuffer) {
		return [...new Uint8Array(arrayBuffer)]
			.map((x) => x.toString(16).padStart(2, '0'))
			.join(' ');
	}

	showErrorMessage(title, message) {
		this._errorTitle.textContent = title;
		this._errorMessage.innerHTML = message;
		this._errorContainer.style.opacity = 1;
		this._sendPushOptions.style.display = 'none';
	}
}

// This is a helper method so we get an error and log in case we delete or
// rename an element we expect to be in the DOM.
function getElement(selector) {
	const e = document.querySelector(selector);
	if (!e) {
		logger.error(`Failed to find element: '${selector}'`);
		throw new Error(`Failed to find element: '${selector}'`);
	}
	return e;
}

if (window) {
	window.onload = function() {
		if (window.location.host === 'gauntface.github.io' &&
      window.location.protocol !== 'https:') {
			// Enforce HTTPS
			logger.warn('Service workers are only available on secure origins.');
			window.location.protocol = 'https:';
		}

		if (!navigator.serviceWorker) {
			logger.warn('Service workers are not supported in this browser.');
			return;
		}

		if (!('PushManager' in window)) {
			logger.warn('Push is not supported in this browser.');
			return;
		}

		logger.debug('Setting up demo.');
		const appController = new AppController();
		appController.registerServiceWorker();
	};
}
