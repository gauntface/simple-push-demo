/* eslint-env browser,mocha */

'use strict';

describe('Test Web Push Encryption', function() {
  const PAYLOAD = 'Hello, world!';
  const VALID_SERVER_KEYS = {
    publicKey: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    privateKey: 'Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4'
  };
  const VALID_SALT = 'AAAAAAAAAAAAAAAAAAAAAA';

  const VALID_SUBSCRIPTION = {
    endpoint: 'https://android.googleapis.com/gcm/send/FAKE_GCM_REGISTRATION_ID',
    keys: {
      p256dh: 'BCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQA=',
      auth: '8eDyX_uCN0XRhSbY5hs7Hg=='
    }
  };

  const VALID_OUTPUT = {
    sharedSecret: 'GOr9wG2bF4vCrnE_sOnwM7k-ZguFYyPMbtd5ESmT0gs',
    context: 'UC0yNTYAAEEEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAABBBG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    cekInfo: 'Q29udGVudC1FbmNvZGluZzogYWVzZ2NtAFAtMjU2AABBBCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQAAQQRtzhh65d2CeTx6ZdBkqrQAJVD58dS78ELxTCHOvL4SVOpyJEczxKrQnbkM_MEI9K-9TVT86-2UZNn_n4bEOaSv',
    nonceInfo: 'Q29udGVudC1FbmNvZGluZzogbm9uY2UAUC0yNTYAAEEEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAABBBG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    prk: 'SfahPAaEhUazMRsu7H00NG1F_pHSm0wynhpkEPmn4mE',
    contentEncryptionKey: 'DvXDFb5AxYrVJHCcYS6LkA',
    nonce: '9lpH1RH1uUoNJ8yh',
    payload: 'WhrsIm-1bGLEyKIaQjhfgMZVGd3wbMsVtvxobcH62Q'
  };

  it('should be able to get the encryption helper', function() {
    (typeof window.gauntface.EncryptionHelperFactory).should.not.equal('undefined');
    (typeof window.gauntface.EncryptionHelper).should.not.equal('undefined');
  });

  it('should be able to generate keys', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    factory.generateKeys()
    .then(keys => {
      keys.should.not.equal('undefined');
      keys.should.have.property('publicKey');
      keys.should.have.property('privateKey');
    });
  });

  it('should be able to create new Encryption Helper', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      (typeof testEncryption).should.not.equal('undefined');
    });
  });

  it('should create new certificates if nothing is passed in', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    const EncryptionHelper = window.gauntface.EncryptionHelper;
    return factory.generateHelper()
    .then(testEncryption => {
      (testEncryption.getPublicServerKey() instanceof CryptoKey).should.equal(true);
      (testEncryption.getPrivateServerKey() instanceof CryptoKey).should.equal(true);
      return EncryptionHelper.exportCryptoKeys(
        testEncryption.getPublicServerKey(),
        testEncryption.getPrivateServerKey()
      );
    })
    .then(keys => {
      (keys.publicKey instanceof Uint8Array).should.equal(true);
      (keys.privateKey instanceof Uint8Array).should.equal(true);

      (keys.publicKey.length).should.equal(65);
      (keys.privateKey.length).should.equal(32);
    });
  });

  it('should accept valid input certificates', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    const EncryptionHelper = window.gauntface.EncryptionHelper;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS
    })
    .then(testEncryption => {
      (testEncryption.getPublicServerKey() instanceof CryptoKey).should.equal(true);
      (testEncryption.getPrivateServerKey() instanceof CryptoKey).should.equal(true);
      return EncryptionHelper.exportCryptoKeys(
        testEncryption.getPublicServerKey(),
        testEncryption.getPrivateServerKey()
      );
    })
    .then(keys => {
      (keys.publicKey instanceof Uint8Array).should.equal(true);
      (keys.privateKey instanceof Uint8Array).should.equal(true);

      (keys.publicKey.length).should.equal(65);
      (keys.privateKey.length).should.equal(32);

      const publicKey = window.uint8ArrayToBase64Url(keys.publicKey);
      const privateKey = window.uint8ArrayToBase64Url(keys.privateKey);
      publicKey.should.equal(VALID_SERVER_KEYS.publicKey);
      privateKey.should.equal(VALID_SERVER_KEYS.privateKey);
    });
  });

  it('should calculate a shared secret', () => {
    /**
     * Referred to as IKM on https://tests.peter.sh/push-encryption-verifier/
     */
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS
    })
    .then(testEncryption => {
      return testEncryption.getSharedSecret(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(sharedSecret => {
      (sharedSecret instanceof ArrayBuffer).should.equal(true);
      const base64Secret = window.uint8ArrayToBase64Url(new Uint8Array(sharedSecret));
      base64Secret.should.equal(VALID_OUTPUT.sharedSecret);
    });
  });

  it('should generate a random salt', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS
    })
    .then(testEncryption => {
      (testEncryption.getSalt() instanceof Uint8Array).should.equal(true);
    });
  });

  it('should use defined salt', function() {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      (testEncryption.getSalt() instanceof Uint8Array).should.equal(true);
      const base64Salt = window.uint8ArrayToBase64Url(testEncryption.getSalt());
      base64Salt.should.equal(VALID_SALT);
    });
  });

  // See: https://martinthomson.github.io/http-encrypt
  it('should generate a context', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.generateContext(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(context => {
      (context instanceof Uint8Array).should.equal(true);
      context.byteLength.should.equal(5 + 1 + 2 + 65 + 2 + 65);
    });
  });

  it('should generate a context with the expected output', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.generateContext(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(context => {
      (context instanceof Uint8Array).should.equal(true);
      context.byteLength.should.equal(5 + 1 + 2 + 65 + 2 + 65);
      const base64Context = window.uint8ArrayToBase64Url(context);
      base64Context.should.equal(VALID_OUTPUT.context);
    });
  });

  it('should generate a cekInfo', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.generateCEKInfo(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(cekInfo => {
      (cekInfo instanceof Uint8Array).should.equal(true);
      cekInfo.byteLength.should.equal(24 + 1 + 5 + 1 + 2 + 65 + 2 + 65);
    });
  });

  it('should generate the specific cekInfo', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.generateCEKInfo(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(cekInfo => {
      (cekInfo instanceof Uint8Array).should.equal(true);
      cekInfo.byteLength.should.equal(24 + 1 + 5 + 1 + 2 + 65 + 2 + 65);

      // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
      const base64CekInfo = window.uint8ArrayToBase64Url(cekInfo);
      base64CekInfo.should.equal(VALID_OUTPUT.cekInfo);
    });
  });

  it('should generate a nonceInfo', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.generateNonceInfo(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(nonceInfo => {
      (nonceInfo instanceof Uint8Array).should.equal(true);
      nonceInfo.byteLength.should.equal(23 + 1 + 5 + 1 + 2 + 65 + 2 + 65);
    });
  });

  it('should generate the specific nonceInfo', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.generateNonceInfo(VALID_SUBSCRIPTION.keys.p256dh);
    })
    .then(nonceInfo => {
      (nonceInfo instanceof Uint8Array).should.equal(true);
      nonceInfo.byteLength.should.equal(23 + 1 + 5 + 1 + 2 + 65 + 2 + 65);

      // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
      const base64NonceInfo = window.uint8ArrayToBase64Url(nonceInfo);
      base64NonceInfo.should.equal(VALID_OUTPUT.nonceInfo);
    });
  });

  it('should have a working HMAC implementation', () => {
    const HMAC = window.gauntface.HMAC;
    const hmac = new HMAC(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'));
    return hmac.sign(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'))
    .then(prk => {
      (prk instanceof ArrayBuffer).should.equal(true);
      const base64Prk = window.uint8ArrayToBase64Url(new Uint8Array(prk));
      base64Prk.should.equal('hTx0A5N9i2I5VpsYTreZP8X3Ua786ijyyGOFji0pxQs');
    });
  });

  it('should have a working HKDF implementation', () => {
    const HKDF = window.gauntface.HKDF;
    const hkdf = new HKDF(
      window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'),
      window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA')
    );
    return hkdf.generate(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'), 16)
    .then(hkdfOutput => {
      (hkdfOutput instanceof ArrayBuffer).should.equal(true);
      const base64HKDFOutput = window.uint8ArrayToBase64Url(new Uint8Array(hkdfOutput));
      base64HKDFOutput.should.equal('cS9spnQtVwB3AuvBt3wglw');
    });
  });

  it('should generate a pseudo random key', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.generatePRK(VALID_SUBSCRIPTION);
    })
    .then(prk => {
      (prk instanceof ArrayBuffer).should.equal(true);
    });
  });

  it('should generate the specific pseudo random key', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.generatePRK(VALID_SUBSCRIPTION);
    })
    .then(prk => {
      (prk instanceof ArrayBuffer).should.equal(true);

      const base64prk = window.uint8ArrayToBase64Url(new Uint8Array(prk));
      base64prk.should.equal(VALID_OUTPUT.prk);
    });
  });

  it('should generate encryption keys', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.generateEncryptionKeys(VALID_SUBSCRIPTION);
    })
    .then(keys => {
      (keys.contentEncryptionKey instanceof ArrayBuffer).should.equal(true);
      (keys.nonce instanceof ArrayBuffer).should.equal(true);

      new Uint8Array(keys.contentEncryptionKey).byteLength.should.equal(16);
      new Uint8Array(keys.nonce).byteLength.should.equal(12);
    });
  });

  it('should generate the specific encryption keys', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.generateEncryptionKeys(VALID_SUBSCRIPTION);
    })
    .then(keys => {
      (keys.contentEncryptionKey instanceof ArrayBuffer).should.equal(true);
      (keys.nonce instanceof ArrayBuffer).should.equal(true);

      new Uint8Array(keys.contentEncryptionKey).byteLength.should.equal(16);
      new Uint8Array(keys.nonce).byteLength.should.equal(12);

      const base64cek = window.uint8ArrayToBase64Url(new Uint8Array(keys.contentEncryptionKey));
      base64cek.should.equal(VALID_OUTPUT.contentEncryptionKey);

      const base64nonce = window.uint8ArrayToBase64Url(new Uint8Array(keys.nonce));
      base64nonce.should.equal(VALID_OUTPUT.nonce);
    });
  });

  it('should encrypt message', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper()
    .then(testEncryption => {
      return testEncryption.encryptMessage(VALID_SUBSCRIPTION, PAYLOAD);
    })
    .then(encryptedPayload => {
      (encryptedPayload instanceof Object).should.equal(true);
      (encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
      (typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
      (typeof encryptedPayload.salt === 'string').should.equal(true);
    });
  });

  it('should encrypt message to a specific value', () => {
    const factory = window.gauntface.EncryptionHelperFactory;
    return factory.generateHelper({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT
    })
    .then(testEncryption => {
      return testEncryption.encryptMessage(VALID_SUBSCRIPTION, PAYLOAD);
    })
    .then(encryptedPayload => {
      (encryptedPayload instanceof Object).should.equal(true);
      (encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
      (typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
      (typeof encryptedPayload.salt === 'string').should.equal(true);

      const base64EncryptedPayload = window.uint8ArrayToBase64Url(new Uint8Array(encryptedPayload.cipherText));
      base64EncryptedPayload.should.equal(VALID_OUTPUT.payload);
    });
  });
});
