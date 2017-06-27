'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* global HKDF */
/* eslint-env browser */

var EncryptionHelper = function () {
  function EncryptionHelper(serverKeys, salt, vapidKeys) {
    _classCallCheck(this, EncryptionHelper);

    if (!serverKeys || !serverKeys.publicKey || !serverKeys.privateKey) {
      throw new Error('Bad server keys. Use ' + 'EncryptionHelperFactory.generateKeys()');
    }

    if (!salt) {
      throw new Error('Bad salt value. Use ' + 'EncryptionHelperFactory.generateSalt()');
    }

    if (vapidKeys && (!vapidKeys.publicKey || !vapidKeys.privateKey)) {
      throw new Error('Bad VAPID keys. Use ' + 'EncryptionHelperFactory.generateVapidKeys()');
    }

    this._serverKeys = serverKeys;
    this._salt = salt;
    this._vapidKeys = vapidKeys;
  }

  _createClass(EncryptionHelper, [{
    key: 'getSharedSecret',
    value: function getSharedSecret(subscription) {
      var _this = this;

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

        return crypto.subtle.deriveBits(algorithm, _this.serverKeys.privateKey, 256);
      });
    }
  }, {
    key: 'getKeyInfo',
    value: function getKeyInfo(subscription) {
      var utf8Encoder = new TextEncoder('utf-8');

      return window.cryptoKeysToUint8Array(this.serverKeys.publicKey).then(function (uint8keys) {
        return window.joinUint8Arrays([utf8Encoder.encode('WebPush: info'), new Uint8Array(1).fill(0), new Uint8Array(subscription.getKey('p256dh')), uint8keys.publicKey]);
      });
    }
  }, {
    key: 'generatePRK',
    value: function generatePRK(subscription, contentEncoding) {
      var _this2 = this;

      return this.getSharedSecret(subscription).then(function (sharedSecret) {
        var utf8Encoder = new TextEncoder('utf-8');
        var authInfoUint8Array = utf8Encoder.encode('Content-Encoding: auth\0');

        var hkdf = new HKDF(sharedSecret, subscription.getKey('auth'));

        switch (contentEncoding) {
          case 'aesgcm':
            {
              return hkdf.generate(authInfoUint8Array, 32);
            }
          case 'aes128gcm':
            {
              return _this2.getKeyInfo(subscription).then(function (keyInfoUint8Array) {
                return hkdf.generate(keyInfoUint8Array, 32);
              });
            }
          default:
            {
              throw new Error('Unknown content encoding: \'' + contentEncoding + '\'');
            }
        }
      });
    }
  }, {
    key: 'generateContext',
    value: function generateContext(subscription) {
      var _this3 = this;

      return Promise.resolve().then(function () {
        return window.arrayBuffersToCryptoKeys(subscription.getKey('p256dh'));
      }).then(function (keys) {
        return window.cryptoKeysToUint8Array(keys.publicKey).then(function (keys) {
          return keys.publicKey;
        });
      }).then(function (clientPublicKey) {
        return window.cryptoKeysToUint8Array(_this3.serverKeys.publicKey).then(function (keys) {
          return {
            clientPublicKey: clientPublicKey,
            serverPublicKey: keys.publicKey
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
    key: 'generateCEKInfo',
    value: function generateCEKInfo(contextBuffer, subscription, contentEncoding) {
      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: ' + contentEncoding);
        var paddingUnit8Array = new Uint8Array(1).fill(0);

        var uint8Arrays = [contentEncoding8Array, paddingUnit8Array];

        if (contextBuffer) {
          uint8Arrays.push(contextBuffer);
        }

        return window.joinUint8Arrays(uint8Arrays);
      });
    }
  }, {
    key: 'generateNonceInfo',
    value: function generateNonceInfo(contextBuffer, subscription) {
      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: nonce');
        var paddingUnit8Array = new Uint8Array(1).fill(0);

        var uint8Arrays = [contentEncoding8Array, paddingUnit8Array];

        if (contextBuffer) {
          uint8Arrays.push(contextBuffer);
        }

        return window.joinUint8Arrays(uint8Arrays);
      });
    }
  }, {
    key: 'generateEncryptionKeys',
    value: function generateEncryptionKeys(subscription, contentEncoding) {
      var _this4 = this;

      var prkPromise = this.generatePRK(subscription, contentEncoding);
      var cekAndNoncePromise = void 0;
      switch (contentEncoding) {
        case 'aesgcm':
          {
            cekAndNoncePromise = this.generateContext(subscription).then(function (contextBuffer) {
              return Promise.all([_this4.generateCEKInfo(contextBuffer, subscription, contentEncoding), _this4.generateNonceInfo(contextBuffer, subscription)]);
            });
            break;
          }
        case 'aes128gcm':
          {
            cekAndNoncePromise = Promise.all([this.generateCEKInfo(null, subscription, contentEncoding), this.generateNonceInfo(null, subscription)]);
            break;
          }
        default:
          {
            throw new Error('Unknown content encoding: ' + contentEncoding);
          }
      }

      return Promise.all([prkPromise, cekAndNoncePromise]).then(function (results) {
        var prk = results[0];
        var cekInfo = results[1][0];
        var nonceInfo = results[1][1];

        var cekHKDF = new HKDF(prk, _this4._salt);
        var nonceHKDF = new HKDF(prk, _this4._salt);
        return Promise.all([cekHKDF.generate(cekInfo, 16), nonceHKDF.generate(nonceInfo, 12)]);
      }).then(function (results) {
        return {
          contentEncryptionKey: results[0],
          nonce: results[1]
        };
      });
    }
  }, {
    key: 'addEncryptionContentCodingHeader',
    value: function addEncryptionContentCodingHeader(encryptedPayloadArrayBuffer) {
      var _this5 = this;

      return window.cryptoKeysToUint8Array(this.serverKeys.publicKey).then(function (keys) {
        var recordSizeBuffer = new ArrayBuffer(4);
        var recordSizeView = new DataView(recordSizeBuffer);
        recordSizeView.setUint32(0, encryptedPayloadArrayBuffer.byteLength);

        console.log(new Uint8Array(recordSizeBuffer));

        var serverPublicKeyLengthBuffer = new Uint8Array(2);
        serverPublicKeyLengthBuffer[0] = 0x00;
        serverPublicKeyLengthBuffer[1] = keys.publicKey.byteLength;

        var uint8arrays = [_this5.salt,
        // Record Size
        new Uint8Array(recordSizeBuffer),
        // Service Public Key Length
        serverPublicKeyLengthBuffer,
        // Server Public Key
        keys.publicKey, new Uint8Array(encryptedPayloadArrayBuffer)];

        var joinedUint8Array = window.joinUint8Arrays(uint8arrays);
        return joinedUint8Array.buffer;
      });
    }
  }, {
    key: 'encryptMessage',
    value: function encryptMessage(subscription, payload) {
      var _this6 = this;

      var contentEncoding = 'aesgcm';
      if (PushManager.supportedContentEncodings) {
        contentEncoding = PushManager.supportedContentEncodings[0];
      }
      console.log('ENCODING WITH: ', contentEncoding);

      return this.generateEncryptionKeys(subscription, contentEncoding).then(function (encryptionKeys) {
        return crypto.subtle.importKey('raw', encryptionKeys.contentEncryptionKey, 'AES-GCM', true, ['decrypt', 'encrypt']).then(function (cekCryptoKey) {
          encryptionKeys.contentEncryptionCryptoKey = cekCryptoKey;
          return encryptionKeys;
        });
      }).then(function (encryptionKeys) {
        var utf8Encoder = new TextEncoder('utf-8');
        var recordUint8Array = void 0;
        switch (contentEncoding) {
          case 'aesgcm':
            {
              var paddingBytes = 0;
              var paddingUnit8Array = new Uint8Array(2 + paddingBytes);

              var payloadUint8Array = utf8Encoder.encode(payload);

              recordUint8Array = window.joinUint8Arrays([paddingUnit8Array, payloadUint8Array]);
              break;
            }
          case 'aes128gcm':
            {
              // Add a specific byte at the end of the payload data
              // https://tools.ietf.org/html/draft-ietf-httpbis-encryption-encoding-09#section-2
              var _paddingUnit8Array = new Uint8Array(1).fill(0x02);

              var _payloadUint8Array = utf8Encoder.encode(payload);

              recordUint8Array = window.joinUint8Arrays([_payloadUint8Array, _paddingUnit8Array]);
              break;
            }
          default:
            throw new Error('Unknown content encoding: \'' + contentEncoding + '\'');
        }

        var algorithm = {
          name: 'AES-GCM',
          tagLength: 128,
          iv: encryptionKeys.nonce
        };

        return crypto.subtle.encrypt(algorithm, encryptionKeys.contentEncryptionCryptoKey, recordUint8Array);
      }).then(function (encryptedPayloadArrayBuffer) {
        switch (contentEncoding) {
          case 'aesgcm':
            {
              return encryptedPayloadArrayBuffer;
            }
          case 'aes128gcm':
            {
              return _this6.addEncryptionContentCodingHeader(encryptedPayloadArrayBuffer);
            }
          default:
            {
              throw new Error('Unknown content encoding: \'' + contentEncoding + '\'');
            }
        }
      }).then(function (encryptedPayloadArrayBuffer) {
        return window.cryptoKeysToUint8Array(_this6.serverKeys.publicKey).then(function (keys) {
          return {
            contentEncoding: contentEncoding,
            cipherText: encryptedPayloadArrayBuffer,
            salt: window.uint8ArrayToBase64Url(_this6.salt),
            publicServerKey: window.uint8ArrayToBase64Url(keys.publicKey)
          };
        });
      });
    }
  }, {
    key: 'serverKeys',
    get: function get() {
      return this._serverKeys;
    }
  }, {
    key: 'vapidKeys',
    get: function get() {
      if (!this._vapidKeys) {
        return null;
      }

      return this._vapidKeys;
    }
  }, {
    key: 'salt',
    get: function get() {
      return this._salt;
    }
  }]);

  return EncryptionHelper;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelper = EncryptionHelper;
}