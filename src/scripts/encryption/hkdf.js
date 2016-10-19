/* global HMAC */
/* eslint-env browser */

'use strict';

class HKDF {
  constructor(ikm, salt) {
    this._ikm = ikm;
    this._salt = salt;

    this._hmac = new HMAC(salt);
  }

  generate(info, byteLength) {
    const fullInfoBuffer = new Uint8Array(info.byteLength + 1);
    fullInfoBuffer.set(info, 0);
    fullInfoBuffer.set(new Uint8Array(1).fill(1), info.byteLength);

    return this._hmac.sign(this._ikm)
    .then((prk) => {
      const nextHmac = new HMAC(prk);
      return nextHmac.sign(fullInfoBuffer);
    })
    .then((nextPrk) => {
      return nextPrk.slice(0, byteLength);
    });
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.HKDF = HKDF;
} else if (module && module.exports) {
  module.exports = HKDF;
}
