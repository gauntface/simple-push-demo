'use strict';

var crypto = require('crypto');

class HMAC {
  constructor(ikm) {
    this._ikm = ikm;
    this._hmac = crypto.createHmac('sha256', ikm);
  }

  sign(input) {
    var result = this._hmac.update(input).digest();
    return result;
  }
}

module.exports = HMAC;
