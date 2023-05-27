/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

import {EncryptionAESGCM} from './encryption-aes-gcm.js';
import {EncryptionAES128GCM}
	from './encryption-aes-128-gcm.js';

/* eslint-env browser */

export class EncryptionFactory {
	static supportedEncodings() {
		if (PushManager.supportedContentEncodings) {
			return PushManager.supportedContentEncodings;
		}
		// All push providers are required to support aes128gcm.
		// https://w3c.github.io/push-api/#dom-pushmanager-supportedcontentencodings
		return ['aes128gcm'];
	}
	static generateHelper() {
		const encodings = this.supportedEncodings();
		for (const e of encodings) {
			switch (e) {
			case 'aes128gcm':
				return new EncryptionAES128GCM();
			case 'aesgcm':
				return new EncryptionAESGCM();
			default:
				console.warn(`Unknown content encoding: ${e}`);
			}
		}

		console.error(`Failed to find a known encoding: `, encodings);
		throw new Error('Unable to find a known encoding');
	}
}
