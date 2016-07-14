/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* global HKDF */
/* eslint-env browser */

'use strict';

// Length, in bytes, of a P-256 field element. Expected format of the private key.

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var PRIVATE_KEY_BYTES = 32;

// Length, in bytes, of a P-256 public key in uncompressed EC form per SEC 2.3.3. This sequence must
// start with 0x04. Expected format of the public key.
var PUBLIC_KEY_BYTES = 65;

// Length, in bytes, of the salt that should be used for the message.
var SALT_BYTES = 16;

var joinUnit8Arrays = function joinUnit8Arrays(allUint8Arrays) {
  // Super inefficient. But easier to follow than allocating the
  // array with the correct size and position values in that array
  // as required.
  return allUint8Arrays.reduce(function (cumulativeValue, nextValue) {
    var joinedArray = new Uint8Array(cumulativeValue.byteLength + nextValue.byteLength);
    joinedArray.set(cumulativeValue, 0);
    joinedArray.set(nextValue, cumulativeValue.byteLength);
    return joinedArray;
  }, new Uint8Array());
};

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
    key: 'getPublicServerKey',
    value: function getPublicServerKey() {
      return this._serverKeys.publicKey;
    }
  }, {
    key: 'getPrivateServerKey',
    value: function getPrivateServerKey() {
      return this._serverKeys.privateKey;
    }
  }, {
    key: 'getPublicVapidKey',
    value: function getPublicVapidKey() {
      if (!this._vapidKeys || !this._vapidKeys.publicKey) {
        return null;
      }

      return this._vapidKeys.publicKey;
    }
  }, {
    key: 'getPrivateVapidKey',
    value: function getPrivateVapidKey() {
      if (!this._vapidKeys || !this._vapidKeys.privateKey) {
        return null;
      }

      return this._vapidKeys.privateKey;
    }
  }, {
    key: 'getSharedSecret',
    value: function getSharedSecret(publicKeyString) {
      var _this = this;

      return Promise.resolve().then(function () {
        return EncryptionHelper.stringKeysToCryptoKeys(publicKeyString);
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

        return crypto.subtle.deriveBits(algorithm, _this.getPrivateServerKey(), 256);
      });
    }
  }, {
    key: 'getSalt',
    value: function getSalt() {
      return this._salt;
    }
  }, {
    key: 'generateContext',
    value: function generateContext(publicKeyString) {
      var _this2 = this;

      return Promise.resolve().then(function () {
        return EncryptionHelper.stringKeysToCryptoKeys(publicKeyString);
      }).then(function (keys) {
        return EncryptionHelper.exportCryptoKeys(keys.publicKey).then(function (keys) {
          return keys.publicKey;
        });
      }).then(function (clientPublicKey) {
        return EncryptionHelper.exportCryptoKeys(_this2.getPublicServerKey()).then(function (keys) {
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

        return joinUnit8Arrays([labelUnit8Array, paddingUnit8Array, clientPublicKeyLengthUnit8Array, keys.clientPublicKey, serverPublicKeyLengthBuffer, keys.serverPublicKey]);
      });
    }
  }, {
    key: 'generateCEKInfo',
    value: function generateCEKInfo(publicKeyString) {
      var _this3 = this;

      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: aesgcm');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return _this3.generateContext(publicKeyString).then(function (contextBuffer) {
          return joinUnit8Arrays([contentEncoding8Array, paddingUnit8Array, contextBuffer]);
        });
      });
    }
  }, {
    key: 'generateNonceInfo',
    value: function generateNonceInfo(publicKeyString) {
      var _this4 = this;

      return Promise.resolve().then(function () {
        var utf8Encoder = new TextEncoder('utf-8');
        var contentEncoding8Array = utf8Encoder.encode('Content-Encoding: nonce');
        var paddingUnit8Array = new Uint8Array(1).fill(0);
        return _this4.generateContext(publicKeyString).then(function (contextBuffer) {
          return joinUnit8Arrays([contentEncoding8Array, paddingUnit8Array, contextBuffer]);
        });
      });
    }
  }, {
    key: 'generatePRK',
    value: function generatePRK(subscription) {
      return this.getSharedSecret(subscription.keys.p256dh).then(function (sharedSecret) {
        var utf8Encoder = new TextEncoder('utf-8');
        var authInfoUint8Array = utf8Encoder.encode('Content-Encoding: auth\0');

        var hkdf = new HKDF(sharedSecret, window.base64UrlToUint8Array(subscription.keys.auth));
        return hkdf.generate(authInfoUint8Array, 32);
      });
    }
  }, {
    key: 'generateEncryptionKeys',
    value: function generateEncryptionKeys(subscription) {
      var _this5 = this;

      return Promise.all([this.generatePRK(subscription), this.generateCEKInfo(subscription.keys.p256dh), this.generateNonceInfo(subscription.keys.p256dh)]).then(function (results) {
        var prk = results[0];
        var cekInfo = results[1];
        var nonceInfo = results[2];

        var cekHKDF = new HKDF(prk, _this5._salt);
        var nonceHKDF = new HKDF(prk, _this5._salt);
        return Promise.all([cekHKDF.generate(cekInfo, 16), nonceHKDF.generate(nonceInfo, 12)]);
      }).then(function (results) {
        return {
          contentEncryptionKey: results[0],
          nonce: results[1]
        };
      });
    }
  }, {
    key: 'encryptMessage',
    value: function encryptMessage(subscription, payload) {
      var _this6 = this;

      return this.generateEncryptionKeys(subscription).then(function (encryptionKeys) {
        return crypto.subtle.importKey('raw', encryptionKeys.contentEncryptionKey, 'AES-GCM', true, ['decrypt', 'encrypt']).then(function (contentEncryptionCryptoKey) {
          encryptionKeys.contentEncryptionCryptoKey = contentEncryptionCryptoKey;
          return encryptionKeys;
        });
      }).then(function (encryptionKeys) {
        var paddingBytes = 0;
        var paddingUnit8Array = new Uint8Array(2 + paddingBytes);
        var utf8Encoder = new TextEncoder('utf-8');
        var payloadUint8Array = utf8Encoder.encode(payload);
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
        return EncryptionHelper.exportCryptoKeys(_this6.getPublicServerKey()).then(function (keys) {
          return {
            cipherText: encryptedPayloadArrayBuffer,
            salt: window.uint8ArrayToBase64Url(_this6.getSalt()),
            publicServerKey: window.uint8ArrayToBase64Url(keys.publicKey)
          };
        });
      });
    }
  }], [{
    key: 'exportCryptoKeys',
    value: function exportCryptoKeys(publicKey, privateKey) {
      return Promise.resolve().then(function () {
        var promises = [];
        promises.push(crypto.subtle.exportKey('jwk', publicKey).then(function (jwk) {
          var x = window.base64UrlToUint8Array(jwk.x);
          var y = window.base64UrlToUint8Array(jwk.y);

          var publicKey = new Uint8Array(65);
          publicKey.set([0x04], 0);
          publicKey.set(x, 1);
          publicKey.set(y, 33);

          return publicKey;
        }));

        if (privateKey) {
          promises.push(crypto.subtle.exportKey('jwk', privateKey).then(function (jwk) {
            return window.base64UrlToUint8Array(jwk.d);
          }));
        }

        return Promise.all(promises);
      }).then(function (exportedKeys) {
        var result = {
          publicKey: exportedKeys[0]
        };

        if (exportedKeys.length > 1) {
          result.privateKey = exportedKeys[1];
        }

        return result;
      });
    }
  }, {
    key: 'stringKeysToCryptoKeys',
    value: function stringKeysToCryptoKeys(publicKey, privateKey) {
      if (!(typeof publicKey === 'string')) {
        throw new Error('The publicKey is expected to be an String.');
      }

      var publicKeyUnitArray = window.base64UrlToUint8Array(publicKey);
      if (publicKeyUnitArray.byteLength !== PUBLIC_KEY_BYTES) {
        throw new Error('The publicKey is expected to be ' + PUBLIC_KEY_BYTES + ' bytes.');
      }

      var publicBuffer = new Uint8Array(publicKeyUnitArray);
      if (publicBuffer[0] !== 0x04) {
        throw new Error('The publicKey is expected to start with an ' + '0x04 byte.');
      }

      var jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: window.uint8ArrayToBase64Url(publicBuffer, 1, 33),
        y: window.uint8ArrayToBase64Url(publicBuffer, 33, 65),
        ext: true
      };

      var keyPromises = [];
      keyPromises.push(crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []));

      if (privateKey) {
        if (!(typeof privateKey === 'string')) {
          throw new Error('The privateKey is expected to be an String.');
        }

        var privateKeyArray = window.base64UrlToUint8Array(privateKey);

        if (privateKeyArray.byteLength !== PRIVATE_KEY_BYTES) {
          throw new Error('The privateKey is expected to be ' + PRIVATE_KEY_BYTES + ' bytes.');
        }

        // d must be defined after the importKey call for public
        jwk.d = window.uint8ArrayToBase64Url(new Uint8Array(privateKeyArray));
        keyPromises.push(crypto.subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']));
      }

      return Promise.all(keyPromises).then(function (keys) {
        var keyPair = {
          publicKey: keys[0]
        };
        if (keys.length > 1) {
          keyPair.privateKey = keys[1];
        }
        return keyPair;
      });
    }
  }]);

  return EncryptionHelper;
}();

