/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* eslint-env browser */

class EncryptionHelperFactory {
  static generateHelper() {
    let supportedContentEncodings = ['aesgcm'];
    if (PushManager.supportedContentEncodings) {
      supportedContentEncodings = PushManager.supportedContentEncodings;
    }

    switch(supportedContentEncodings[0]) {
      case 'aesgcm':
        return new window.gauntface.EncryptionHelperAESGCM();
      case 'aes128gcm':
        return new window.gauntface.EncryptionHelperAES128GCM();
      default:
        throw new Error('Unknown content encoding: ' +
          supportedContentEncodings[0]);
    }
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.EncryptionHelperFactory = EncryptionHelperFactory;
}
