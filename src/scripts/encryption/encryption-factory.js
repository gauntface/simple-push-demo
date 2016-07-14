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
const PRIVATE_KEY_BYTES = 32;

// Length, in bytes, of a P-256 public key in uncompressed EC form per SEC 2.3.3. This sequence must
// start with 0x04. Expected format of the public key.
const PUBLIC_KEY_BYTES = 65;

// Length, in bytes, of the salt that should be used for the message.
const SALT_BYTES = 16;

const joinUnit8Arrays = allUint8Arrays => {
  // Super inefficient. But easier to follow than allocating the
  // array with the correct size and position values in that array
  // as required.
  return allUint8Arrays.reduce(function(cumulativeValue, nextValue) {
    const joinedArray = new Uint8Array(
      cumulativeValue.byteLength + nextValue.byteLength
    );
    joinedArray.set(cumulativeValue, 0);
    joinedArray.set(nextValue, cumulativeValue.byteLength);
    return joinedArray;
  }, new Uint8Array());
};

class EncryptionHelper {
  constructor(serverKeys, salt, vapidKeys) {
    if (!serverKeys || !serverKeys.publicKey || !serverKeys.privateKey) {
      throw new Error('Bad server keys. Use ' +
        'EncryptionHelperFactory.generateKeys()');
    }

    if (!salt) {
      throw new Error('Bad salt value. Use ' +
        'EncryptionHelperFactory.generateSalt()');
    }

    if (vapidKeys && (!vapidKeys.publicKey || !vapidKeys.privateKey)) {
      throw new Error('Bad VAPID keys. Use ' +
        'EncryptionHelperFactory.generateVapidKeys()');
    }

    this._serverKeys = serverKeys;
    this._salt = salt;
    this._vapidKeys = vapidKeys;
  }

  getPublicServerKey() {
    return this._serverKeys.publicKey;
  }

  getPrivateServerKey() {
    return this._serverKeys.privateKey;
  }

  getPublicVapidKey() {
    if (!this._vapidKeys || !this._vapidKeys.publicKey) {
      return null;
    }

    return this._vapidKeys.publicKey;
  }

  getPrivateVapidKey() {
    if (!this._vapidKeys || !this._vapidKeys.privateKey) {
      return null;
    }

    return this._vapidKeys.privateKey;
  }

  getSharedSecret(publicKeyString) {
    return Promise.resolve()
    .then(() => {
      return EncryptionHelper.stringKeysToCryptoKeys(publicKeyString);
    })
    .then(keys => {
      return keys.publicKey;
    })
    .then(publicKey => {
      if (!(publicKey instanceof CryptoKey)) {
        throw new Error('The publicKey must be a CryptoKey.');
      }

      const algorithm = {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: publicKey
      };

      return crypto.subtle.deriveBits(
        algorithm, this.getPrivateServerKey(), 256);
    });
  }

  getSalt() {
    return this._salt;
  }

  generateContext(publicKeyString) {
    return Promise.resolve()
    .then(() => {
      return EncryptionHelper.stringKeysToCryptoKeys(publicKeyString);
    })
    .then(keys => {
      return EncryptionHelper.exportCryptoKeys(keys.publicKey)
      .then(keys => {
        return keys.publicKey;
      });
    })
    .then(clientPublicKey => {
      return EncryptionHelper.exportCryptoKeys(this.getPublicServerKey())
      .then(keys => {
        return {
          clientPublicKey: clientPublicKey,
          serverPublicKey: keys.publicKey
        };
      });
    })
    .then(keys => {
      const utf8Encoder = new TextEncoder('utf-8');
      const labelUnit8Array = utf8Encoder.encode('P-256');
      const paddingUnit8Array = new Uint8Array(1).fill(0);

      const clientPublicKeyLengthUnit8Array = new Uint8Array(2);
      clientPublicKeyLengthUnit8Array[0] = 0x00;
      clientPublicKeyLengthUnit8Array[1] = keys.clientPublicKey.byteLength;

      const serverPublicKeyLengthBuffer = new Uint8Array(2);
      serverPublicKeyLengthBuffer[0] = 0x00;
      serverPublicKeyLengthBuffer[1] = keys.serverPublicKey.byteLength;

      return joinUnit8Arrays([
        labelUnit8Array,
        paddingUnit8Array,
        clientPublicKeyLengthUnit8Array,
        keys.clientPublicKey,
        serverPublicKeyLengthBuffer,
        keys.serverPublicKey
      ]);
    });
  }