var EncryptionHelperFactory = function () {
  function EncryptionHelperFactory() {
    _classCallCheck(this, EncryptionHelperFactory);
  }

  _createClass(EncryptionHelperFactory, null, [{
    key: 'generateHelper',
    value: function generateHelper(options) {
      return Promise.resolve().then(function () {
        var keyPromises = [EncryptionHelperFactory.generateKeys(options)];

        if (options && options.vapidKeys) {
          keyPromises.push(options.vapidKeys);
        }

        return Promise.all(keyPromises);
      }).then(function (results) {
        var salt = null;
        if (options && options.salt) {
          salt = window.base64UrlToUint8Array(options.salt);
        } else {
          salt = crypto.getRandomValues(new Uint8Array(16));
        }
        return new EncryptionHelper(results[0], salt, results[1]);
      });
    }
  }, {
    key: 'importKeys',
    value: function importKeys(keys) {
      if (!keys || !keys.publicKey || !keys.privateKey) {
        return Promise.reject(new Error('Bad options for key import'));
      }

      return Promise.resolve().then(function () {
        return EncryptionHelper.stringKeysToCryptoKeys(keys.publicKey, keys.privateKey);
      });
    }
  }, {
    key: 'generateKeys',
    value: function generateKeys(options) {
      if (options && options.serverKeys) {
        return EncryptionHelperFactory.importKeys(options.serverKeys);
      }

      // True is to make the keys extractable
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
    }
  }, {
    key: 'generateVapidKeys',
    value: function generateVapidKeys() {
      return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']).then(function (keys) {
        return EncryptionHelper.exportCryptoKeys(keys.publicKey, keys.privateKey);
      });
    }
  }, {
    key: 'createVapidAuthHeader',
    value: function createVapidAuthHeader(vapidKeys, audience, subject, exp) {
      if (!audience) {
        return Promise.reject(new Error('Audience must be the origin of the ' + 'server'));
      }

      if (!subject) {
        return Promise.reject(new Error('Subject must be either a mailto or ' + 'http link'));
      }

      if (typeof exp !== 'number') {
        // The `exp` field will contain the current timestamp in UTC plus twelve hours.
        exp = Math.floor(Date.now() / 1000 + 12 * 60 * 60);
      }

      // Ensure the audience is just the origin
      audience = new URL(audience).origin;

      var tokenHeader = {
        typ: 'JWT',
        alg: 'ES256'
      };

      var tokenBody = {
        aud: audience,
        exp: exp,
        sub: subject
      };

      // Utility function for UTF-8 encoding a string to an ArrayBuffer.
      var utf8Encoder = new TextEncoder('utf-8');

      // The unsigned token is the concatenation of the URL-safe base64 encoded header and body.
      var unsignedToken = window.uint8ArrayToBase64Url(utf8Encoder.encode(JSON.stringify(tokenHeader))) + '.' + window.uint8ArrayToBase64Url(utf8Encoder.encode(JSON.stringify(tokenBody)));

      // Sign the |unsignedToken| using ES256 (SHA-256 over ECDSA).
      var key = {
        kty: 'EC',
        crv: 'P-256',
        x: window.uint8ArrayToBase64Url(vapidKeys.publicKey.subarray(1, 33)),
        y: window.uint8ArrayToBase64Url(vapidKeys.publicKey.subarray(33, 65)),
        d: window.uint8ArrayToBase64Url(vapidKeys.privateKey)
      };

      // Sign the |unsignedToken| with the server's private key to generate the signature.
      return crypto.subtle.importKey('jwk', key, {
        name: 'ECDSA', namedCurve: 'P-256'
      }, true, ['sign']).then(function (key) {
        return crypto.subtle.sign({
          name: 'ECDSA',
          hash: {
            name: 'SHA-256'
          }
        }, key, utf8Encoder.encode(unsignedToken));
      }).then(function (signature) {
        var jsonWebToken = unsignedToken + '.' + window.uint8ArrayToBase64Url(new Uint8Array(signature));
        var p256ecdsa = window.uint8ArrayToBase64Url(vapidKeys.publicKey);

        return {
          bearer: jsonWebToken,
          p256ecdsa: p256ecdsa
        };
      });
    }
  }, {
    key: 'generateSalt',
    value: function generateSalt() {
      return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    }
  }]);

  return EncryptionHelperFactory;
}();

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
  window.gauntface.EncryptionHelper = EncryptionHelper;
}