// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

// Converts the contents of |arrayBuffer| in range of [start, end] to an URL-
// safe base64 encoded representation.
function toBase64Url(arrayBuffer, start, end) {
  start = start || 0;
  end = end || arrayBuffer.byteLength;

  var buffer = new Uint8Array(arrayBuffer.slice(start, end)),
      base64 = btoa(String.fromCharCode.apply(null, buffer));

  return base64.replace(/=/g, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}

// Converts the |data| from an URL-safe base64 encoded string to an ArrayBuffer
// holding the same information.
function fromBase64Url(data) {
  var input = data.padRight(data.length + (4 - data.length % 4) % 4, '=')
                  .replace(/\-/g, '+')
                  .replace(/_/g, '/');

  return toArrayBuffer(atob(input));
}

// Converts the string |data| to an ArrayBuffer. All characters in the string
// are expected to be in range of [0, 255].
function toArrayBuffer(data) {
  var buffer = new ArrayBuffer(data.length),
      bufferView = new Uint8Array(buffer);

  for (var i = 0; i < data.length; ++i)
    bufferView[i] = data.charCodeAt(i);

  return buffer;
}

// -----------------------------------------------------------------------------

// Exports |cryptoKey| as an uncompressed NIST P-256 point (65 bytes).
function exportUncompressedP256Point(cryptoKey) {
  return crypto.subtle.exportKey('jwk', cryptoKey).then(function(jwk) {
    // Create the public key in uncompressed point form. Surely there must be
    // a better way of doing this?
    var publicKey = new Uint8Array(65);
    publicKey.set([0x04]);
    publicKey.set(new Uint8Array(fromBase64Url(jwk.x)), 1);
    publicKey.set(new Uint8Array(fromBase64Url(jwk.y)), 33);

    return publicKey;
  });
}

function HMAC(ikm) {
  this.signPromise_ = crypto.subtle.importKey(
      'raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

HMAC.prototype.sign = function(input) {
  return this.signPromise_.then(function(key) {
    return crypto.subtle.sign('HMAC', key, input);
  });
};

function HKDF(ikm, salt) {
  var hmac = new HMAC(salt);

  this.extractPromise_ = hmac.sign(ikm).then(function(prk) {
    return new HMAC(prk);
  });
}

HKDF.prototype.extract = function(rawInfo, byteLength) {
  var info = new Uint8Array(rawInfo.byteLength + 1);
  info.set(new Uint8Array(rawInfo));
  info.set(new Uint8Array([1]), rawInfo.byteLength);

  return this.extractPromise_.then(function(prkHmac) {
    return prkHmac.sign(info);
  }).then(function(hkdf) {
    return hkdf.slice(0, byteLength);
  });
};

// -----------------------------------------------------------------------------

// Implementation of Web Push Encryption based on WebCrypto that provides
// routines both for encrypting and decrypting content.
function WebPushEncryption() {
  this.recipientPublicKey_ = null;
  this.senderKeys_ = null;  // either CryptoKeys or ArrayBuffers

  this.salt_ = null;
  this.authenticationSecret_ = null;
}

WebPushEncryption.P256_FIELD_BYTES = 32;
WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES = 65;

WebPushEncryption.SALT_SIZE = 16;
WebPushEncryption.MIN_AUTH_SECRET_BYTES = 16;

// Sets |publicKey| as the public key associated with the recipient. It must
// be an ArrayBuffer containing a NIST P-256 uncompressed EC point.
WebPushEncryption.prototype.setRecipientPublicKey = function(publicKey) {
  if (!(publicKey instanceof ArrayBuffer) ||
      publicKey.byteLength != WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES) {
    throw new Error('The publicKey is expected to be a 65-byte ArrayBuffer.');
  }

  this.recipientPublicKey_ = publicKey;
};

// Creates a new public/private key pair for the sender. Returns a Promise that
// will be resolved once the keys have been created.
WebPushEncryption.prototype.createSenderKeys = function() {
  var self = this;

  return Promise.resolve().then(function() {
    return crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);

  }).then(function(keys) {
    self.senderKeys_ = keys;
  });
};

// Sets |privateKey| and |publicKey| as the key-pair associated with the sender.
// Both must be ArrayBuffer instances, respectively having 32- and 65 bytes
// of content. (As indicated by the constants.)
WebPushEncryption.prototype.setSenderKeys = function(privateKey, publicKey) {
  if (!(privateKey instanceof ArrayBuffer) ||
      privateKey.byteLength != WebPushEncryption.P256_FIELD_BYTES) {
    throw new Error('The privateKey is expected to be a 32-byte ArrayBuffer.');
  }

  if (!(publicKey instanceof ArrayBuffer) ||
      publicKey.byteLength != WebPushEncryption.P256_UNCOMPRESSED_POINT_BYTES) {
    throw new Error('The publicKey is expected to be a 65-byte ArrayBuffer.');
  }

  this.senderKeys_ = {
    privateKey: privateKey,
    publicKey: publicKey
  };
};

// Creates a salt of appropriate size for the payload.
WebPushEncryption.prototype.createSalt = function() {
  this.salt_ = new Uint8Array(WebPushEncryption.SALT_SIZE);
  crypto.getRandomValues(this.salt_);
};

// Sets the salt to use for the payload to |salt|. It must be an ArrayBuffer
// having 16-bytes of data.
WebPushEncryption.prototype.setSalt = function(salt) {
  if (!(salt instanceof ArrayBuffer) ||
      salt.byteLength != WebPushEncryption.SALT_SIZE) {
    throw new Error('The salt is expected to be a 16-byte ArrayBuffer.');
  }

  this.salt_ = salt;
}

// Sets the authentication secret to use for creating the payload to |secret|,
// which must be an ArrayBuffer having at least 16 bytes of data.
WebPushEncryption.prototype.setAuthenticationSecret = function(secret) {
  if (!(secret instanceof ArrayBuffer) ||
      secret.byteLength != WebPushEncryption.MIN_AUTH_SECRET_BYTES) {
    throw new Error('The secret is expected to be a >=16-byte ArrayBuffer.');
  }

  this.authenticationSecret_ = secret;
};

// Derives the shared secret between the sender's private key and the recipient
// their public key. Assumes usage of the NIST P-256 curves.
WebPushEncryption.prototype.deriveSharedSecret = function() {
  var self = this;

  var recipientPublicKey = null;
  return Promise.resolve().then(function() {
    // (1) Import the recipient's public key, which is an EC uncompressed point.
    var jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(self.recipientPublicKey_, 1, 33),
      y: toBase64Url(self.recipientPublicKey_, 33, 65)
    };

    return crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, true, []);

  }).then(function(publicKey) {
    recipientPublicKey = publicKey;

    // (2) Create a CryptoKey instance for the ECDH P-256 private key.
    // (2a) When already created, return the existing instance instead.
    if (self.senderKeys_.privateKey instanceof CryptoKey)
      return self.senderKeys_.privateKey;

    // (2b) Import the private key by creating another JWK object.
    var jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(self.senderKeys_.publicKey, 1, 33),
      y: toBase64Url(self.senderKeys_.publicKey, 33, 65),
      d: toBase64Url(self.senderKeys_.privateKey, 0, 32),
      ext: true
    };

    return crypto.subtle.importKey(
        'jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false,
        ['deriveBits']);

  }).then(function(privateKey) {
    // (3) Derive the shared secret between the sender and the recipient.
    return crypto.subtle.deriveBits(
        { name: 'ECDH', namedCurve: 'P-256', public: recipientPublicKey },
        privateKey, WebPushEncryption.P256_FIELD_BYTES * 8);

  });
};

