/* eslint-env browser */
/* global HKDF */

class EncryptionHelperAESGCM {
  constructor(options = {}) {
    this._b64ServerKeys = options.serverKeys;
    this._b64Salt = options.salt;
    this._b4VapidKeys = options.vapidKeys;
  }

  getServerKeys() {
    if (this._b64ServerKeys) {
      return window.arrayBuffersToCryptoKeys(
        window.base64UrlToUint8Array(this._b64ServerKeys.publicKey),
        window.base64UrlToUint8Array(this._b64ServerKeys.privateKey)
      );
    }

    return EncryptionHelperAESGCM.generateServerKeys();
  }

  getSalt() {
    if (this._b64Salt) {
      return window.base64UrlToUint8Array(this._b64Salt);
    }

    return window.generateSalt();
  }

  getVapidKeys() {
    if (this._b4VapidKeys) {
      return this._b4VapidKeys;
    }

    return window.gauntface.CONSTANTS.APPLICATION_KEYS;
  }

  getRequestDetails(subscription, payloadText) {
    return window.gauntface.VapidHelper1.createVapidAuthHeader(
      this.getVapidKeys(),
      subscription.endpoint,
      'mailto:simple-push-demo@gauntface.co.uk')
    .then((vapidHeaders) => {
      return this.encryptPayload(subscription, payloadText)
      .then((encryptedPayloadDetails) => {
        let body = null;
        const headers = {};
        headers.TTL = 60;

        if (encryptedPayloadDetails) {
          body = encryptedPayloadDetails.cipherText;

          headers.Encryption = `salt=${encryptedPayloadDetails.salt}`;
          headers['Crypto-Key'] =
            `dh=${encryptedPayloadDetails.publicServerKey}`;
          headers['Content-Encoding'] = 'aesgcm';
        } else {
          headers['Content-Length'] = 0;
        }

        if (vapidHeaders) {
          Object.keys(vapidHeaders).forEach((headerName) => {
            if (headers[headerName]) {
              headers[headerName] =
                `${headers[headerName]}; ${vapidHeaders[headerName]}`;
            } else {
              headers[headerName] = vapidHeaders[headerName];
            }
          });
        }

        const response = {
          headers: headers,
          endpoint: subscription.endpoint,
        };

        if (body) {
          response.body = body;
        }

        return Promise.resolve(response);
      });
    });
  }

  encryptPayload(subscription, payloadText) {
    if (!payloadText || payloadText.trim().length === 0) {
      return Promise.resolve(null);
    }

    const salt = this.getSalt();

    return this.getServerKeys()
    .then((serverKeys) => {
      return window.cryptoKeysToUint8Array(serverKeys.publicKey)
      .then((exportedServerKeys) => {
        return this._generateEncryptionKeys(subscription, salt, serverKeys)
        .then((encryptionKeys) => {
          return crypto.subtle.importKey('raw',
            encryptionKeys.contentEncryptionKey, 'AES-GCM', true,
            ['decrypt', 'encrypt'])
          .then((contentEncryptionCryptoKey) => {
            encryptionKeys.contentEncryptionCryptoKey =
              contentEncryptionCryptoKey;
            return encryptionKeys;
          });
        })
        .then((encryptionKeys) => {
          const paddingBytes = 0;
          const paddingUnit8Array = new Uint8Array(2 + paddingBytes);
          const utf8Encoder = new TextEncoder('utf-8');
          const payloadUint8Array = utf8Encoder.encode(payloadText);
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
            algorithm, encryptionKeys.contentEncryptionCryptoKey,
            recordUint8Array
          );
        })
        .then((encryptedPayloadArrayBuffer) => {
          return {
            cipherText: encryptedPayloadArrayBuffer,
            salt: window.uint8ArrayToBase64Url(salt),
            publicServerKey: window.uint8ArrayToBase64Url(
              exportedServerKeys.publicKey),
          };
        });
      });
    });
  }

  static generateServerKeys() {
    // 'true' is to make the keys extractable
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
      true, ['deriveBits']);
  }

  _generateEncryptionKeys(subscription, salt, serverKeys) {
    return Promise.all([
      this._generatePRK(subscription, serverKeys),
      this._generateCEKInfo(subscription, serverKeys),
      this._generateNonceInfo(subscription, serverKeys),
    ])
    .then((results) => {
      const prk = results[0];
      const cekInfo = results[1];
      const nonceInfo = results[2];

      const cekHKDF = new HKDF(prk, salt);
      const nonceHKDF = new HKDF(prk, salt);
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

  _generateContext(subscription, serverKeys) {
    return Promise.resolve()
    .then(() => {
      return window.arrayBuffersToCryptoKeys(subscription.getKey('p256dh'));
    })
    .then((keys) => {
      return keys.publicKey;
    })
    .then((clientPublicKey) => {
      return {
        clientPublicKey: clientPublicKey,
        serverPublicKey: serverKeys.publicKey,
      };
    })
    .then((keysAsCryptoKeys) => {
      return Promise.all([
        window.cryptoKeysToUint8Array(keysAsCryptoKeys.clientPublicKey),
        window.cryptoKeysToUint8Array(keysAsCryptoKeys.serverPublicKey),
      ])
      .then((keysAsUint8) => {
        return {
          clientPublicKey: keysAsUint8[0].publicKey,
          serverPublicKey: keysAsUint8[1].publicKey,
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

  _generateCEKInfo(subscription, serverKeys) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: aesgcm');
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this._generateContext(subscription, serverKeys)
      .then((contextBuffer) => {
        return window.joinUint8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer,
        ]);
      });
    });
  }

  _generateNonceInfo(subscription, serverKeys) {
    return Promise.resolve()
    .then(() => {
      const utf8Encoder = new TextEncoder('utf-8');
      const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: nonce');
      const paddingUnit8Array = new Uint8Array(1).fill(0);
      return this._generateContext(subscription, serverKeys)
      .then((contextBuffer) => {
        return window.joinUint8Arrays([
          contentEncoding8Array,
          paddingUnit8Array,
          contextBuffer,
        ]);
      });
    });
  }

  _generatePRK(subscription, serverKeys) {
    return this._getSharedSecret(subscription, serverKeys)
    .then((sharedSecret) => {
      const utf8Encoder = new TextEncoder('utf-8');
      const authInfoUint8Array = utf8Encoder
        .encode('Content-Encoding: auth\0');

      const hkdf = new HKDF(
        sharedSecret,
        subscription.getKey('auth'));
      return hkdf.generate(authInfoUint8Array, 32);
    });
  }

  _getSharedSecret(subscription, serverKeys) {
    return Promise.resolve()
    .then(() => {
      return window.arrayBuffersToCryptoKeys(subscription.getKey('p256dh'));
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
        algorithm, serverKeys.privateKey, 256);
    });
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperAESGCM = EncryptionHelperAESGCM;
}
