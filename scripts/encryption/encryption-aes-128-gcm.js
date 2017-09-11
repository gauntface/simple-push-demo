'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-env browser */
/* global HKDF */

var EncryptionHelperAES128GCM = function () {
  function EncryptionHelperAES128GCM() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, EncryptionHelperAES128GCM);

    this._b64ServerKeys = options.serverKeys;
    this._b64Salt = options.salt;
    this._b4VapidKeys = options.vapidKeys;
  }

  _createClass(EncryptionHelperAES128GCM, [{
    key: 'getServerKeys',
    value: function getServerKeys() {
      if (this._b64ServerKeys) {
        return window.arrayBuffersToCryptoKeys(window.base64UrlToUint8Array(this._b64ServerKeys.publicKey), window.base64UrlToUint8Array(this._b64ServerKeys.privateKey));
      }

      return EncryptionHelperAES128GCM.generateServerKeys();
    }
  }, {
    key: 'getSalt',
    value: function getSalt() {
      if (this._b64Salt) {
        return window.base64UrlToUint8Array(this._b64Salt);
      }

      return window.generateSalt();
    }
  }, {
    key: 'getVapidKeys',
    value: function getVapidKeys() {
      if (this._b4VapidKeys) {
        return this._b4VapidKeys;
      }

      return window.gauntface.CONSTANTS.APPLICATION_KEYS;
    }
  }, {
    key: 'getRequestDetails',
    value: function getRequestDetails(subscription, payloadText) {
      var _this = this;

      var vapidHelper = window.gauntface.VapidHelper1;

      var endpoint = subscription.endpoint;

      // Latest spec changes for VAPID is implemented on this custom FCM
      // endpoint. This is experimental and SHOULD NOT BE USED IN PRODUCTION
      // web apps.
      //
      // Need to get a proper feature detect in place for these vapid changes
      // https://github.com/mozilla-services/autopush/issues/879
      if (endpoint.indexOf('https://fcm.googleapis.com') === 0) {
        endpoint = endpoint.replace('fcm/send', 'wp');
        vapidHelper = window.gauntface.VapidHelper2;
      }

      return vapidHelper.createVapidAuthHeader(this.getVapidKeys(), subscription.endpoint, 'mailto:simple-push-demo@gauntface.co.uk').then(function (vapidHeaders) {
        return _this.encryptPayload(subscription, payloadText).then(function (encryptedPayloadDetails) {
          var body = null;
          var headers = {};
          headers.TTL = 60;

          if (encryptedPayloadDetails) {
            body = encryptedPayloadDetails.cipherText;
            headers['Content-Encoding'] = 'aes128gcm';
          } else {
            headers['Content-Length'] = 0;
          }

          if (vapidHeaders) {
            Object.keys(vapidHeaders).forEach(function (headerName) {
              headers[headerName] = vapidHeaders[headerName];
            });
          }

          var response = {
            headers: headers,
            endpoint: endpoint
          };

          if (body) {
            response.body = body;
          }

          return Promise.resolve(response);
        });
      });
    }
  }, {
    key: 'encryptPayload',
    value: function encryptPayload(subscription, payloadText) {
      var _this2 = this;

      if (!payloadText || payloadText.trim().length === 0) {
        return Promise.resolve(null);
      }

      var salt = this.getSalt();

      return this.getServerKeys().then(function (serverKeys) {
        return window.cryptoKeysToUint8Array(serverKeys.publicKey).then(function (exportedServerKeys) {
          return _this2._generateEncryptionKeys(subscription, salt, serverKeys).then(function (encryptionKeys) {
            return crypto.subtle.importKey('raw', encryptionKeys.contentEncryptionKey, 'AES-GCM', true, ['decrypt', 'encrypt']).then(function (contentEncryptionCryptoKey) {
              encryptionKeys.contentEncryptionCryptoKey = contentEncryptionCryptoKey;
              return encryptionKeys;
            });
          }).then(function (encryptionKeys) {
            var utf8Encoder = new TextEncoder('utf-8');
            var payloadUint8Array = utf8Encoder.encode(payloadText);

            var paddingBytes = 0;
            var paddingUnit8Array = new Uint8Array(1 + paddingBytes);
            paddingUnit8Array.fill(0);
            paddingUnit8Array[0] = 0x02;

            var recordUint8Array = window.joinUint8Arrays([payloadUint8Array, paddingUnit8Array]);

            var algorithm = {
              name: 'AES-GCM',
              tagLength: 128,
              iv: encryptionKeys.nonce
            };

            return crypto.subtle.encrypt(algorithm, encryptionKeys.contentEncryptionCryptoKey, recordUint8Array);
          }).then(function (encryptedPayloadArrayBuffer) {
            return _this2._addEncryptionContentCodingHeader(encryptedPayloadArrayBuffer, serverKeys, salt);
          }).then(function (encryptedPayloadArrayBuffer) {
            return {
              cipherText: encryptedPayloadArrayBuffer,
              salt: window.uint8ArrayToBase64Url(salt),
              publicServerKey: window.uint8ArrayToBase64Url(exportedServerKeys.publicKey)
            };
          });
        });
      });
    }
  }, {
    key: '_addEncryptionContentCodingHeader',
    value: function _addEncryptionContentCodingHeader(encryptedPayloadArrayBuffer, serverKeys, salt) {
      return window.cryptoKeysToUint8Array(serverKeys.publicKey).then(function (keys) {
        // Maximum record size.
        var recordSizeUint8Array = new Uint8Array([0x00, 0x00, 0x10, 0x00]);

        var serverPublicKeyLengthBuffer = new Uint8Array(1);
        serverPublicKeyLengthBuffer[0] = keys.publicKey.byteLength;

        var uint8arrays = [salt,
        // Record Size
        recordSizeUint8Array,
        // Service Public Key Length
        serverPublicKeyLengthBuffer,
        // Server Public Key
        keys.publicKey, new Uint8Array(encryptedPayloadArrayBuffer)];

        var joinedUint8Array = window.joinUint8Arrays(uint8arrays);
        return joinedUint8Array.buffer;
      });
    }
  }, {
    key: '_generateEncryptionKeys',
    value: function _generateEncryptionKeys(subscription, salt, serverKeys) {
      return Promise.all([this._generatePRK(subscription, serverKeys), this._generateCEKInfo(subscription, serverKeys), this._generateNonceInfo(subscription, serverKeys)]).then(function (results) {
        var prk = results[0];
        var cekInfo = results[1];
        var nonceInfo = results[2];

        var cekHKDF = new HKDF(prk, salt);
        var nonceHKDF = new HKDF(prk, salt);
        return Promise.all([cekHKDF.generate(cekInfo, 16), nonceHKDF.generate(nonceInfo, 12)]);
      }).then(function (results) {
        return {
          contentEncryptionKey: results[0],
          nonce: results[1]
        };
      });
    }
  }, {
    key: '_generateCEKInfo',
    value: function _generateCEKInfo(subscription, serverKeys) {
      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: aes128gcm');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return window.joinUint8Arrays([contentEncoding8Array, paddingUnit8Array]);
      });
    }
  }, {
    key: '_generateNonceInfo',
    value: function _generateNonceInfo(subscription, serverKeys) {
      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: nonce');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return window.joinUint8Arrays([contentEncoding8Array, paddingUnit8Array]);
      });
    }
  }, {
    key: '_generatePRK',
    value: function _generatePRK(subscription, serverKeys) {
      var _this3 = this;

      return this._getSharedSecret(subscription, serverKeys).then(function (sharedSecret) {
        return _this3._getKeyInfo(subscription, serverKeys).then(function (keyInfoUint8Array) {
          var hkdf = new HKDF(sharedSecret, subscription.getKey('auth'));
          return hkdf.generate(keyInfoUint8Array, 32);
        });
      });
    }
  }, {
    key: '_getSharedSecret',
    value: function _getSharedSecret(subscription, serverKeys) {
      return Promise.resolve().then(function () {
        return window.arrayBuffersToCryptoKeys(subscription.getKey('p256dh'));
      }).then(function (keys) {
        return keys.publicKey;
      }).then(function (publicKey) {
        if (!(publicKey instanceof CryptoKey)) {
          throw new Error('The publicKey must be a CryptoKey.');
        }

        var algorithm = {
          name: 'ECDH',
          namedCurve: 'P-256',
          public: publicKey
        };

        return crypto.subtle.deriveBits(algorithm, serverKeys.privateKey, 256);
      });
    }
  }, {
    key: '_getKeyInfo',
    value: function _getKeyInfo(subscription, serverKeys) {
      var utf8Encoder = new TextEncoder('utf-8');

      return window.cryptoKeysToUint8Array(serverKeys.publicKey).then(function (serverKeys) {
        return window.joinUint8Arrays([utf8Encoder.encode('WebPush: info'), new Uint8Array(1).fill(0), new Uint8Array(subscription.getKey('p256dh')), serverKeys.publicKey]);
      });
    }
  }], [{
    key: 'generateServerKeys',
    value: function generateServerKeys() {
      // 'true' is to make the keys extractable
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    }
  }]);

  return EncryptionHelperAES128GCM;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperAES128GCM = EncryptionHelperAES128GCM;
}