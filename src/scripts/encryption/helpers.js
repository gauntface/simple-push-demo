/* eslint-env browser */

function uint8ArrayToBase64Url(uint8Array, start, end) {
  start = start || 0;
  end = end || uint8Array.byteLength;

  const base64 = window.btoa(
    String.fromCharCode.apply(null, uint8Array.subarray(start, end)));
  return base64
    .replace(/\=/g, '') // eslint-disable-line no-useless-escape
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
function base64UrlToUint8Array(base64UrlData) {
  const padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  const base64 = (base64UrlData + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

// Super inefficient. But easier to follow than allocating the
// array with the correct size and position values in that array
// as required.
function joinUint8Arrays(allUint8Arrays) {
  return allUint8Arrays.reduce(function(cumulativeValue, nextValue) {
    if (!(nextValue instanceof Uint8Array)) {
      console.error('Received an non-Uint8Array value:', nextValue);
      throw new Error('Received an non-Uint8Array value.');
    }

    const joinedArray = new Uint8Array(
      cumulativeValue.byteLength + nextValue.byteLength
    );
    joinedArray.set(cumulativeValue, 0);
    joinedArray.set(nextValue, cumulativeValue.byteLength);
    return joinedArray;
  }, new Uint8Array());
}

function arrayBuffersToCryptoKeys(publicKey, privateKey) {
  // Length, in bytes, of a P-256 field element. Expected format of the private
  // key.
  const PRIVATE_KEY_BYTES = 32;

  // Length, in bytes, of a P-256 public key in uncompressed EC form per SEC
  // 2.3.3. This sequence must start with 0x04. Expected format of the
  // public key.
  const PUBLIC_KEY_BYTES = 65;

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

function cryptoKeysToUint8Array(publicKey, privateKey) {
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

  function generateSalt() {
    const SALT_BYTES = 16;
    return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  }

if (window) {
  window.uint8ArrayToBase64Url = uint8ArrayToBase64Url;
  window.base64UrlToUint8Array = base64UrlToUint8Array;
  window.joinUint8Arrays = joinUint8Arrays;
  window.arrayBuffersToCryptoKeys = arrayBuffersToCryptoKeys;
  window.cryptoKeysToUint8Array = cryptoKeysToUint8Array;
  window.generateSalt = generateSalt;
} else if (module && module.exports) {
  module.exports = {
    uint8ArrayToBase64Url,
    base64UrlToUint8Array,
    joinUint8Arrays,
    arrayBuffersToCryptoKeys,
    cryptoKeysToUint8Array,
  };
}
