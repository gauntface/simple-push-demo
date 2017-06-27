'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* eslint-env browser */

// Length, in bytes, of the salt that should be used for the message.
var SALT_BYTES = 16;

var EncryptionHelperFactory = function () {
  function EncryptionHelperFactory() {
    _classCallCheck(this, EncryptionHelperFactory);
  }

  _createClass(EncryptionHelperFactory, null, [{
    key: 'generateHelper',
    value: function generateHelper(options) {
      var _this = this;

      return Promise.resolve().then(function () {
        var keyPromises = [];

        if (options && options.serverKeys) {
          keyPromises.push(_this.importKeys(options.serverKeys));
        } else {
          keyPromises.push(_this.generateKeys());
        }

        if (options && options.vapidKeys) {
          keyPromises.push(options.vapidKeys);
        }

        return Promise.all(keyPromises);
      }).then(function (results) {
        var salt = null;
        if (options && options.salt) {
          salt = window.base64UrlToUint8Array(options.salt);
        } else {
          salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
        }

        return new window.gauntface.EncryptionHelper(results[0], salt, results[1]);
      });
    }
  }, {
    key: 'importKeys',
    value: function importKeys(keys) {
      if (!keys || !keys.publicKey || !keys.privateKey) {
        return Promise.reject(new Error('Bad options for key import'));
      }

      return Promise.resolve().then(function () {
        return window.arrayBuffersToCryptoKeys(window.base64UrlToUint8Array(keys.publicKey), window.base64UrlToUint8Array(keys.privateKey));
      });
    }
  }, {
    key: 'generateKeys',
    value: function generateKeys() {
      // True is to make the keys extractable
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    }
  }]);

  return EncryptionHelperFactory;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
}