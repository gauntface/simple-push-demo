/* eslint-env browser */

describe('EncryptionFactory Tests', function() {
  let initialContentEncoding;

  before(function() {
    initialContentEncoding = window.PushManager.supportedContentEncodings;
  });

  after(function() {
    window.PushManager.supportedContentEncodings = initialContentEncoding;
  });

  // Test no content encoding
  it('should default to aesgcm if no content encoding', function() {
    delete window.PushManager.supportedContentEncodings;
    const helper = window.gauntface.EncryptionHelperFactory.generateHelper();
    (helper instanceof window.gauntface.EncryptionHelperAESGCM).should.equal(true);
  });

  // Test with content encoding of just aesgcm
  it('should use aesgcm if first encoding', function() {
    window.PushManager.supportedContentEncodings = ['aesgcm', 'aes128gcm'];
    const helper = window.gauntface.EncryptionHelperFactory.generateHelper();
    (helper instanceof window.gauntface.EncryptionHelperAESGCM).should.equal(true);
  });

  // Test with content encoding with aes128gcm
  it('should use aes128gcm if first encoding', function() {
    window.PushManager.supportedContentEncodings = ['aes128gcm', 'aesgcm'];

    const helper = window.gauntface.EncryptionHelperFactory.generateHelper();
    (helper instanceof window.gauntface.EncryptionHelperAES128GCM).should.equal(true);
  });

  // Test with unknown encoding
  it('should throw for unknown first encoding', function() {
    window.PushManager.supportedContentEncodings = ['unknown', 'aes128gcm'];
    window.chai.expect(() => {
      window.gauntface.EncryptionHelperFactory.generateHelper();
    }).to.throw('Unknown content encoding: ');
  });
});
