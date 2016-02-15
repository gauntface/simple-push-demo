'use strict';

// This is a test and we want descriptions to be useful, if this
// breaks the max-length, it's ok.

/* eslint-disable max-len */

require('chai').should();
var Buffer = require('buffer').Buffer;
var urlBase64 = require('urlsafe-base64');

const PREDEFINED_SERVER_KEYS = {
  public: 'BOg5KfYiBdDDRF12Ri17y3v+POPr8X0nVP2jDjowPVI/DMKU1aQ3OLdPH1iaakvR9/PHq6tNCzJH35v/JUz2crY=',
  private: 'uDNsfsz91y2ywQeOHljVoiUg3j5RGrDVAswRqjP3v90=',
  salt: 'AAAAAAAAAAAAAAAAAAAAAA'
};

const PREDEFINED_SUBSCRIPTIONOBJECT = {
  endpoint: 'https://android.googleapis.com/gcm/send/FAKE_GCM_REGISTRATION_ID',
  keys: {
    p256dh: 'BCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQA=',
    auth: '8eDyX_uCN0XRhSbY5hs7Hg=='
  }
};

const CORRECT_VALUES = {
  sharedSecret: 'vgkL5otElJ7tB3jnxop9g7sGxuM4gGs5NL3qTCxe9JE',
  context: 'UC0yNTYAAEEEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAABBBOg5KfYiBdDDRF12Ri17y3v-POPr8X0nVP2jDjowPVI_DMKU1aQ3OLdPH1iaakvR9_PHq6tNCzJH35v_JUz2crY',
  cekInfo: 'Q29udGVudC1FbmNvZGluZzogYWVzZ2NtAFAtMjU2AABBBCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQAAQQToOSn2IgXQw0RddkYte8t7_jzj6_F9J1T9ow46MD1SPwzClNWkNzi3Tx9YmmpL0ffzx6urTQsyR9-b_yVM9nK2',
  nonceInfo: 'Q29udGVudC1FbmNvZGluZzogbm9uY2UAUC0yNTYAAEEEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAABBBOg5KfYiBdDDRF12Ri17y3v-POPr8X0nVP2jDjowPVI_DMKU1aQ3OLdPH1iaakvR9_PHq6tNCzJH35v_JUz2crY',
  prk: '9Ua-rfDdC4WzwO_W644ZISWGXpNp8bxDSICxjlr03xQ',
  contentEncryptionKey: '0G5bnzk_43i9yMq0uSyd9A',
  nonce: '6CkTryo-JSdq8TcG',
  paddedRecord: 'AGhlbGxv',
  encryptedPayload: 'CE2uS6BxfXlWHWfQhh3QWGZ3rWPcvRM'
};

const PAYLOAD = 'hello';

