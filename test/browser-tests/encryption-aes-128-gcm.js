/* eslint-env browser,mocha */

'use strict';

describe('Test EncryptionHelperAES128GCM', function() {
  const PAYLOAD = 'Hello, world!';
  const VALID_SERVER_KEYS = {
    publicKey: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    privateKey: 'Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4',
  };
  const VALID_SALT = 'AAAAAAAAAAAAAAAAAAAAAA';

  const VALID_SUBSCRIPTION = {
    endpoint: 'https://android.googleapis.com/gcm/send/FAKE_GCM_REGISTRATION_ID',
    getKey: (keyId) => {
      switch(keyId) {
        case 'p256dh':
          return window.base64UrlToUint8Array('BCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQA=');
        case 'auth':
          return window.base64UrlToUint8Array('8eDyX_uCN0XRhSbY5hs7Hg==');
        default:
          throw new Error('Oh dear. An unknown subscription key was requested: ', keyId);
      }
    },
  };

  const VALID_OUTPUT = {
    sharedSecret: 'GOr9wG2bF4vCrnE_sOnwM7k-ZguFYyPMbtd5ESmT0gs',
    context: 'UC0yNTYAAEEEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAABBBG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    cekInfo: 'Q29udGVudC1FbmNvZGluZzogYWVzMTI4Z2NtAA',
    nonceInfo: 'Q29udGVudC1FbmNvZGluZzogbm9uY2UA',
    keyInfo: 'V2ViUHVzaDogaW5mbwAEIhaCyfJcO_VWSGovY_thEG9164OeXAA9PaC42F0ihbcg_saYeHVIwo8vFF_vHy8nLpkUreiXaiGCf_7TI_tBAARtzhh65d2CeTx6ZdBkqrQAJVD58dS78ELxTCHOvL4SVOpyJEczxKrQnbkM_MEI9K-9TVT86-2UZNn_n4bEOaSv',
    prk: 'YXQOi9WVYZRvGk9pdoq-u_zr15HGsuzU7sPVSTb70Xk',
    contentEncryptionKey: 'qIuzYacKKN1q4hIxqOCJrw',
    nonce: 'QvcILucv_Mh5t9ff',
    payload: 'AAAAAAAAAAAAAAAAAAAAAAAAEABBBG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK96Kh5TnTaUZZypdS4uO2SzLwNL6N-KfyTk59Qu3hw',
  };


  const VALID_VAPID_KEYS = {
    publicKey: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
    privateKey: 'Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4',
  };

  it('should be able to get the encryption helper', function() {
    (typeof window.gauntface.EncryptionHelperAES128GCM).should.not.equal('undefined');
  });

  it('should be able to generate server keys', function() {
    return window.gauntface.EncryptionHelperAES128GCM.generateServerKeys()
    .then((keys) => {
      keys.should.not.equal('undefined');
      keys.should.have.property('publicKey');
      keys.should.have.property('privateKey');
    });
  });

  it('should create new certificates if nothing is passed in', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();
    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      (serverKeys.publicKey instanceof CryptoKey).should.equal(true);
      (serverKeys.privateKey instanceof CryptoKey).should.equal(true);
      return window.cryptoKeysToUint8Array(
        serverKeys.publicKey,
        serverKeys.privateKey
      );
    })
    .then((keys) => {
      (keys.publicKey instanceof Uint8Array).should.equal(true);
      (keys.privateKey instanceof Uint8Array).should.equal(true);

      (keys.publicKey.length).should.equal(65);
      (keys.privateKey.length).should.equal(32);
    });
  });

  it('should accept valid input certificates', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
    });
    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      (serverKeys.publicKey instanceof CryptoKey).should.equal(true);
      (serverKeys.privateKey instanceof CryptoKey).should.equal(true);
      return window.cryptoKeysToUint8Array(
        serverKeys.publicKey,
        serverKeys.privateKey
      );
    })
    .then((keys) => {
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
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
    });
    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._getSharedSecret(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((sharedSecret) => {
      (sharedSecret instanceof ArrayBuffer).should.equal(true);
      const base64Secret = window.uint8ArrayToBase64Url(new Uint8Array(sharedSecret));
      base64Secret.should.equal(VALID_OUTPUT.sharedSecret);
    });
  });

  it('should generate a random salt', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();
    (encryptionHelper.getSalt() instanceof Uint8Array).should.equal(true);
  });

  it('should use defined salt', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      salt: VALID_SALT,
    });
    (encryptionHelper.getSalt() instanceof Uint8Array).should.equal(true);
    const base64Salt = window.uint8ArrayToBase64Url(encryptionHelper.getSalt());
    base64Salt.should.equal(VALID_SALT);
  });

  // See: https://martinthomson.github.io/http-encrypt
  /** it('should generate a context', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();
    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateContext(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((context) => {
      (context instanceof Uint8Array).should.equal(true);
      context.byteLength.should.equal(5 + 1 + 2 + 65 + 2 + 65);
    });
  });

  it('should generate a context with the expected output', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateContext(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((context) => {
      (context instanceof Uint8Array).should.equal(true);
      context.byteLength.should.equal(5 + 1 + 2 + 65 + 2 + 65);
      const base64Context = window.uint8ArrayToBase64Url(context);
      base64Context.should.equal(VALID_OUTPUT.context);
    });
  });**/

  it('should generate a cekInfo for aesgcm', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateCEKInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((cekInfo) => {
      (cekInfo instanceof Uint8Array).should.equal(true);
      cekInfo.byteLength.should.equal(28);
    });
  });

  it('should generate the specific cekInfo', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateCEKInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((cekInfo) => {
      (cekInfo instanceof Uint8Array).should.equal(true);
      cekInfo.byteLength.should.equal(28);

      // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
      const base64CekInfo = window.uint8ArrayToBase64Url(cekInfo);
      base64CekInfo.should.equal(VALID_OUTPUT.cekInfo);
    });
  });

  it('should generate a nonceInfo with a context', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateNonceInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((nonceInfo) => {
      (nonceInfo instanceof Uint8Array).should.equal(true);
      nonceInfo.byteLength.should.equal(24);
    });
  });

  it('should generate the specific nonceInfo', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateNonceInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((nonceInfo) => {
      (nonceInfo instanceof Uint8Array).should.equal(true);
      nonceInfo.byteLength.should.equal(24);

      // See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
      const base64NonceInfo = window.uint8ArrayToBase64Url(nonceInfo);
      base64NonceInfo.should.equal(VALID_OUTPUT.nonceInfo);
    });
  });

  it('should generate key info', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._getKeyInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((keyInfo) => {
      (keyInfo instanceof Uint8Array).should.equal(true);
      keyInfo.byteLength.should.equal(144);
    });
  });

  it('should generate specific key info', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._getKeyInfo(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((keyInfo) => {
      (keyInfo instanceof Uint8Array).should.equal(true);
      keyInfo.byteLength.should.equal(144);

      window.uint8ArrayToBase64Url(keyInfo).should.equal(VALID_OUTPUT.keyInfo);
    });
  });

  it('should generate a pseudo random key', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generatePRK(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((prk) => {
      (prk instanceof ArrayBuffer).should.equal(true);
    });
  });

  it('should generate the specific pseudo random key', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generatePRK(VALID_SUBSCRIPTION, serverKeys);
    })
    .then((prk) => {
      (prk instanceof ArrayBuffer).should.equal(true);

      const base64prk = window.uint8ArrayToBase64Url(new Uint8Array(prk));
      base64prk.should.equal(VALID_OUTPUT.prk);
    });
  });

  it('should generate encryption keys', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateEncryptionKeys(VALID_SUBSCRIPTION, encryptionHelper.getSalt(), serverKeys);
    })
    .then((keys) => {
      (keys.contentEncryptionKey instanceof ArrayBuffer).should.equal(true);
      (keys.nonce instanceof ArrayBuffer).should.equal(true);

      new Uint8Array(keys.contentEncryptionKey).byteLength.should.equal(16);
      new Uint8Array(keys.nonce).byteLength.should.equal(12);
    });
  });

  it('should generate the specific encryption keys', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.getServerKeys()
    .then((serverKeys) => {
      return encryptionHelper._generateEncryptionKeys(VALID_SUBSCRIPTION, encryptionHelper.getSalt(), serverKeys);
    })
    .then((keys) => {
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
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();
    return encryptionHelper.encryptPayload(VALID_SUBSCRIPTION, PAYLOAD)
    .then((encryptedPayload) => {
      (encryptedPayload instanceof Object).should.equal(true);
      (encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
      (typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
      (typeof encryptedPayload.salt === 'string').should.equal(true);
    });
  });

  it('should encrypt message to a specific value', () => {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      serverKeys: VALID_SERVER_KEYS,
      salt: VALID_SALT,
    });

    return encryptionHelper.encryptPayload(VALID_SUBSCRIPTION, PAYLOAD)
    .then((encryptedPayload) => {
      (encryptedPayload instanceof Object).should.equal(true);
      (encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
      (typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
      (typeof encryptedPayload.salt === 'string').should.equal(true);

      const base64EncryptedPayload = window.uint8ArrayToBase64Url(new Uint8Array(encryptedPayload.cipherText));
      base64EncryptedPayload.should.equal(VALID_OUTPUT.payload);
    });
  });

  it('should use default vapid certs', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM();
    const vapidKeys = encryptionHelper.getVapidKeys();
    vapidKeys.publicKey.should.equal(window.gauntface.CONSTANTS.APPLICATION_KEYS.publicKey);
    vapidKeys.privateKey.should.equal(window.gauntface.CONSTANTS.APPLICATION_KEYS.privateKey);
  });

  it('should accept valid input VAPID certificates', function() {
    const encryptionHelper = new window.gauntface.EncryptionHelperAES128GCM({
      vapidKeys: VALID_VAPID_KEYS,
    });
    const vapidKeys = encryptionHelper.getVapidKeys();
    vapidKeys.publicKey.should.equal(VALID_VAPID_KEYS.publicKey);
    vapidKeys.privateKey.should.equal(VALID_VAPID_KEYS.privateKey);
  });
});
