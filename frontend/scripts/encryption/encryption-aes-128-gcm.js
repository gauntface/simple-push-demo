/* eslint-env browser */

import {
	uint8ArrayToBase64Url,
	base64UrlToUint8Array,
	joinUint8Arrays,
	arrayBuffersToCryptoKeys,
	cryptoKeysToUint8Array,
	generateSalt} from './helpers.js';
import {HKDF} from './hkdf.js';
import {APPLICATION_KEYS} from '../constants.js';
import {VapidHelper2} from './vapid-helper-2.js';

export class EncryptionAES128GCM {
	constructor(options = {}) {
		this._b64ServerKeys = options.serverKeys;
		this._b64Salt = options.salt;
		this._b4VapidKeys = options.vapidKeys;
	}

	getServerKeys() {
		if (this._b64ServerKeys) {
			return arrayBuffersToCryptoKeys(
				base64UrlToUint8Array(this._b64ServerKeys.publicKey),
				base64UrlToUint8Array(this._b64ServerKeys.privateKey),
			);
		}

		return EncryptionAES128GCM.generateServerKeys();
	}

	getSalt() {
		if (this._b64Salt) {
			return base64UrlToUint8Array(this._b64Salt);
		}

		return generateSalt();
	}

	getVapidKeys() {
		if (this._b4VapidKeys) {
			return this._b4VapidKeys;
		}

		return APPLICATION_KEYS;
	}

	async getRequestDetails(subscription, payloadText) {
		const vapidHelper = VapidHelper2;

		const endpoint = subscription.endpoint;

		const vapidHeaders = await vapidHelper.createVapidAuthHeader(
			this.getVapidKeys(),
			subscription.endpoint,
			'mailto:simple-push-demo@gauntface.co.uk');
		const encryptedPayloadDetails = await this.encryptPayload(
			subscription, payloadText);

		let body = null;
		const headers = {};
		headers.TTL = 60;

		if (encryptedPayloadDetails) {
			body = encryptedPayloadDetails.cipherText;
			headers['Content-Encoding'] = 'aes128gcm';
		} else {
			headers['Content-Length'] = 0;
		}

		if (vapidHeaders) {
			Object.keys(vapidHeaders).forEach((headerName) => {
				headers[headerName] = vapidHeaders[headerName];
			});
		}

		const response = {
			headers: headers,
			endpoint,
		};

		if (body) {
			response.body = body;
		}

		return response;
	}

	async encryptPayload(subscription, payloadText) {
		if (!payloadText || payloadText.trim().length === 0) {
			return Promise.resolve(null);
		}

		const salt = this.getSalt();

		const serverKeys = await this.getServerKeys();
		const exportedServerKeys = await cryptoKeysToUint8Array(
			serverKeys.publicKey);
		const encryptionKeys = await this._generateEncryptionKeys(
			subscription, salt, serverKeys);

		const contentEncryptionCryptoKey = await crypto.subtle.importKey('raw',
			encryptionKeys.contentEncryptionKey, 'AES-GCM', true,
			['decrypt', 'encrypt']);
		encryptionKeys.contentEncryptionCryptoKey = contentEncryptionCryptoKey;

		const utf8Encoder = new TextEncoder('utf-8');
		const payloadUint8Array = utf8Encoder.encode(payloadText);

		const paddingBytes = 0;
		const paddingUnit8Array = new Uint8Array(1 + paddingBytes);
		paddingUnit8Array.fill(0);
		paddingUnit8Array[0] = 0x02;

		const recordUint8Array = joinUint8Arrays([
			payloadUint8Array,
			paddingUnit8Array,
		]);

		const algorithm = {
			name: 'AES-GCM',
			tagLength: 128,
			iv: encryptionKeys.nonce,
		};

		const encryptedPayloadArrayBuffer = await crypto.subtle.encrypt(
			algorithm, encryptionKeys.contentEncryptionCryptoKey,
			recordUint8Array,
		);
		const payloadWithHeaders = await this._addEncryptionContentCodingHeader(
			encryptedPayloadArrayBuffer,
			serverKeys,
			salt);
		return {
			cipherText: payloadWithHeaders,
			salt: uint8ArrayToBase64Url(salt),
			publicServerKey: uint8ArrayToBase64Url(
				exportedServerKeys.publicKey),
		};
	}

