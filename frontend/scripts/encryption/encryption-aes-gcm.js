/* eslint-env browser */

import {
	uint8ArrayToBase64Url,
	base64UrlToUint8Array,
	joinUint8Arrays,
	arrayBuffersToCryptoKeys,
	cryptoKeysToUint8Array,
	generateSalt} from './helpers.js';
import {APPLICATION_KEYS} from '../constants.js';
import {VapidHelper1} from './vapid-helper-1.js';
import {HKDF} from './hkdf.js';

export class EncryptionAESGCM {
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

		return EncryptionAESGCM.generateServerKeys();
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
		const vapidHeaders = await VapidHelper1
			.createVapidAuthHeader(
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

			headers.Encryption = `salt=${encryptedPayloadDetails.salt}`;
			headers['Crypto-Key'] =
        `dh=${encryptedPayloadDetails.publicServerKey}`;
			headers['Content-Encoding'] = 'aesgcm';
		} else {
			headers['Content-Length'] = 0;
		}

		if (vapidHeaders) {
			Object.keys(vapidHeaders).forEach((headerName) => {
				if (headers[headerName]) {
					headers[headerName] =
            `${headers[headerName]}; ${vapidHeaders[headerName]}`;
				} else {
					headers[headerName] = vapidHeaders[headerName];
				}
			});
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

		const paddingBytes = 0;
		const paddingUnit8Array = new Uint8Array(2 + paddingBytes);
		const utf8Encoder = new TextEncoder('utf-8');
		const payloadUint8Array = utf8Encoder.encode(payloadText);
		const recordUint8Array = new Uint8Array(
			paddingUnit8Array.byteLength + payloadUint8Array.byteLength);
		recordUint8Array.set(paddingUnit8Array, 0);
		recordUint8Array.set(payloadUint8Array, paddingUnit8Array.byteLength);

		const algorithm = {
			name: 'AES-GCM',
			tagLength: 128,
			iv: encryptionKeys.nonce,
		};

		const encryptedPayloadArrayBuffer = await crypto.subtle.encrypt(
			algorithm, encryptionKeys.contentEncryptionCryptoKey,
			recordUint8Array,
		);

		return {
			cipherText: encryptedPayloadArrayBuffer,
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

	async _generateEncryptionKeys(subscription, salt, serverKeys) {
		const results = await Promise.all([
			this._generatePRK(subscription, serverKeys),
			this._generateCEKInfo(subscription, serverKeys),
			this._generateNonceInfo(subscription, serverKeys),
		]);

		const prk = results[0];
		const cekInfo = results[1];
		const nonceInfo = results[2];

		const cekHKDF = new HKDF(prk, salt);
		const nonceHKDF = new HKDF(prk, salt);

		const finalKeys = await Promise.all([
			cekHKDF.generate(cekInfo, 16),
			nonceHKDF.generate(nonceInfo, 12),
		]);

		return {
			contentEncryptionKey: finalKeys[0],
			nonce: finalKeys[1],
		};
	}

	async _generateContext(subscription, serverKeys) {
		const cryptoKeys = await arrayBuffersToCryptoKeys(
			subscription.getKey('p256dh'));
		const keysAsCryptoKeys = {
			clientPublicKey: cryptoKeys.publicKey,
			serverPublicKey: serverKeys.publicKey,
		};
		const keysAsUint8 = await Promise.all([
			cryptoKeysToUint8Array(keysAsCryptoKeys.clientPublicKey),
			cryptoKeysToUint8Array(keysAsCryptoKeys.serverPublicKey),
		]);
		const keys = {
			clientPublicKey: keysAsUint8[0].publicKey,
			serverPublicKey: keysAsUint8[1].publicKey,
		};

		const utf8Encoder = new TextEncoder('utf-8');
		const labelUnit8Array = utf8Encoder.encode('P-256');
		const paddingUnit8Array = new Uint8Array(1).fill(0);

		const clientPublicKeyLengthUnit8Array = new Uint8Array(2);
		clientPublicKeyLengthUnit8Array[0] = 0x00;
		clientPublicKeyLengthUnit8Array[1] = keys.clientPublicKey.byteLength;

		const serverPublicKeyLengthBuffer = new Uint8Array(2);
		serverPublicKeyLengthBuffer[0] = 0x00;
		serverPublicKeyLengthBuffer[1] = keys.serverPublicKey.byteLength;

		return joinUint8Arrays([
			labelUnit8Array,
			paddingUnit8Array,
			clientPublicKeyLengthUnit8Array,
			keys.clientPublicKey,
			serverPublicKeyLengthBuffer,
			keys.serverPublicKey,
		]);
	}

	async _generateCEKInfo(subscription, serverKeys) {
		const utf8Encoder = new TextEncoder('utf-8');
		const contentEncoding8Array = utf8Encoder
			.encode('Content-Encoding: aesgcm');
		const paddingUnit8Array = new Uint8Array(1).fill(0);
		const contextBuffer = await this._generateContext(subscription, serverKeys);
		return joinUint8Arrays([
			contentEncoding8Array,
			paddingUnit8Array,
			contextBuffer,
		]);
	}

	async _generateNonceInfo(subscription, serverKeys) {
		const utf8Encoder = new TextEncoder('utf-8');
		const contentEncoding8Array = utf8Encoder
			.encode('Content-Encoding: nonce');
		const paddingUnit8Array = new Uint8Array(1).fill(0);
		const contextBuffer = await this._generateContext(subscription, serverKeys);
		return joinUint8Arrays([
			contentEncoding8Array,
			paddingUnit8Array,
			contextBuffer,
		]);
	}

	async _generatePRK(subscription, serverKeys) {
		const sharedSecret = await this._getSharedSecret(subscription, serverKeys);
		const utf8Encoder = new TextEncoder('utf-8');
		const authInfoUint8Array = utf8Encoder
			.encode('Content-Encoding: auth\0');

		const hkdf = new HKDF(
			sharedSecret,
			subscription.getKey('auth'));
		return hkdf.generate(authInfoUint8Array, 32);
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
}
