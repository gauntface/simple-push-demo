'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-env browser */
/* global HKDF */

var EncryptionHelperAESGCM = function () {
  function EncryptionHelperAESGCM() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, EncryptionHelperAESGCM);

    this._b64ServerKeys = options.serverKeys;
    this._b64Salt = options.salt;
    this._b4VapidKeys = options.vapidKeys;
  }

  _createClass(EncryptionHelperAESGCM, [{
    key: 'getServerKeys',
    value: function getServerKeys() {
      if (this._b64ServerKeys) {
        return window.arrayBuffersToCryptoKeys(window.base64UrlToUint8Array(this._b64ServerKeys.publicKey), window.base64UrlToUint8Array(this._b64ServerKeys.privateKey));
      }

      return EncryptionHelperAESGCM.generateServerKeys();
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

      return window.gauntface.VapidHelper1.createVapidAuthHeader(this.getVapidKeys(), subscription.endpoint, 'mailto:simple-push-demo@gauntface.co.uk').then(function (vapidHeaders) {
        return _this.encryptPayload(subscription, payloadText).then(function (encryptedPayloadDetails) {
          var body = null;
          var headers = {};
          headers.TTL = 60;

          if (encryptedPayloadDetails) {
            body = encryptedPayloadDetails.cipherText;

            headers.Encryption = 'salt=' + encryptedPayloadDetails.salt;
            headers['Crypto-Key'] = 'dh=' + encryptedPayloadDetails.publicServerKey;
            headers['Content-Encoding'] = 'aesgcm';
          } else {
            headers['Content-Length'] = 0;
          }

          if (vapidHeaders) {
            Object.keys(vapidHeaders).forEach(function (headerName) {
              if (headers[headerName]) {
                headers[headerName] = headers[headerName] + '; ' + vapidHeaders[headerName];
              } else {
                headers[headerName] = vapidHeaders[headerName];
              }
            });
          }

          var response = {
            headers: headers,
            endpoint: subscription.endpoint
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
            var paddingBytes = 0;
            var paddingUnit8Array = new Uint8Array(2 + paddingBytes);
            var utf8Encoder = new TextEncoder('utf-8');
            var payloadUint8Array = utf8Encoder.encode(payloadText);
            var recordUint8Array = new Uint8Array(paddingUnit8Array.byteLength + payloadUint8Array.byteLength);
            recordUint8Array.set(paddingUnit8Array, 0);
            recordUint8Array.set(payloadUint8Array, paddingUnit8Array.byteLength);

            var algorithm = {
              name: 'AES-GCM',
              tagLength: 128,
              iv: encryptionKeys.nonce
            };

            return crypto.subtle.encrypt(algorithm, encryptionKeys.contentEncryptionCryptoKey, recordUint8Array);
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
    key: '_generateContext',
    value: function _generateContext(subscription, serverKeys) {
      return Promise.resolve().then(function () {
        return window.arrayBuffersToCryptoKeys(subscription.getKey('p256dh'));
      }).then(function (keys) {
        return keys.publicKey;
      }).then(function (clientPublicKey) {
        return {
          clientPublicKey: clientPublicKey,
          serverPublicKey: serverKeys.publicKey
        };
      }).then(function (keysAsCryptoKeys) {
        return Promise.all([window.cryptoKeysToUint8Array(keysAsCryptoKeys.clientPublicKey), window.cryptoKeysToUint8Array(keysAsCryptoKeys.serverPublicKey)]).then(function (keysAsUint8) {
          return {
            clientPublicKey: keysAsUint8[0].publicKey,
            serverPublicKey: keysAsUint8[1].publicKey
          };
        });
      }).then(function (keys) {
        var utf8Encoder = new TextEncoder('utf-8');
        var labelUnit8Array = utf8Encoder.encode('P-256');
        var paddingUnit8Array = new Uint8Array(1).fill(0);

        var clientPublicKeyLengthUnit8Array = new Uint8Array(2);
        clientPublicKeyLengthUnit8Array[0] = 0x00;
        clientPublicKeyLengthUnit8Array[1] = keys.clientPublicKey.byteLength;

        var serverPublicKeyLengthBuffer = new Uint8Array(2);
        serverPublicKeyLengthBuffer[0] = 0x00;
        serverPublicKeyLengthBuffer[1] = keys.serverPublicKey.byteLength;

        return window.joinUint8Arrays([labelUnit8Array, paddingUnit8Array, clientPublicKeyLengthUnit8Array, keys.clientPublicKey, serverPublicKeyLengthBuffer, keys.serverPublicKey]);
      });
    }
  }, {
    key: '_generateCEKInfo',
    value: function _generateCEKInfo(subscription, serverKeys) {
      var _this3 = this;

      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: aesgcm');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return _this3._generateContext(subscription, serverKeys).then(function (contextBuffer) {
          return window.joinUint8Arrays([contentEncoding8Array, paddingUnit8Array, contextBuffer]);
        });
      });
    }
  }, {
    key: '_generateNonceInfo',
    value: function _generateNonceInfo(subscription, serverKeys) {
      var _this4 = this;

      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: nonce');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return _this4._generateContext(subscription, serverKeys).then(function (contextBuffer) {
          return window.joinUint8Arrays([contentEncoding8Array, paddingUnit8Array, contextBuffer]);
        });
      });
    }
  }, {
    key: '_generatePRK',
    value: function _generatePRK(subscription, serverKeys) {
      return this._getSharedSecret(subscription, serverKeys).then(function (sharedSecret) {
        var utf8Encoder = new TextEncoder('utf-8');
        var authInfoUint8Array = utf8Encoder.encode('Content-Encoding: auth\0');

        var hkdf = new HKDF(sharedSecret, subscription.getKey('auth'));
        return hkdf.generate(authInfoUint8Array, 32);
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
  }], [{
    key: 'generateServerKeys',
    value: function generateServerKeys() {
      // 'true' is to make the keys extractable
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    }
  }]);

  return EncryptionHelperAESGCM;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperAESGCM = EncryptionHelperAESGCM;
}