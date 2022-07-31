/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* eslint-env browser */

import {
	uint8ArrayToBase64Url,
	base64UrlToUint8Array} from './helpers.js';

export class VapidHelper2 {
	static async createVapidAuthHeader(vapidKeys, audience, subject, exp) {
		if (!audience) {
			return Promise.reject(new Error('Audience must be the origin of the ' +
				'server'));
		}

		if (!subject) {
			return Promise.reject(new Error('Subject must be either a mailto or ' +
        'http link'));
		}

		if (typeof exp !== 'number') {
			// The `exp` field will contain the current timestamp in UTC plus
			// twelve hours.
			exp = Math.floor((Date.now() / 1000) + 12 * 60 * 60);
		}

		const publicApplicationServerKey = base64UrlToUint8Array(
			vapidKeys.publicKey);
		const privateApplicationServerKey = base64UrlToUint8Array(
			vapidKeys.privateKey);

		// Ensure the audience is just the origin
		audience = new URL(audience).origin;

		const tokenHeader = {
			typ: 'JWT',
			alg: 'ES256',
		};

		const tokenBody = {
			aud: audience,
			exp: exp,
			sub: subject,
		};

		// Utility function for UTF-8 encoding a string to an ArrayBuffer.
		const utf8Encoder = new TextEncoder('utf-8');

		// The unsigned token is the concatenation of the URL-safe base64 encoded
		// header and body.
		const unsignedToken =
			uint8ArrayToBase64Url(
				utf8Encoder.encode(JSON.stringify(tokenHeader)),
			) + '.' + uint8ArrayToBase64Url(
				utf8Encoder.encode(JSON.stringify(tokenBody)),
			);

		// Sign the |unsignedToken| using ES256 (SHA-256 over ECDSA).
		const keyData = {
			kty: 'EC',
			crv: 'P-256',
			x: uint8ArrayToBase64Url(
				publicApplicationServerKey.subarray(1, 33)),
			y: uint8ArrayToBase64Url(
				publicApplicationServerKey.subarray(33, 65)),
			d: uint8ArrayToBase64Url(privateApplicationServerKey),
		};

		// Sign the |unsignedToken| with the server's private key to generate
		// the signature.
		const key = await crypto.subtle.importKey('jwk', keyData, {
			name: 'ECDSA', namedCurve: 'P-256',
		}, true, ['sign']);

		const signature = await crypto.subtle.sign({
			name: 'ECDSA',
			hash: {
				name: 'SHA-256',
			},
		}, key, utf8Encoder.encode(unsignedToken));

		const jsonWebToken = unsignedToken + '.' +
      uint8ArrayToBase64Url(new Uint8Array(signature));
		const p256ecdsa = uint8ArrayToBase64Url(publicApplicationServerKey);

		return {
			Authorization: `vapid t=${jsonWebToken}, k=${p256ecdsa}`,
		};
	}
}
