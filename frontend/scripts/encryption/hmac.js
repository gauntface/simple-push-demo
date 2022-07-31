/* eslint-env browser */

'use strict';

export class HMAC {
	constructor(ikm) {
		this._ikm = ikm;
	}

	async sign(input) {
		const key = await crypto.subtle.importKey('raw', this._ikm,
			{name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
		return crypto.subtle.sign('HMAC', key, input);
	}
}
