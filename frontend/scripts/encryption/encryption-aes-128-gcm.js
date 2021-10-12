/* eslint-env browser */
/* global HKDF */

class EncryptionHelperAES128GCM {
  constructor(options = {}) {
    this._b64ServerKeys = options.serverKeys;
    this._b64Salt = options.salt;
    this._b4VapidKeys = options.vapidKeys;
  }

  getServerKeys() {
    if (this._b64ServerKeys) {
      return window.arrayBuffersToCryptoKeys(
          window.base64UrlToUint8Array(this._b64ServerKeys.publicKey),
          window.base64UrlToUint8Array(this._b64ServerKeys.privateKey),
      );
    }

    return EncryptionHelperAES128GCM.generateServerKeys();
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
    let vapidHelper = window.gauntface.VapidHelper1;

    let endpoint = subscription.endpoint;

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

    return vapidHelper.createVapidAuthHeader(
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
                  headers['Content-Encoding'] = 'aes128gcm';
                } else {
                  headers['Content-Length'] = 0;
                }

                if (vapidHeaders) {
                  Object.keys(vapidHeaders).forEach((headerName) => {
                    headers[headerName] = vapidHeaders[headerName];
                  });
                }

                const response = {
                  headers: headers,
                  endpoint,
                };

                if (body) {
                  response.body = body;
                }

                return Promise.resolve(response);
              });
        });
  }

  async encryptPayload(subscription, payloadText) {
    if (!payloadText || payloadText.trim().length === 0) {
      return Promise.resolve(null);
    }

    const salt = this.getSalt();

    const serverKeys = await this.getServerKeys();
    const exportedServerKeys = await window.cryptoKeysToUint8Array(
        serverKeys.publicKey);
    const encryptionKeys = await this._generateEncryptionKeys(
        subscription, salt, serverKeys);

    const contentEncryptionCryptoKey = await crypto.subtle.importKey('raw',
        encryptionKeys.contentEncryptionKey, 'AES-GCM', true,
        ['decrypt', 'encrypt']);
    encryptionKeys.contentEncryptionCryptoKey = contentEncryptionCryptoKey;

    const utf8Encoder = new TextEncoder('utf-8');
    const payloadUint8Array = utf8Encoder.encode(payloadText);

    const paddingBytes = 0;
    const paddingUnit8Array = new Uint8Array(1 + paddingBytes);
    paddingUnit8Array.fill(0);
    paddingUnit8Array[0] = 0x02;

    const recordUint8Array = window.joinUint8Arrays([
      payloadUint8Array,
      paddingUnit8Array,
    ]);

    const algorithm = {
      name: 'AES-GCM',
      tagLength: 128,
      iv: encryptionKeys.nonce,
    };

    const encryptedPayloadArrayBuffer = await crypto.subtle.encrypt(
        algorithm, encryptionKeys.contentEncryptionCryptoKey,
        recordUint8Array,
    );
    const payloadWithHeaders = await this._addEncryptionContentCodingHeader(
        encryptedPayloadArrayBuffer,
        serverKeys,
        salt);
    return {
      cipherText: payloadWithHeaders,
      salt: window.uint8ArrayToBase64Url(salt),
      publicServerKey: window.uint8ArrayToBase64Url(
          exportedServerKeys.publicKey),
    };
  }

  static generateServerKeys() {
    // 'true' is to make the keys extractable
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
        true, ['deriveBits']);
  }

  async _addEncryptionContentCodingHeader(
      encryptedPayloadArrayBuffer, serverKeys, salt) {
    const keys = await window.cryptoKeysToUint8Array(serverKeys.publicKey);
    // Maximum record size.
    const recordSizeUint8Array = new Uint8Array([0x00, 0x00, 0x10, 0x00]);

    const serverPublicKeyLengthBuffer = new Uint8Array(1);
    serverPublicKeyLengthBuffer[0] = keys.publicKey.byteLength;

    const uint8arrays = [
      salt,
      // Record Size
      recordSizeUint8Array,
      // Service Public Key Length
      serverPublicKeyLengthBuffer,
      // Server Public Key
      keys.publicKey,
      new Uint8Array(encryptedPayloadArrayBuffer),
    ];

    const joinedUint8Array = window.joinUint8Arrays(uint8arrays);
    return joinedUint8Array.buffer;
  }

  async _generateEncryptionKeys(subscription, salt, serverKeys) {
    const infoResults = await Promise.all([
      this._generatePRK(subscription, serverKeys),
      this._generateCEKInfo(subscription, serverKeys),
      this._generateNonceInfo(subscription, serverKeys),
    ]);

    const prk = infoResults[0];
    const cekInfo = infoResults[1];
    const nonceInfo = infoResults[2];

    const cekHKDF = new HKDF(prk, salt);
    const nonceHKDF = new HKDF(prk, salt);
    const keyResults = await Promise.all([
      cekHKDF.generate(cekInfo, 16),
      nonceHKDF.generate(nonceInfo, 12),
    ]);
    return {
      contentEncryptionKey: keyResults[0],
      nonce: keyResults[1],
    };
  }

  _generateCEKInfo(subscription, serverKeys) {
    const utf8Encoder = new TextEncoder('utf-8');
    const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: aes128gcm');
    const paddingUnit8Array = new Uint8Array(1).fill(0);
    return window.joinUint8Arrays([
      contentEncoding8Array,
      paddingUnit8Array,
    ]);
  }

  _generateNonceInfo(subscription, serverKeys) {
    const utf8Encoder = new TextEncoder('utf-8');
    const contentEncoding8Array = utf8Encoder
        .encode('Content-Encoding: nonce');
    const paddingUnit8Array = new Uint8Array(1).fill(0);
    return window.joinUint8Arrays([
      contentEncoding8Array,
      paddingUnit8Array,
    ]);
  }

  async _generatePRK(subscription, serverKeys) {
    const sharedSecret = await this._getSharedSecret(subscription, serverKeys);

    const keyInfoUint8Array = await this._getKeyInfo(subscription, serverKeys);
    const hkdf = new HKDF(
        sharedSecret,
        subscription.getKey('auth'),
    );
    return hkdf.generate(keyInfoUint8Array, 32);
  }

  async _getSharedSecret(subscription, serverKeys) {
    const keys = await window.arrayBuffersToCryptoKeys(
        subscription.getKey('p256dh'));
    if (!(keys.publicKey instanceof CryptoKey)) {
      throw new Error('The publicKey must be a CryptoKey.');
    }

    const algorithm = {
      name: 'ECDH',
      namedCurve: 'P-256',
      public: keys.publicKey,
    };

    return crypto.subtle.deriveBits(
        algorithm, serverKeys.privateKey, 256);
  }

  async _getKeyInfo(subscription, serverKeys) {
    const utf8Encoder = new TextEncoder('utf-8');

    const keyInfo = await window.cryptoKeysToUint8Array(serverKeys.publicKey);
    return window.joinUint8Arrays([
      utf8Encoder.encode('WebPush: info'),
      new Uint8Array(1).fill(0),
      new Uint8Array(subscription.getKey('p256dh')),
      keyInfo.publicKey,
    ]);
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperAES128GCM = EncryptionHelperAES128GCM;
}
