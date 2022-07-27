/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

import {EncryptionAESGCM} from '/scripts/encryption/encryption-aes-gcm.js';
import {EncryptionAES128GCM}
  from '/scripts/encryption/encryption-aes-128-gcm.js';

/* eslint-env browser */

export class EncryptionFactory {
  static generateHelper() {
    let supportedContentEncodings = ['aesgcm'];
    if (PushManager.supportedContentEncodings) {
      supportedContentEncodings = PushManager.supportedContentEncodings;
    }

    switch (supportedContentEncodings[0]) {
      case 'aesgcm':
        return new EncryptionAESGCM();
      case 'aes128gcm':
        return new EncryptionAES128GCM();
      default:
        throw new Error('Unknown content encoding: ' +
          supportedContentEncodings[0]);
    }
  }
}
