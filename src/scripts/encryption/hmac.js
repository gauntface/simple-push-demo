/* eslint-env browser */

'use strict';

class HMAC {
  constructor(ikm) {
    this._ikm = ikm;
  }

  sign(input) {
    return crypto.subtle.importKey('raw', this._ikm,
      {name: 'HMAC', hash: 'SHA-256'}, false, ['sign'])
    .then((key) => {
      return crypto.subtle.sign('HMAC', key, input);
    });
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.HMAC = HMAC;
} else if (module && module.exports) {
  module.exports = HMAC;
}