// Drives the encryption keys to use for the payload - the content encryption
// key, and the nonce (which will be used as the IV to AES-128-GCM). These
// account for the CEK and Nonce info parameters that contain the public keys
// of both the sender and the recipient of the message.
WebPushEncryption.prototype.deriveEncryptionKeys = function(sharedSecret) {
  var self = this;
  // (1) Determine the uncompressed point representation of the NIST P-256
  // public value stored in the |senderKeys_| member.
  return Promise.resolve().then(function() {
    console.log('HERE 4.1');
    if (self.senderKeys_.publicKey instanceof ArrayBuffer) {
      console.log('HERE 4.2');
      return self.senderKeys_.publicKey;
    }
    console.log('HERE 4.3');

    return exportUncompressedP256Point(self.senderKeys_.publicKey);

  }).then(function(senderPublic) {
    console.log('HERE 4.4');
    var UTF8 = new TextEncoder('utf-8');

    // (2) Derive the context for the info parameters used to determine the
    // content encryption key and the nonce (IV). It contains the public keys
    // of both the recipient and the sender.
    //
    // context = label || 0x00 ||
    //           length(recipient_public) || recipient_public ||
    //           length(sender_public) || sender_public
    console.log('HERE 4.5');
    var context = new Uint8Array(5 + 1 + 2 + 65 + 2 + 65);
    context.set([0x50, 0x2D, 0x32, 0x35, 0x36], 0);  // "P-256"

    context.set([0x00, self.recipientPublicKey_.byteLength], 6);
    context.set(new Uint8Array(self.recipientPublicKey_), 8);

    context.set([0x00, senderPublic.byteLength], 73);
    context.set(new Uint8Array(senderPublic), 75);
    console.log('HERE 4.6');

    // (3) Derive the cek_info and the nonce_info.
    //
    // cek_info = "Content-Encoding: aesgcm128" || 0x00 || context
    // nonce_info = "Content-Encoding: nonce" || 0x00 || context

    var cekInfo = new Uint8Array(27 + 1 + context.byteLength);
    var nonceInfo = new Uint8Array(23 + 1 + context.byteLength);

    cekInfo.set(UTF8.encode('Content-Encoding: aesgcm128'));
    cekInfo.set(context, 28);
    console.log('HERE 4.7');
    nonceInfo.set(UTF8.encode('Content-Encoding: nonce'));
    nonceInfo.set(context, 24);
    console.log('HERE 4.8');

    // (4) Using the authentication data, derive the PRK and use it to further
    // derive the content encryption key and the nonce, also using the info
    // values derived in step (6) above.

    var authInfo = UTF8.encode('Content-Encoding: auth\0');
    console.log('HERE 4.9');
    console.log('sharedSecret', sharedSecret);
    console.log('self.authenticationSecret_', self.authenticationSecret_);
    var hkdf = new HKDF(sharedSecret, self.authenticationSecret_);
    return hkdf.extract(authInfo, 32).then(function(prk) {
      console.log('HERE 4.10');
      hkdf = new HKDF(prk, self.salt_);
      console.log('HERE 4.11');
      return Promise.all([
        hkdf.extract(cekInfo, 16).then(function(bits) {
          return crypto.subtle.importKey(
              'raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
        }),
        hkdf.extract(nonceInfo, 12)
      ]);
    }).then(function(keys) {
      console.log('HERE 4.12');
      return { contentEncryptionKey: keys[0],
               nonce: keys[1] };
    });
  });
};

// Encrypts |plaintext|, which must either be an ArrayBuffer or a string that
// can be encoded as UTF-8 content. Optionally, between 0 and 255 bytes of
// padding data can be provided in |paddingBytes| to hide the content's length.
WebPushEncryption.prototype.encrypt = function(plaintext, paddingBytes) {
  if (!(plaintext instanceof ArrayBuffer)) {
    plaintext = new TextEncoder('utf-8').encode(plaintext);
  }
  console.log('HERE 1');
  paddingBytes = paddingBytes || 0;
  if (typeof paddingBytes !== 'number' ||
    paddingBytes < 0 ||
    paddingBytes > 255) {
    throw new Error('The number of padding bytes must be between 0 and 255.');
  }
  console.log('HERE 2');
  var ciphertext = null;
  var self = this;
  console.log('HERE 3');
  return this.deriveSharedSecret()
  .then(function(sharedSecret) {
    console.log('HERE 4');
    return self.deriveEncryptionKeys(sharedSecret);
  }).then(function(keys) {
    console.log('HERE 5');
    var encryptionInfo = {
      name: 'AES-GCM',
      iv: keys.nonce,
      tagLength: 128
    };

    // Create the record for the data, which is a byte for the length of the
    // padding, followed by a number of NULL bytes for the padding, followed by
    // the actual content of the plaintext.
    var record = new Uint8Array(1 + paddingBytes + plaintext.byteLength);
    record.set([ 0 ]);
    record.set(new Uint8Array(plaintext), 1 + paddingBytes);

    return crypto.subtle.encrypt(
        encryptionInfo, keys.contentEncryptionKey, record);

  }).then(function(decrypted) {
    ciphertext = decrypted;

    if (self.senderKeys_.publicKey instanceof ArrayBuffer)
      return self.senderKeys_.publicKey;

    return exportUncompressedP256Point(self.senderKeys_.publicKey);

  }).then(function(publicKey) {
    return {
      ciphertext: ciphertext,
      salt: toBase64Url(self.salt_),
      dh: toBase64Url(publicKey)
    };
  });
};

// Decrypts the |ciphertext| with the encryption information known within this
// instance. Padding prepended to the record will be removed automatically.
WebPushEncryption.prototype.decrypt = function(ciphertext) {
  var self = this;

  return this.deriveSharedSecret().then(function(sharedSecret) {
    return self.deriveEncryptionKeys(sharedSecret);

  }).then(function(keys) {
    var decryptionInfo = {
      name: 'AES-GCM',
      iv: keys.nonce,
      tagLength: 128
    };

    return crypto.subtle.decrypt(
        decryptionInfo, keys.contentEncryptionKey, ciphertext);

  }).then(function(recordBuffer) {
    var record = new Uint8Array(recordBuffer),
        paddingBytes = record[0];

    return recordBuffer.slice(1 + paddingBytes);
  });
};
