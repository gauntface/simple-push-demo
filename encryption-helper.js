'use strict';

var crypto = require('crypto');
var urlBase64 = require('urlsafe-base64');

var HKDF = require('./hkdf');

class EncryptionHelper {
  constructor(subscriptionObject, options) {
    if (
      typeof subscriptionObject === 'undefined' ||
      subscriptionObject === null ||
      !subscriptionObject.keys ||
      !subscriptionObject.keys.p256dh ||
      !subscriptionObject.keys.auth
    ) {
      throw new Error('Bad subscription object');
    }

    this._subscriptionObject = subscriptionObject;
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

  getSharedSecret() {
    return this._ellipticCurve.computeSecret(
      this._subscriptionObject.keys.p256dh,
      'base64');
  }

  getSalt() {
    return this._salt;
  }

  // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
  generateContext() {
    var labelBuffer = new Buffer('P-256', 'ascii');
    var paddingBuffer = new Buffer(1).fill(0);

    var clientPublicKeyBuffer = urlBase64.decode(
      this._subscriptionObject.keys.p256dh);

    var clientPublicKeyLengthBuffer = new Buffer(2);
    clientPublicKeyLengthBuffer.writeUIntBE(clientPublicKeyBuffer.length, 0, 2);

    var serverPublicKeyBuffer = urlBase64.decode(this.getServerKeys().public);
    var serverPublicKeyLengthBuffer = new Buffer(2);
    serverPublicKeyLengthBuffer.writeUIntBE(serverPublicKeyBuffer.length, 0, 2);

    return Buffer.concat([
      labelBuffer,
      paddingBuffer,
      clientPublicKeyLengthBuffer,
      clientPublicKeyBuffer,
      serverPublicKeyLengthBuffer,
      serverPublicKeyBuffer
    ]);
  }

  generateCEKInfo() {
    let contextBuffer = this.generateContext();
    var contentEncodingBuffer = new Buffer('Content-Encoding: aesgcm128',
      'utf8');
    var paddingBuffer = new Buffer(1).fill(0);

    return Buffer.concat([
      contentEncodingBuffer,
      paddingBuffer,
      contextBuffer
    ]);
  }

  generateNonceInfo() {
    let contextBuffer = this.generateContext();
    var contentEncodingBuffer = new Buffer('Content-Encoding: nonce',
      'utf8');
    var paddingBuffer = new Buffer(1).fill(0);

    return Buffer.concat([
      contentEncodingBuffer,
      paddingBuffer,
      contextBuffer
    ]);
  }

  generatePRK() {
    var authInfoBuffer = new Buffer('Content-Encoding: auth\0', 'utf8');
    var hkdf = new HKDF(
      this.getSharedSecret(),
      urlBase64.decode(this._subscriptionObject.keys.auth));
    return hkdf.generate(authInfoBuffer, 32);
  }

  generateEncryptionKeys() {
    var prk = this.generatePRK();
    var cekInfo = this.generateCEKInfo();
    var nonceInfo = this.generateNonceInfo();

    var hkdf = new HKDF(prk, this._salt);
    var cekPrk = hkdf.generate(cekInfo, 16);

    hkdf = new HKDF(prk, this._salt);
    var noncePrk = hkdf.generate(nonceInfo, 12);

    return {
      contentEncryptionKey: cekPrk,
      nonce: noncePrk
    };
  }

  encryptMessage(message) {
    var keys = this.generateEncryptionKeys();
    var paddingBytes = 0;

    var paddingBuffer = new Buffer(1 + paddingBytes);
    paddingBuffer.fill(0);
    paddingBuffer.writeUIntBE(paddingBytes, 0, 1);

    var messageBuffer = new Buffer(message, 'utf8');
    var record = Buffer.concat([paddingBuffer, messageBuffer]);

    var gcm = crypto.createCipheriv(
      'id-aes128-GCM',
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

module.exports = EncryptionHelper;
