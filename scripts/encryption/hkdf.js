/* global HMAC */
/* eslint-env browser */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var HKDF = function () {
  function HKDF(ikm, salt) {
    _classCallCheck(this, HKDF);

    this._ikm = ikm;
    this._salt = salt;

    this._hmac = new HMAC(salt);
  }

  _createClass(HKDF, [{
    key: 'generate',
    value: function generate(info, byteLength) {
      var fullInfoBuffer = new Uint8Array(info.byteLength + 1);
      fullInfoBuffer.set(info, 0);
      fullInfoBuffer.set(new Uint8Array(1).fill(1), info.byteLength);

      return this._hmac.sign(this._ikm).then(function (prk) {
        var nextHmac = new HMAC(prk);
        return nextHmac.sign(fullInfoBuffer);
      }).then(function (nextPrk) {
        return nextPrk.slice(0, byteLength);
      });
    }
  }]);

  return HKDF;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.HKDF = HKDF;
} else if (module && module.exports) {
  module.exports = HKDF;
}