  generateCEKInfo(publicKeyString) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: aesgcm');
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this.generateContext(publicKeyString)
      .then(contextBuffer => {
        return joinUnit8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer
        ]);
      });
    });
  }

  generateNonceInfo(publicKeyString) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: nonce');
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this.generateContext(publicKeyString)
      .then(contextBuffer => {
        return joinUnit8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer
        ]);
      });
    });
  }

  generatePRK(subscription) {
    return this.getSharedSecret(subscription.keys.p256dh)
    .then(sharedSecret => {
      const utf8Encoder = new TextEncoder('utf-8');
      const authInfoUint8Array = utf8Encoder
        .encode('Content-Encoding: auth\0');

      const hkdf = new HKDF(
        sharedSecret,
        window.base64UrlToUint8Array(subscription.keys.auth));
      return hkdf.generate(authInfoUint8Array, 32);
    });
  }

  generateEncryptionKeys(subscription) {
    return Promise.all([
      this.generatePRK(subscription),
      this.generateCEKInfo(subscription.keys.p256dh),
      this.generateNonceInfo(subscription.keys.p256dh)
    ])
    .then(results => {
      const prk = results[0];
      const cekInfo = results[1];
      const nonceInfo = results[2];

      const cekHKDF = new HKDF(prk, this._salt);
      const nonceHKDF = new HKDF(prk, this._salt);
      return Promise.all([
        cekHKDF.generate(cekInfo, 16),
        nonceHKDF.generate(nonceInfo, 12)
      ]);
    })
    .then(results => {
      return {
        contentEncryptionKey: results[0],
        nonce: results[1]
      };
    });
  }

  encryptMessage(subscription, payload) {
    return this.generateEncryptionKeys(subscription)
    .then(encryptionKeys => {
      return crypto.subtle.importKey('raw',
        encryptionKeys.contentEncryptionKey, 'AES-GCM', true,
        ['decrypt', 'encrypt'])
        .then(contentEncryptionCryptoKey => {
          encryptionKeys.contentEncryptionCryptoKey =
            contentEncryptionCryptoKey;
          return encryptionKeys;
        });
    })
    .then(encryptionKeys => {
      const paddingBytes = 0;
      const paddingUnit8Array = new Uint8Array(2 + paddingBytes);
      const utf8Encoder = new TextEncoder('utf-8');
      const payloadUint8Array = utf8Encoder.encode(payload);
      const recordUint8Array = new Uint8Array(
        paddingUnit8Array.byteLength + payloadUint8Array.byteLength);
      recordUint8Array.set(paddingUnit8Array, 0);
      recordUint8Array.set(payloadUint8Array, paddingUnit8Array.byteLength);

      const algorithm = {
        name: 'AES-GCM',
        tagLength: 128,
        iv: encryptionKeys.nonce
      };

      return crypto.subtle.encrypt(
        algorithm, encryptionKeys.contentEncryptionCryptoKey, recordUint8Array);
    })
    .then(encryptedPayloadArrayBuffer => {
      return EncryptionHelper.exportCryptoKeys(
        this.getPublicServerKey())
      .then(keys => {
        return {
          cipherText: encryptedPayloadArrayBuffer,
          salt: window.uint8ArrayToBase64Url(this.getSalt()),
          publicServerKey:
            window.uint8ArrayToBase64Url(keys.publicKey)
        };
      });
    });
  }

  static exportCryptoKeys(publicKey, privateKey) {
    return Promise.resolve()
    .then(() => {
      const promises = [];
      promises.push(
        crypto.subtle.exportKey('jwk', publicKey)
        .then(jwk => {
          const x = window.base64UrlToUint8Array(jwk.x);
          const y = window.base64UrlToUint8Array(jwk.y);

          const publicKey = new Uint8Array(65);
          publicKey.set([0x04], 0);
          publicKey.set(x, 1);
          publicKey.set(y, 33);

          return publicKey;
        })
      );

      if (privateKey) {
        promises.push(
          crypto.subtle
            .exportKey('jwk', privateKey)
          .then(jwk => {
            return window.base64UrlToUint8Array(jwk.d);
          })
        );
      }

      return Promise.all(promises);
    })
    .then(exportedKeys => {
      const result = {
        publicKey: exportedKeys[0]
      };

      if (exportedKeys.length > 1) {
        result.privateKey = exportedKeys[1];
      }

      return result;
    });
  }

  static stringKeysToCryptoKeys(publicKey, privateKey) {
    if (!(typeof publicKey === 'string')) {
      throw new Error('The publicKey is expected to be an String.');
    }

    const publicKeyUnitArray = window.base64UrlToUint8Array(publicKey);
    if (publicKeyUnitArray.byteLength !== PUBLIC_KEY_BYTES) {
      throw new Error('The publicKey is expected to be ' +
        PUBLIC_KEY_BYTES + ' bytes.');
    }

    const publicBuffer = new Uint8Array(publicKeyUnitArray);
    if (publicBuffer[0] !== 0x04) {
      throw new Error('The publicKey is expected to start with an ' +
        '0x04 byte.');
    }

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: window.uint8ArrayToBase64Url(publicBuffer, 1, 33),
      y: window.uint8ArrayToBase64Url(publicBuffer, 33, 65),
      ext: true
    };

    const keyPromises = [];
    keyPromises.push(crypto.subtle.importKey('jwk', jwk,
      {name: 'ECDH', namedCurve: 'P-256'}, true, []));

    if (privateKey) {
      if (!(typeof privateKey === 'string')) {
        throw new Error('The privateKey is expected to be an String.');
      }

      const privateKeyArray = window.base64UrlToUint8Array(privateKey);

      if (privateKeyArray.byteLength !== PRIVATE_KEY_BYTES) {
        throw new Error('The privateKey is expected to be ' +
          PRIVATE_KEY_BYTES + ' bytes.');
      }

      // d must be defined after the importKey call for public
      jwk.d = window.uint8ArrayToBase64Url(new Uint8Array(privateKeyArray));
      keyPromises.push(crypto.subtle.importKey('jwk', jwk,
        {name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']));
    }

    return Promise.all(keyPromises)
    .then(keys => {
      const keyPair = {
        publicKey: keys[0]
      };
      if (keys.length > 1) {
        keyPair.privateKey = keys[1];
      }
      return keyPair;
    });
  }
}

class EncryptionHelperFactory {
  static generateHelper(options) {
    return Promise.resolve()
    .then(() => {
      const keyPromises = [
        EncryptionHelperFactory.generateKeys(options)
      ];

      if (options && options.vapidKeys) {
        keyPromises.push(options.vapidKeys);
      }

      return Promise.all(keyPromises);
    })
    .then(results => {
      let salt = null;
      if (options && options.salt) {
        salt = window.base64UrlToUint8Array(options.salt);
      } else {
        salt = crypto.getRandomValues(new Uint8Array(16));
      }
      return new EncryptionHelper(results[0], salt, results[1]);
    });
  }

  static importKeys(keys) {
    if (!keys || !keys.publicKey || !keys.privateKey) {
      return Promise.reject(new Error('Bad options for key import'));
    }

    return Promise.resolve()
    .then(() => {
      return EncryptionHelper.stringKeysToCryptoKeys(
        keys.publicKey,
        keys.privateKey
      );
    });
  }

  static generateKeys(options) {
    if (options && options.serverKeys) {
      return EncryptionHelperFactory.importKeys(options.serverKeys);
    }

    // True is to make the keys extractable
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
      true, ['deriveBits']);
  }

  static generateVapidKeys() {
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
      true, ['deriveBits'])
      .then(keys => {
        return EncryptionHelper.exportCryptoKeys(
          keys.publicKey, keys.privateKey);
      });
  }

  static createVapidAuthHeader(vapidKeys, audience, subject, exp) {
    if (!audience) {
      return Promise.reject(new Error('Audience must be the origin of the ' +
        'server'));
    }

    if (!subject) {
      return Promise.reject(new Error('Subject must be either a mailto or ' +
        'http link'));
    }

    if (typeof exp !== 'number') {
      // The `exp` field will contain the current timestamp in UTC plus twelve hours.
      exp = Math.floor((Date.now() / 1000) + 12 * 60 * 60);
    }

    // Ensure the audience is just the origin
    audience = new URL(audience).origin;

    const tokenHeader = {
      typ: 'JWT',
      alg: 'ES256'
    };

    const tokenBody = {
      aud: audience,
      exp: exp,
      sub: subject
    };

    // Utility function for UTF-8 encoding a string to an ArrayBuffer.
    const utf8Encoder = new TextEncoder('utf-8');

    // The unsigned token is the concatenation of the URL-safe base64 encoded header and body.
    const unsignedToken =
      window.uint8ArrayToBase64Url(
        utf8Encoder.encode(JSON.stringify(tokenHeader))
      ) + '.' + window.uint8ArrayToBase64Url(
        utf8Encoder.encode(JSON.stringify(tokenBody))
      );

    // Sign the |unsignedToken| using ES256 (SHA-256 over ECDSA).
    const key = {
      kty: 'EC',
      crv: 'P-256',
      x: window.uint8ArrayToBase64Url(
        vapidKeys.publicKey.subarray(1, 33)),
      y: window.uint8ArrayToBase64Url(
        vapidKeys.publicKey.subarray(33, 65)),
      d: window.uint8ArrayToBase64Url(vapidKeys.privateKey)
    };

      // Sign the |unsignedToken| with the server's private key to generate the signature.
    return crypto.subtle.importKey('jwk', key, {
      name: 'ECDSA', namedCurve: 'P-256'
    }, true, ['sign'])
    .then(key => {
      return crypto.subtle.sign({
        name: 'ECDSA',
        hash: {
          name: 'SHA-256'
        }
      }, key, utf8Encoder.encode(unsignedToken));
    })
    .then(signature => {
      const jsonWebToken = unsignedToken + '.' +
        window.uint8ArrayToBase64Url(new Uint8Array(signature));
      const p256ecdsa = window.uint8ArrayToBase64Url(
        vapidKeys.publicKey);

      return {
        bearer: jsonWebToken,
        p256ecdsa: p256ecdsa
      };
    });
  }

  static generateSalt() {
    return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
  window.gauntface.EncryptionHelper = EncryptionHelper;
}
