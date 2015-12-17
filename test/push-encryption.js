'use strict';

require('chai').should();
var Buffer = require('buffer').Buffer;
// This is a test and we want descriptions to be useful, if this
// breaks the max-length, it's ok.

/* eslint-disable max-len */

describe('Test Encryption Steps of a Push Message Payload', () => {
  var EncryptionHelper = require('../encryption-helper');

  const PREDEFINED_SERVER_KEYS = {
    public: 'BOg5KfYiBdDDRF12Ri17y3v+POPr8X0nVP2jDjowPVI/DMKU1aQ3OLdPH1iaakvR9/PHq6tNCzJH35v/JUz2crY=',
    private: 'uDNsfsz91y2ywQeOHljVoiUg3j5RGrDVAswRqjP3v90='
  };
  const PREDEFINED_SUBSCRIPTIONOBJECT = {
    endpoint: 'https://android.googleapis.com/gcm/send/FAKE_GCM_REGISTRATION_ID',
    keys: {
      p256dh: 'BOu1_myj2IlO4Ljj22HYkwv_ZEu_5Iwu-TK0uCgCFmW168VF6uDA7R1doegxoEzRKhZklL0CPZ4-T3VOmnsldrQ=',
      auth: '8eDyX_uCN0XRhSbY5hs7Hg=='
    }
  };

  it('should instantiate a new helper', () => {
    new EncryptionHelper();
  });

  it('should create a server public, private key pair', () => {
    var serverKeys = new EncryptionHelper().getServerKeys();
    serverKeys.should.be.a('object');
    serverKeys.should.have.property('public');
    serverKeys.should.have.property('private');
  });

  it('should instantiate a new helper with predefined server keys', () => {
    new EncryptionHelper({
      serverKeys: PREDEFINED_SERVER_KEYS
    });
  });

  // This test may work in Node 5.2 - See: https://github.com/nodejs/node/blob/master/CHANGELOG.md
  it('should have the provided server public, private key pair', () => {
    var serverKeys = new EncryptionHelper({
      serverKeys: PREDEFINED_SERVER_KEYS
    }).getServerKeys();
    serverKeys.should.be.a('object');
    serverKeys.should.have.property('public');
    serverKeys.should.have.property('private');
    serverKeys.private.should.equal(PREDEFINED_SERVER_KEYS.private);
  });

  it('should calculate a shared secret', () => {
    var encryptionHelper = new EncryptionHelper();
    var sharedSecret = encryptionHelper.getSharedSecret(
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.p256dh
    );
    sharedSecret.should.be.a('string');
  });

  it('should generate a random salt - 16byte buffer', () => {
    var encryptionHelper = new EncryptionHelper();
    var randSalt = encryptionHelper.generateRandomSalt();
    Buffer.isBuffer(randSalt).should.equal(true);
    randSalt.should.have.length(16);
  });

  it('should generate a pseudo random key', () => {
    var encryptionHelper = new EncryptionHelper();
    var sharedSecret = encryptionHelper.getSharedSecret(
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.p256dh
    );
    var prk = encryptionHelper.generatePseudoRandomKey(
      sharedSecret,
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.auth
    );
    Buffer.isBuffer(prk).should.equal(true);
    // TODO: Why 32 bits?
    prk.should.have.length(32);
  });

  it('should generate a nonce', () => {
    var encryptionHelper = new EncryptionHelper();
    var randSalt = encryptionHelper.generateRandomSalt();
    var sharedSecret = encryptionHelper.getSharedSecret(
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.p256dh
    );
    var prk = encryptionHelper.generatePseudoRandomKey(
      sharedSecret,
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.auth
    );
    var nonce = encryptionHelper.generateNonce(
      prk,
      randSalt
    );
    Buffer.isBuffer(nonce).should.equal(true);
    // cek should be 16 bytes long for AES_GCM
    nonce.should.have.length(12);
  });

  it('should generate a content encryption key', () => {
    var encryptionHelper = new EncryptionHelper();
    var randSalt = encryptionHelper.generateRandomSalt();
    var sharedSecret = encryptionHelper.getSharedSecret(
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.p256dh
    );
    var prk = encryptionHelper.generatePseudoRandomKey(
      sharedSecret,
      PREDEFINED_SUBSCRIPTIONOBJECT.keys.auth
    );
    var cek = encryptionHelper.generateContentEncryptionKey(
      prk,
      randSalt
    );
    cek.should.be.a('object');
  });

});
