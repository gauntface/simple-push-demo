/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* global HKDF */
/* eslint-env browser */

// Length, in bytes, of a P-256 field element. Expected format of the private
// key.
const PRIVATE_KEY_BYTES = 32;

// Length, in bytes, of a P-256 public key in uncompressed EC form per SEC
// 2.3.3. This sequence must start with 0x04. Expected format of the public key.
const PUBLIC_KEY_BYTES = 65;

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

  get serverKeys() {
    return this._serverKeys;
  }

  get vapidKeys() {
    if (!this._vapidKeys) {
      return null;
    }

    return this._vapidKeys;
  }

  get salt() {
    return this._salt;
  }

  getSharedSecret(subscription) {
    return Promise.resolve()
    .then(() => {
      return EncryptionHelper.arrayBuffersToCryptoKeys(
        subscription.getKey('p256dh'));
    })
    .then((keys) => {
      return keys.publicKey;
    })
    .then((publicKey) => {
      if (!(publicKey instanceof CryptoKey)) {
        throw new Error('The publicKey must be a CryptoKey.');
      }

      const algorithm = {
        name: 'ECDH',
        namedCurve: 'P-256',
        public: publicKey,
      };

      return crypto.subtle.deriveBits(
        algorithm, this.serverKeys.privateKey, 256);
    });
  }

  generateContext(subscription) {
    return Promise.resolve()
    .then(() => {
      return EncryptionHelper.arrayBuffersToCryptoKeys(
        subscription.getKey('p256dh'));
    })
    .then((keys) => {
      return EncryptionHelper.exportCryptoKeys(keys.publicKey)
      .then((keys) => {
        return keys.publicKey;
      });
    })
    .then((clientPublicKey) => {
      return EncryptionHelper.exportCryptoKeys(this.serverKeys.publicKey)
      .then((keys) => {
        return {
          clientPublicKey: clientPublicKey,
          serverPublicKey: keys.publicKey,
        };
      });
    })
    .then((keys) => {
      const utf8Encoder = new TextEncoder('utf-8');
      const labelUnit8Array = utf8Encoder.encode('P-256');
      const paddingUnit8Array = new Uint8Array(1).fill(0);

      const clientPublicKeyLengthUnit8Array = new Uint8Array(2);
      clientPublicKeyLengthUnit8Array[0] = 0x00;
      clientPublicKeyLengthUnit8Array[1] = keys.clientPublicKey.byteLength;

      const serverPublicKeyLengthBuffer = new Uint8Array(2);
      serverPublicKeyLengthBuffer[0] = 0x00;
      serverPublicKeyLengthBuffer[1] = keys.serverPublicKey.byteLength;

      return window.joinUint8Arrays([
        labelUnit8Array,
        paddingUnit8Array,
        clientPublicKeyLengthUnit8Array,
        keys.clientPublicKey,
        serverPublicKeyLengthBuffer,
        keys.serverPublicKey,
      ]);
    });
  }

  generateCEKInfo(subscription, contentEncoding) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode(`Content-Encoding: ${contentEncoding}`);
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this.generateContext(subscription)
      .then((contextBuffer) => {
        return window.joinUint8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer,
        ]);
      });
    });
  }

  generateNonceInfo(subscription) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: nonce');
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this.generateContext(subscription)
      .then((contextBuffer) => {
        return window.joinUint8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer,
        ]);
      });
    });
  }

  generatePRK(subscription) {
    return this.getSharedSecret(subscription)
    .then((sharedSecret) => {
      const utf8Encoder = new TextEncoder('utf-8');
      const authInfoUint8Array = utf8Encoder
        .encode('Content-Encoding: auth\0');

      const hkdf = new HKDF(
        sharedSecret,
        subscription.getKey('auth')
      );
      return hkdf.generate(authInfoUint8Array, 32);
    });
  }

  generateEncryptionKeys(subscription, contentEncoding) {
    return Promise.all([
      this.generatePRK(subscription),
      this.generateCEKInfo(subscription, contentEncoding),
      this.generateNonceInfo(subscription),
    ])
    .then((results) => {
      const prk = results[0];
      const cekInfo = results[1];
      const nonceInfo = results[2];

      const cekHKDF = new HKDF(prk, this._salt);
      const nonceHKDF = new HKDF(prk, this._salt);
      return Promise.all([
        cekHKDF.generate(cekInfo, 16),
        nonceHKDF.generate(nonceInfo, 12),
      ]);
    })
    .then((results) => {
      return {
        contentEncryptionKey: results[0],
        nonce: results[1],
      };
    });
  }

  encryptMessage(subscription, payload) {
    let contentEncoding = 'aesgcm';
    if (PushManager.supportedContentEncodings) {
      contentEncoding = PushManager.supportedContentEncodings[0];
    }

    return this.generateEncryptionKeys(subscription, contentEncoding)
    .then((encryptionKeys) => {
      return crypto.subtle.importKey(
        'raw',
        encryptionKeys.contentEncryptionKey,
        'AES-GCM',
        true,
        ['decrypt', 'encrypt']
      )
      .then((cekCryptoKey) => {
        encryptionKeys.contentEncryptionCryptoKey = cekCryptoKey;
        return encryptionKeys;
      });
    })
    .then((encryptionKeys) => {
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
        iv: encryptionKeys.nonce,
      };

      return crypto.subtle.encrypt(
        algorithm, encryptionKeys.contentEncryptionCryptoKey, recordUint8Array);
    })
    .then((encryptedPayloadArrayBuffer) => {
      return EncryptionHelper.exportCryptoKeys(
        this.serverKeys.publicKey)
      .then((keys) => {
        return {
          contentEncoding: contentEncoding,
          cipherText: encryptedPayloadArrayBuffer,
          salt: window.uint8ArrayToBase64Url(this.salt),
          publicServerKey:
            window.uint8ArrayToBase64Url(keys.publicKey),
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
        .then((jwk) => {
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
          .then((jwk) => {
            return window.base64UrlToUint8Array(jwk.d);
          })
        );
      }

      return Promise.all(promises);
    })
    .then((exportedKeys) => {
      const result = {
        publicKey: exportedKeys[0],
      };

      if (exportedKeys.length > 1) {
        result.privateKey = exportedKeys[1];
      }

      return result;
    });
  }

  static arrayBuffersToCryptoKeys(publicKey, privateKey) {
    if (publicKey.byteLength !== PUBLIC_KEY_BYTES) {
      throw new Error('The publicKey is expected to be ' +
        PUBLIC_KEY_BYTES + ' bytes.');
    }

    // Cast ArrayBuffer to Uint8Array
    const publicBuffer = new Uint8Array(publicKey);
    if (publicBuffer[0] !== 0x04) {
      throw new Error('The publicKey is expected to start with an ' +
        '0x04 byte.');
    }

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: window.uint8ArrayToBase64Url(publicBuffer, 1, 33),
      y: window.uint8ArrayToBase64Url(publicBuffer, 33, 65),
      ext: true,
    };

    const keyPromises = [];
    keyPromises.push(crypto.subtle.importKey('jwk', jwk,
      {name: 'ECDH', namedCurve: 'P-256'}, true, []));

    if (privateKey) {
      if (privateKey.byteLength !== PRIVATE_KEY_BYTES) {
        throw new Error('The privateKey is expected to be ' +
          PRIVATE_KEY_BYTES + ' bytes.');
      }

      // d must be defined after the importKey call for public
      jwk.d = window.uint8ArrayToBase64Url(privateKey);
      keyPromises.push(crypto.subtle.importKey('jwk', jwk,
        {name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveBits']));
    }

    return Promise.all(keyPromises)
    .then((keys) => {
      const keyPair = {
        publicKey: keys[0],
      };
      if (keys.length > 1) {
        keyPair.privateKey = keys[1];
      }
      return keyPair;
    });
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelper = EncryptionHelper;
}
