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

var EncryptionHelperFactory = function () {
  function EncryptionHelperFactory() {
    _classCallCheck(this, EncryptionHelperFactory);
  }

  _createClass(EncryptionHelperFactory, null, [{
    key: 'generateHelper',
    value: function generateHelper() {
      var supportedContentEncodings = ['aesgcm'];
      if (PushManager.supportedContentEncodings) {
        supportedContentEncodings = PushManager.supportedContentEncodings;
      }

      switch (supportedContentEncodings[0]) {
        case 'aesgcm':
          return new window.gauntface.EncryptionHelperAESGCM();
        case 'aes128gcm':
          return new window.gauntface.EncryptionHelperAES128GCM();
        default:
          throw new Error('Unknown content encoding: ' + supportedContentEncodings[0]);
      }
    }
  }]);

  return EncryptionHelperFactory;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
}