'use strict';

var HMAC = require('./hmac');

class HKDF {
  constructor(inputKeyingMaterial, salt) {
    this._salt = salt;
    this._ikm = inputKeyingMaterial;

    this._hmac = new HMAC(salt);
  }

  generate(info, byteLength) {
    var fullInfoBuffer = Buffer.concat([
      new Buffer(info, 'base64'),
      new Buffer(1).fill(1)
    ]);

    var prk = this._hmac.sign(this._ikm);

    var nextHmac = new HMAC(prk);
    var nextPrk = nextHmac.sign(fullInfoBuffer);
    return nextPrk.slice(0, byteLength);
  }
}

module.exports = HKDF;