describe('Test Encryption Steps of a Push Message Payload', () => {
  var EncryptionHelper = require('../encryption-helper');
  var HMAC = require('../hmac');
  var HKDF = require('../hkdf');

  it('should instantiate a new helper', () => {
    new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
  });

  it('should create a server public, private key pair', () => {
    var serverKeys = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT).getServerKeys();
    serverKeys.should.be.a('object');
    serverKeys.should.have.property('public');
    serverKeys.should.have.property('private');
  });

  it('should instantiate a new helper with predefined server keys', () => {
    new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS
    });
  });

  // This test may work in Node 5.2 - See: https://github.com/nodejs/node/blob/master/CHANGELOG.md
  it('should have the provided server public, private key pair', () => {
    var serverKeys = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS
    }).getServerKeys();
    serverKeys.should.be.a('object');
    serverKeys.should.have.property('public');
    serverKeys.should.have.property('private');
    serverKeys.public.should.equal(PREDEFINED_SERVER_KEYS.public);
    serverKeys.private.should.equal(PREDEFINED_SERVER_KEYS.private);
  });

  it('should calculate a shared secret', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var sharedSecretTest = encryptionHelper.getSharedSecret();
    Buffer.isBuffer(sharedSecretTest).should.equal(true);
  });

  it('should calculate a shared secret', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS
    });
    var sharedSecretTest = encryptionHelper.getSharedSecret();
    Buffer.isBuffer(sharedSecretTest).should.equal(true);
    urlBase64.encode(sharedSecretTest).should.equal(CORRECT_VALUES.sharedSecret);
  });

  it('should generate a random salt - 16byte buffer', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var randSalt = encryptionHelper.getSalt();
    Buffer.isBuffer(randSalt).should.equal(true);
    randSalt.should.have.length(16);
  });

  it('should get the defined salt - 16byte buffer', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      salt: PREDEFINED_SERVER_KEYS.salt
    });
    var randSalt = encryptionHelper.getSalt();
    Buffer.isBuffer(randSalt).should.equal(true);
    randSalt.should.have.length(16);
    urlBase64.encode(randSalt).should.equal(PREDEFINED_SERVER_KEYS.salt);
  });

  // See: https://martinthomson.github.io/http-encrypt
  it('should generate a context', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var context = encryptionHelper.generateContext();

    Buffer.isBuffer(context).should.equal(true);
    context.should.have.length(5 + 1 + 2 + 65 + 2 + 65);
  });

  it('should generate a context with specific value', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS
    });
    var context = encryptionHelper.generateContext();

    Buffer.isBuffer(context).should.equal(true);
    context.should.have.length(5 + 1 + 2 + 65 + 2 + 65);
    urlBase64.encode(context).should.equal(CORRECT_VALUES.context);
  });

  it('should generate a cekInfo', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var cekInfo = encryptionHelper.generateCEKInfo();

    Buffer.isBuffer(cekInfo).should.equal(true);
    cekInfo.should.have.length(24 + 1 + urlBase64.decode(CORRECT_VALUES.context).length);
  });

  it('should generate the specific cekInfo', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });
    var cekInfo = encryptionHelper.generateCEKInfo();

    Buffer.isBuffer(cekInfo).should.equal(true);
    // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
    cekInfo.should.have.length(24 + 1 + urlBase64.decode(CORRECT_VALUES.context).length);
    urlBase64.encode(cekInfo).should.equal(CORRECT_VALUES.cekInfo);
  });

  it('should generate a nonceInfo', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var cekInfo = encryptionHelper.generateNonceInfo();

    Buffer.isBuffer(cekInfo).should.equal(true);
    cekInfo.should.have.length(23 + 1 + urlBase64.decode(CORRECT_VALUES.context).length);
  });

  it('should generate the specific nonceInfo', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });

    var nonceInfo = encryptionHelper.generateNonceInfo();

    Buffer.isBuffer(nonceInfo).should.equal(true);
    nonceInfo.should.have.length(23 + 1 + urlBase64.decode(CORRECT_VALUES.context).length);
    urlBase64.encode(nonceInfo).should.equal(CORRECT_VALUES.nonceInfo);
  });

  it('should have a working HMAC implementation', () => {
    var hmac = new HMAC(urlBase64.decode('AAAAAAAAAAAAAAAAAAAAAA'));
    var prk = hmac.sign(urlBase64.decode('AAAAAAAAAAAAAAAAAAAAAA'));
    urlBase64.encode(prk).should.equal('hTx0A5N9i2I5VpsYTreZP8X3Ua786ijyyGOFji0pxQs');
  });

  it('should have a working HKDF implementation', () => {
    var hkdf = new HKDF(urlBase64.decode('AAAAAAAAAAAAAAAAAAAAAA'), urlBase64.decode('AAAAAAAAAAAAAAAAAAAAAA'));
    var hkdfOutput = hkdf.generate(urlBase64.decode('AAAAAAAAAAAAAAAAAAAAAA'), 16);
    urlBase64.encode(hkdfOutput).should.equal('cS9spnQtVwB3AuvBt3wglw');
  });

  it('should generate a pseudo random key', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);
    var prk = encryptionHelper.generatePRK();
    Buffer.isBuffer(prk).should.equal(true);
  });

  it('should generate the specific pseudo random key', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });
    var prk = encryptionHelper.generatePRK();
    urlBase64.encode(prk).should.equal(CORRECT_VALUES.prk);
  });

  it('should generate encryption keys', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT);

    var keys = encryptionHelper.generateEncryptionKeys();

    Buffer.isBuffer(keys.contentEncryptionKey).should.equal(true);
    Buffer.isBuffer(keys.nonce).should.equal(true);
    keys.contentEncryptionKey.should.have.length(16);
    keys.nonce.should.have.length(12);
  });

  it('should generate specific encryption keys', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });

    var keys = encryptionHelper.generateEncryptionKeys();

    Buffer.isBuffer(keys.contentEncryptionKey).should.equal(true);
    Buffer.isBuffer(keys.nonce).should.equal(true);
    keys.contentEncryptionKey.should.have.length(16);
    keys.nonce.should.have.length(12);
    urlBase64.encode(keys.contentEncryptionKey).should.equal(CORRECT_VALUES.contentEncryptionKey);
    urlBase64.encode(keys.nonce).should.equal(CORRECT_VALUES.nonce);
  });

  it('should encrypt message', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });

    var encryptedMsg = encryptionHelper.encryptMessage(PAYLOAD);
    Buffer.isBuffer(encryptedMsg).should.equal(true);
  });

  it('should encrypt message with specific keys and salt', () => {
    var encryptionHelper = new EncryptionHelper(PREDEFINED_SUBSCRIPTIONOBJECT, {
      serverKeys: PREDEFINED_SERVER_KEYS,
      salt: PREDEFINED_SERVER_KEYS.salt
    });

    var encryptedMsg = encryptionHelper.encryptMessage(PAYLOAD);
    urlBase64.encode(encryptedMsg).should.equal(CORRECT_VALUES.encryptedPayload);
  });
});
