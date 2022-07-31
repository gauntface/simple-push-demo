/* eslint-env browser */

'use strict';

import {HMAC} from './hmac.js';

export class HKDF {
	constructor(ikm, salt) {
		this._ikm = ikm;
		this._salt = salt;

		this._hmac = new HMAC(salt);
	}

	async generate(info, byteLength) {
		const fullInfoBuffer = new Uint8Array(info.byteLength + 1);
		fullInfoBuffer.set(info, 0);
		fullInfoBuffer.set(new Uint8Array(1).fill(1), info.byteLength);

		const prk = await this._hmac.sign(this._ikm);
		const nextHmac = new HMAC(prk);
		const nextPrk = await nextHmac.sign(fullInfoBuffer);
		return nextPrk.slice(0, byteLength);
	}
}
