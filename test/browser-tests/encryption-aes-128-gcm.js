/* eslint-env browser,mocha */

'use strict';

import {uint8ArrayToBase64Url, base64UrlToUint8Array, cryptoKeysToUint8Array} from '/frontend/scripts/encryption/helpers.js';
import {EncryptionAES128GCM} from '/frontend/scripts/encryption/encryption-aes-128-gcm.js';
import {APPLICATION_KEYS} from '/frontend/scripts/constants.js';

describe('EncryptionAES128GCM', () => {
	const PAYLOAD = 'Hello, world!';
	const VALID_SERVER_KEYS = {
		publicKey: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
		privateKey: 'Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4',
	};
	const VALID_SALT = 'AAAAAAAAAAAAAAAAAAAAAA';

	const VALID_SUBSCRIPTION = {
		endpoint: 'https://android.googleapis.com/gcm/send/FAKE_GCM_REGISTRATION_ID',
		getKey: (keyId) => {
			switch (keyId) {
			case 'p256dh':
				return base64UrlToUint8Array('BCIWgsnyXDv1VkhqL2P7YRBvdeuDnlwAPT2guNhdIoW3IP7GmHh1SMKPLxRf7x8vJy6ZFK3ol2ohgn_-0yP7QQA=');
			case 'auth':
				return base64UrlToUint8Array('8eDyX_uCN0XRhSbY5hs7Hg==');
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

	it('should be able to generate server keys', async () => {
		const keys = await EncryptionAES128GCM.generateServerKeys();
		keys.should.not.equal('undefined');
		keys.should.have.property('publicKey');
		keys.should.have.property('privateKey');
	});

	it('should create new certificates if nothing is passed in', async () => {
		const encryptionHelper = new EncryptionAES128GCM();
		const serverKeys = await encryptionHelper.getServerKeys();

		(serverKeys.publicKey instanceof CryptoKey).should.equal(true);
		(serverKeys.privateKey instanceof CryptoKey).should.equal(true);
		const keys = await cryptoKeysToUint8Array(
			serverKeys.publicKey,
			serverKeys.privateKey,
		);

		(keys.publicKey instanceof Uint8Array).should.equal(true);
		(keys.privateKey instanceof Uint8Array).should.equal(true);

		(keys.publicKey.length).should.equal(65);
		(keys.privateKey.length).should.equal(32);
	});

	it('should accept valid input certificates', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
		});
		const serverKeys = await encryptionHelper.getServerKeys();
		(serverKeys.publicKey instanceof CryptoKey).should.equal(true);
		(serverKeys.privateKey instanceof CryptoKey).should.equal(true);
		const keys = await cryptoKeysToUint8Array(
			serverKeys.publicKey,
			serverKeys.privateKey,
		);

		(keys.publicKey instanceof Uint8Array).should.equal(true);
		(keys.privateKey instanceof Uint8Array).should.equal(true);

		(keys.publicKey.length).should.equal(65);
		(keys.privateKey.length).should.equal(32);

		const publicKey = uint8ArrayToBase64Url(keys.publicKey);
		const privateKey = uint8ArrayToBase64Url(keys.privateKey);
		publicKey.should.equal(VALID_SERVER_KEYS.publicKey);
		privateKey.should.equal(VALID_SERVER_KEYS.privateKey);
	});

	it('should calculate a shared secret', async () => {
		/**
     * Referred to as IKM on https://tests.peter.sh/push-encryption-verifier/
     */
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
		});
		const serverKeys = await encryptionHelper.getServerKeys();
		const sharedSecret = await encryptionHelper._getSharedSecret(VALID_SUBSCRIPTION, serverKeys);

		(sharedSecret instanceof ArrayBuffer).should.equal(true);
		const base64Secret = uint8ArrayToBase64Url(new Uint8Array(sharedSecret));
		base64Secret.should.equal(VALID_OUTPUT.sharedSecret);
	});

	it('should generate a random salt', async () => {
		const encryptionHelper = new EncryptionAES128GCM();
		(encryptionHelper.getSalt() instanceof Uint8Array).should.equal(true);
	});

	it('should use defined salt', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			salt: VALID_SALT,
		});
		(encryptionHelper.getSalt() instanceof Uint8Array).should.equal(true);
		const base64Salt = uint8ArrayToBase64Url(encryptionHelper.getSalt());
		base64Salt.should.equal(VALID_SALT);
	});

	it('should generate a cekInfo for aesgcm', async () => {
		const encryptionHelper = new EncryptionAES128GCM();

		const serverKeys = await encryptionHelper.getServerKeys();
		const cekInfo = await encryptionHelper._generateCEKInfo(VALID_SUBSCRIPTION, serverKeys);
		(cekInfo instanceof Uint8Array).should.equal(true);
		cekInfo.byteLength.should.equal(28);
	});

	it('should generate the specific cekInfo', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
			salt: VALID_SALT,
		});

		const serverKeys = await encryptionHelper.getServerKeys();
		const cekInfo = await encryptionHelper._generateCEKInfo(VALID_SUBSCRIPTION, serverKeys);

		(cekInfo instanceof Uint8Array).should.equal(true);
		cekInfo.byteLength.should.equal(28);

		// See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
		const base64CekInfo = uint8ArrayToBase64Url(cekInfo);
		base64CekInfo.should.equal(VALID_OUTPUT.cekInfo);
	});

	it('should generate a nonceInfo with a context', async () => {
		const encryptionHelper = new EncryptionAES128GCM();

		const serverKeys = await encryptionHelper.getServerKeys();
		const nonceInfo = await encryptionHelper._generateNonceInfo(VALID_SUBSCRIPTION, serverKeys);

		(nonceInfo instanceof Uint8Array).should.equal(true);
		nonceInfo.byteLength.should.equal(24);
	});

	it('should generate the specific nonceInfo', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
			salt: VALID_SALT,
		});

		const serverKeys = await encryptionHelper.getServerKeys();
		const nonceInfo = await encryptionHelper._generateNonceInfo(VALID_SUBSCRIPTION, serverKeys);
		(nonceInfo instanceof Uint8Array).should.equal(true);
		nonceInfo.byteLength.should.equal(24);

		// See: https://martinthomson.github.io/http-encryption/#rfc.section.4.2
		const base64NonceInfo = uint8ArrayToBase64Url(nonceInfo);
		base64NonceInfo.should.equal(VALID_OUTPUT.nonceInfo);
	});

	it('should generate key info', async () => {
		const encryptionHelper = new EncryptionAES128GCM();

		const serverKeys = await encryptionHelper.getServerKeys();
		const keyInfo = await encryptionHelper._getKeyInfo(VALID_SUBSCRIPTION, serverKeys);
		(keyInfo instanceof Uint8Array).should.equal(true);
		keyInfo.byteLength.should.equal(144);
	});

	it('should generate specific key info', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
		});

		const serverKeys = await encryptionHelper.getServerKeys();
		const keyInfo = await encryptionHelper._getKeyInfo(VALID_SUBSCRIPTION, serverKeys);
		(keyInfo instanceof Uint8Array).should.equal(true);
		keyInfo.byteLength.should.equal(144);

		uint8ArrayToBase64Url(keyInfo).should.equal(VALID_OUTPUT.keyInfo);
	});

	it('should generate a pseudo random key', async () => {
		const encryptionHelper = new EncryptionAES128GCM();

		const serverKeys = await encryptionHelper.getServerKeys();
		const prk = await encryptionHelper._generatePRK(VALID_SUBSCRIPTION, serverKeys);
		(prk instanceof ArrayBuffer).should.equal(true);
	});

	it('should generate the specific pseudo random key', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
			salt: VALID_SALT,
		});

		const serverKeys = await encryptionHelper.getServerKeys();
		const prk = await encryptionHelper._generatePRK(VALID_SUBSCRIPTION, serverKeys);

		(prk instanceof ArrayBuffer).should.equal(true);

		const base64prk = uint8ArrayToBase64Url(new Uint8Array(prk));
		base64prk.should.equal(VALID_OUTPUT.prk);
	});

	it('should generate encryption keys', async () => {
		const encryptionHelper = new EncryptionAES128GCM();

		const serverKeys = await encryptionHelper.getServerKeys();
		const keys = await encryptionHelper._generateEncryptionKeys(VALID_SUBSCRIPTION, encryptionHelper.getSalt(), serverKeys);

		(keys.contentEncryptionKey instanceof ArrayBuffer).should.equal(true);
		(keys.nonce instanceof ArrayBuffer).should.equal(true);

		new Uint8Array(keys.contentEncryptionKey).byteLength.should.equal(16);
		new Uint8Array(keys.nonce).byteLength.should.equal(12);
	});

	it('should generate the specific encryption keys', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
			salt: VALID_SALT,
		});

		const serverKeys = await encryptionHelper.getServerKeys();
		const keys = await encryptionHelper._generateEncryptionKeys(VALID_SUBSCRIPTION, encryptionHelper.getSalt(), serverKeys);
		(keys.contentEncryptionKey instanceof ArrayBuffer).should.equal(true);
		(keys.nonce instanceof ArrayBuffer).should.equal(true);

		new Uint8Array(keys.contentEncryptionKey).byteLength.should.equal(16);
		new Uint8Array(keys.nonce).byteLength.should.equal(12);

		const base64cek = uint8ArrayToBase64Url(new Uint8Array(keys.contentEncryptionKey));
		base64cek.should.equal(VALID_OUTPUT.contentEncryptionKey);

		const base64nonce = uint8ArrayToBase64Url(new Uint8Array(keys.nonce));
		base64nonce.should.equal(VALID_OUTPUT.nonce);
	});

	it('should encrypt message', async () => {
		const encryptionHelper = new EncryptionAES128GCM();
		const encryptedPayload = await encryptionHelper.encryptPayload(VALID_SUBSCRIPTION, PAYLOAD);
		(encryptedPayload instanceof Object).should.equal(true);
		(encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
		(typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
		(typeof encryptedPayload.salt === 'string').should.equal(true);
	});

	it('should encrypt message to a specific value', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			serverKeys: VALID_SERVER_KEYS,
			salt: VALID_SALT,
		});

		const encryptedPayload = await encryptionHelper.encryptPayload(VALID_SUBSCRIPTION, PAYLOAD);
		(encryptedPayload instanceof Object).should.equal(true);
		(encryptedPayload.cipherText instanceof ArrayBuffer).should.equal(true);
		(typeof encryptedPayload.publicServerKey === 'string').should.equal(true);
		(typeof encryptedPayload.salt === 'string').should.equal(true);

		const base64EncryptedPayload = uint8ArrayToBase64Url(new Uint8Array(encryptedPayload.cipherText));
		base64EncryptedPayload.should.equal(VALID_OUTPUT.payload);
	});

	it('should use default vapid certs', async () => {
		const encryptionHelper = new EncryptionAES128GCM();
		const vapidKeys = encryptionHelper.getVapidKeys();
		vapidKeys.publicKey.should.equal(APPLICATION_KEYS.publicKey);
		vapidKeys.privateKey.should.equal(APPLICATION_KEYS.privateKey);
	});

	it('should accept valid input VAPID certificates', async () => {
		const encryptionHelper = new EncryptionAES128GCM({
			vapidKeys: VALID_VAPID_KEYS,
		});
		const vapidKeys = encryptionHelper.getVapidKeys();
		vapidKeys.publicKey.should.equal(VALID_VAPID_KEYS.publicKey);
		vapidKeys.privateKey.should.equal(VALID_VAPID_KEYS.privateKey);
	});
});
