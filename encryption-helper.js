'use strict';

var crypto = require('crypto');

class EncryptionHelper {

  constructor(options) {
    // TODO: Check prime256v1 is valid

    this._ellipticCurve = crypto.createECDH('prime256v1');
    if (options && options.serverKeys && options.serverKeys.public &&
      options.serverKeys.private) {
      this._ellipticCurve.setPrivateKey(
        options.serverKeys.private,
        'base64'
      );
    }

    this._ellipticCurve.generateKeys();
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

  generateRandomSalt() {
    return crypto.randomBytes(16);
  }

  // What this is doing is (in laymans terms):
  //    1. Sign the auth secret with the shared secret using HMAC.
  //         (Both server and client can decrypt the shared secret to
  //         get the auth).
  //    2. Sign the result of step 1 with 'content-encoding: auth' to
  //         identify that the contents is the auth secret
  generatePseudoRandomKey(sharedSecret, authenticationSecret) {
    return new HKDF(sharedSecret, authenticationSecret)
      .generate('Content-Encoding: auth\0', 32);
  }

  generateContentEncryptionKey(pseudoRandomKey, salt) {
    var nonce = this.generateNonce(pseudoRandomKey, salt);
    var cekHKDF = new HKDF(pseudoRandomKey, salt)
      .generate('Content-Encoding: aesgcm128\0', 16);
    return crypto.createCipheriv('id-aes128-GCM', cekHKDF, nonce);
  }

  generateNonce(pseudoRandomKey, salt) {
    return new HKDF(pseudoRandomKey, salt)
      .generate('Content-Encoding: nonce\0', 12);
  }

  /** encryptMessage(payload, keys) {
    if (crypto.getCurves().indexOf('prime256v1') === -1) {
      // We need the P-256 Diffie Hellman Elliptic Curve to generate the server
      // certificates
      // secp256r1 === prime256v1
      console.log('We don\'t have the right Diffie Hellman curve to work.');
      return;
    }

    var webClientPublicKey = keys.p256dh;
    var webClientAuth = keys.auth;

    var serverKeys = generateServerKeys();
    console.log('Server Keys', serverKeys);

    var sharedSecret = generareSharedSecret(serverKeys, webClientPublicKey);
    console.log('Shared Secret', sharedSecret);

    const salt = crypto.randomBytes(16);
    console.log('Salt', salt);


  }**/
}

class HKDF {
  constructor(salt, inputKeyingMaterial) {
    this._salt = salt;
    this._ikm = inputKeyingMaterial;
  }

  generate(info, byteLength) {
    // HMAC One
    var hmac = crypto.createHmac('sha256', this._salt);
    var prk = hmac.update(this._ikm).digest();

    // HMAC Two
    hmac = crypto.createHmac('sha256', prk);
    prk = hmac.update(info).digest();
    if (prk.byteLength < byteLength) {
      throw new Error('Provided length to HKDF.generate is too long.');
    }
    return prk.slice(0, byteLength);
  }
}

module.exports = EncryptionHelper;
