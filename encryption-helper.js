'use strict';

var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');

class HMAC {
  constructor(ikm) {
    this._ikm = ikm;
    this._hmac = crypto.createHmac('sha256', ikm);
  }

  sign(input) {
    var result = this._hmac.update(input).digest();
    return result;
  }
}

class HKDF {
  constructor(inputKeyingMaterial, salt) {
    this._salt = salt;
    this._ikm = inputKeyingMaterial;

    this._hmac = new HMAC(salt);
  }

  generate(info, byteLength) {
    var fullInfoBuffer = Buffer.concat([
      new Buffer(info, 'base64'),
      new Buffer(1).fill(1)
    ]);

    var prk = this._hmac.sign(this._ikm);

    var nextHmac = new HMAC(prk);
    var nextPrk = nextHmac.sign(fullInfoBuffer);
    return nextPrk.slice(0, byteLength);
  }
}

class EncryptionHelper {

  constructor(options) {
    this._salt = crypto.randomBytes(16);
    this._ellipticCurve = crypto.createECDH('prime256v1');
    this._ellipticCurve.generateKeys();

    if (options && options.serverKeys && options.serverKeys.public &&
      options.serverKeys.private) {
      this._ellipticCurve.setPrivateKey(
        options.serverKeys.private,
        'base64'
      );
      this._ellipticCurve.setPublicKey(
        options.serverKeys.public,
        'base64'
      );
    }

    if (options && options.salt) {
      this._salt = options.salt;
    }
  }

  getServerKeys() {
    return {
      public: this._ellipticCurve.getPublicKey('base64'),
      private: this._ellipticCurve.getPrivateKey('base64')
    };
  }

  getSharedSecret(clientPublicKey) {
    return this._ellipticCurve.computeSecret(
      clientPublicKey, 'base64',
      'base64');
  }

  getSalt() {
    return this._salt;
  }

  generateContext(clientPublicKey, serverPublicKey) {
    // context = label || 0x00 ||
    //           length(recipient_public) || recipient_public ||
    //           length(sender_public) || sender_public

    // var bufferSize = 5 + 1 + 2 + 65 + 2 + 65;
    // var contextBuffer = new Buffer(bufferSize);

    var labelBuffer = new Buffer('P-256', 'ascii');
    var paddingBuffer = new Buffer(1).fill(0);

    var clientPublicKeyLengthBuffer = new Buffer(2);
    clientPublicKeyLengthBuffer.writeUIntBE(
      urlBase64.decode(clientPublicKey).length, 0, 2);
    var clientPublicKeyBuffer = urlBase64.decode(clientPublicKey);

    var serverPublicKeyLengthBuffer = new Buffer(2);
    serverPublicKeyLengthBuffer.writeUIntBE(
      urlBase64.decode(serverPublicKey).length, 0, 2);
    var serverPublicKeyBuffer = urlBase64.decode(serverPublicKey);

    return Buffer.concat([
      labelBuffer,
      paddingBuffer,
      clientPublicKeyLengthBuffer,
      clientPublicKeyBuffer,
      serverPublicKeyLengthBuffer,
      serverPublicKeyBuffer
    ]);
  }

  generateCEKInfo(context) {
    var contentEncodingBuffer = new Buffer('Content-Encoding: aesgcm128',
      'utf8');
    var paddingBuffer = new Buffer(1).fill(0);

    return Buffer.concat([
      contentEncodingBuffer,
      paddingBuffer,
      context
    ]);
  }

  generateNonceInfo(context) {
    var contentEncodingBuffer = new Buffer('Content-Encoding: nonce',
      'utf8');
    var paddingBuffer = new Buffer(1).fill(0);

    return Buffer.concat([
      contentEncodingBuffer,
      paddingBuffer,
      context
    ]);
  }

  generatePRK(sharedSecret, auth) {
    var authInfoBuffer = new Buffer('Content-Encoding: auth\0', 'utf8');
    var hkdf = new HKDF(urlBase64.decode(sharedSecret), urlBase64.decode(auth));
    return hkdf.generate(authInfoBuffer, 32);
  }

  generateKeys(prk, salt, cekInfo, nonceInfo) {
    var hkdf = new HKDF(prk, salt);
    var cekPrk = hkdf.generate(cekInfo, 16);

    hkdf = new HKDF(prk, salt);
    var noncePrk = hkdf.generate(nonceInfo, 12);

    return {
      contentEncryptionKey: cekPrk,
      nonce: noncePrk
    };
  }

  generateMessageBuffer(payload, paddingBytes) {
    // Create the record for the data, which is a byte for the length of the
    // padding, followed by a number of NULL bytes for the padding, followed by
    // the actual content of the plaintext.
    var paddingBuffer = new Buffer(1 + paddingBytes);
    paddingBuffer.fill(0);
    paddingBuffer.writeUIntBE(paddingBytes, 0, 1);

    var messageBuffer = new Buffer(payload, 'utf8');

    return Buffer.concat([paddingBuffer, messageBuffer]);
  }

  encryptMessage(payload, keys) {
    var paddingBytes = 0;

    var paddingBuffer = new Buffer(1 + paddingBytes);
    paddingBuffer.fill(0);
    paddingBuffer.writeUIntBE(paddingBytes, 0, 1);

    var messageBuffer = new Buffer(payload, 'utf8');
    var record = Buffer.concat([paddingBuffer, messageBuffer]);

    var gcm = crypto.createCipheriv(
      'aes-128-gcm',
      keys.contentEncryptionKey,
      keys.nonce
    );

    var encryptedBuffer = gcm.update(record);
    gcm.final();

    return Buffer.concat([
      encryptedBuffer,
      gcm.getAuthTag()
    ]);
  }
}

module.exports = {
  EncryptionHelper: EncryptionHelper,
  HMAC: HMAC,
  HKDF: HKDF
};