	static generateServerKeys() {
		// 'true' is to make the keys extractable
		return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
			true, ['deriveBits']);
	}

	async _addEncryptionContentCodingHeader(
		encryptedPayloadArrayBuffer, serverKeys, salt) {
		const keys = await cryptoKeysToUint8Array(serverKeys.publicKey);
		// Maximum record size.
		const recordSizeUint8Array = new Uint8Array([0x00, 0x00, 0x10, 0x00]);

		const serverPublicKeyLengthBuffer = new Uint8Array(1);
		serverPublicKeyLengthBuffer[0] = keys.publicKey.byteLength;

		const uint8arrays = [
			salt,
			// Record Size
			recordSizeUint8Array,
			// Service Public Key Length
			serverPublicKeyLengthBuffer,
			// Server Public Key
			keys.publicKey,
			new Uint8Array(encryptedPayloadArrayBuffer),
		];

		const joinedUint8Array = joinUint8Arrays(uint8arrays);
		return joinedUint8Array.buffer;
	}

	async _generateEncryptionKeys(subscription, salt, serverKeys) {
		const infoResults = await Promise.all([
			this._generatePRK(subscription, serverKeys),
			this._generateCEKInfo(subscription, serverKeys),
			this._generateNonceInfo(subscription, serverKeys),
		]);

		const prk = infoResults[0];
		const cekInfo = infoResults[1];
		const nonceInfo = infoResults[2];

		const cekHKDF = new HKDF(prk, salt);
		const nonceHKDF = new HKDF(prk, salt);
		const keyResults = await Promise.all([
			cekHKDF.generate(cekInfo, 16),
			nonceHKDF.generate(nonceInfo, 12),
		]);
		return {
			contentEncryptionKey: keyResults[0],
			nonce: keyResults[1],
		};
	}

	_generateCEKInfo() {
		const utf8Encoder = new TextEncoder('utf-8');
		const contentEncoding8Array = utf8Encoder
			.encode('Content-Encoding: aes128gcm');
		const paddingUnit8Array = new Uint8Array(1).fill(0);
		return joinUint8Arrays([
			contentEncoding8Array,
			paddingUnit8Array,
		]);
	}

	_generateNonceInfo() {
		const utf8Encoder = new TextEncoder('utf-8');
		const contentEncoding8Array = utf8Encoder
			.encode('Content-Encoding: nonce');
		const paddingUnit8Array = new Uint8Array(1).fill(0);
		return joinUint8Arrays([
			contentEncoding8Array,
			paddingUnit8Array,
		]);
	}

	async _generatePRK(subscription, serverKeys) {
		const sharedSecret = await this._getSharedSecret(subscription, serverKeys);

		const keyInfoUint8Array = await this._getKeyInfo(subscription, serverKeys);
		const hkdf = new HKDF(
			sharedSecret,
			subscription.getKey('auth'),
		);
		return hkdf.generate(keyInfoUint8Array, 32);
	}

	async _getSharedSecret(subscription, serverKeys) {
		const keys = await arrayBuffersToCryptoKeys(
			subscription.getKey('p256dh'));
		if (!(keys.publicKey instanceof CryptoKey)) {
			throw new Error('The publicKey must be a CryptoKey.');
		}

		const algorithm = {
			name: 'ECDH',
			namedCurve: 'P-256',
			public: keys.publicKey,
		};

		return crypto.subtle.deriveBits(
			algorithm, serverKeys.privateKey, 256);
	}

	async _getKeyInfo(subscription, serverKeys) {
		const utf8Encoder = new TextEncoder('utf-8');

		const keyInfo = await cryptoKeysToUint8Array(serverKeys.publicKey);
		return joinUint8Arrays([
			utf8Encoder.encode('WebPush: info'),
			new Uint8Array(1).fill(0),
			new Uint8Array(subscription.getKey('p256dh')),
			keyInfo.publicKey,
		]);
	}
}
