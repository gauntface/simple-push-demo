/* eslint-env browser */

'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var HMAC = function () {
  function HMAC(ikm) {
    _classCallCheck(this, HMAC);

    this._ikm = ikm;
  }

  _createClass(HMAC, [{
    key: 'sign',
    value: function sign(input) {
      return crypto.subtle.importKey('raw', this._ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then(function (key) {
        return crypto.subtle.sign('HMAC', key, input);
      });
    }
  }]);

  return HMAC;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.HMAC = HMAC;
} else if (module && module.exports) {
  module.exports = HMAC;
}