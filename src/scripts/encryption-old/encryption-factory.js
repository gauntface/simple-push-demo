/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* eslint-env browser */

// Length, in bytes, of the salt that should be used for the message.
const SALT_BYTES = 16;

class EncryptionHelperFactory {
  static generateHelper(options) {
    return Promise.resolve()
    .then(() => {
      const keyPromises = [
      ];

      if (options && options.serverKeys) {
        keyPromises.push(
          this.importKeys(options.serverKeys)
        );
      } else {
        keyPromises.push(this.generateKeys());
      }

      if (options && options.vapidKeys) {
        keyPromises.push(options.vapidKeys);
      }

      return Promise.all(keyPromises);
    })
    .then((results) => {
      let salt = null;
      if (options && options.salt) {
        salt = window.base64UrlToUint8Array(options.salt);
      } else {
        salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
      }

      return new window.gauntface.EncryptionHelper(
        results[0], salt, results[1]);
    });
  }

  static importKeys(keys) {
    if (!keys || !keys.publicKey || !keys.privateKey) {
      return Promise.reject(new Error('Bad options for key import'));
    }

    return Promise.resolve()
    .then(() => {
      return window.arrayBuffersToCryptoKeys(
        window.base64UrlToUint8Array(keys.publicKey),
        window.base64UrlToUint8Array(keys.privateKey)
      );
    });
  }

  static generateKeys() {
    // True is to make the keys extractable
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
      true, ['deriveBits']);
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
}
