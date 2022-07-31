/* eslint-env browser,mocha */

'use strict';

import {uint8ArrayToBase64Url, cryptoKeysToUint8Array} from '/frontend/scripts/encryption/helpers.js';
import {VapidHelper2} from '/frontend/scripts/encryption/vapid-helper-2.js';

describe('VAPID 2', function() {
	const VALID_VAPID_KEYS = {
		publicKey: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
		privateKey: 'Dt1CLgQlkiaA-tmCkATyKZeoF1-Gtw1-gdEP6pOCqj4',
	};
	const VALID_AUDIENCE = 'https://fcm.googleapis.com';
	const VALID_SUBJECT = 'mailto:simple-push-demo@gauntface.co.uk';
	const VALID_EXPIRATION = 1464326106;
	const VALID_OUTPUT = {
		expiration: VALID_EXPIRATION,
		unsignedToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJhdWQiOiJodHRwczovL2ZjbS5nb29nbGVhcGlzLmNvbSIsImV4cCI6MTQ2NDMyNjEwNiwic3ViIjoibWFpbHRvOnNpbXBsZS1wdXNoLWRlbW9AZ2F1bnRmYWNlLmNvLnVrIn0',
		p256ecdsa: 'BG3OGHrl3YJ5PHpl0GSqtAAlUPnx1LvwQvFMIc68vhJU6nIkRzPEqtCduQz8wQj0r71NVPzr7ZRk2f-fhsQ5pK8',
	};

	const generateVapidKeys = async () => {
		const keys = await crypto.subtle.generateKey(
			{name: 'ECDH', namedCurve: 'P-256'},
			true, ['deriveBits'],
		);

		return cryptoKeysToUint8Array(keys.publicKey, keys.privateKey);
	};

	it('should be able to generate vapid keys', async () => {
		const keys = await generateVapidKeys();
		keys.should.not.equal('undefined');
		keys.should.have.property('publicKey');
		keys.should.have.property('privateKey');
	});

	it('should be able to generate VAPID authentication headers', async () => {
		const keys = await generateVapidKeys();
		const authHeaders = await VapidHelper2.createVapidAuthHeader(
			{
				publicKey: uint8ArrayToBase64Url(keys.publicKey),
				privateKey: uint8ArrayToBase64Url(keys.privateKey),
			},
			'http://localhost',
			'mailto:simple-push-demo@gauntface.co.uk');

		(authHeaders instanceof Object).should.equal(true);
		(typeof authHeaders['Authorization'] === 'string').should.equal(true);
		(typeof authHeaders['Crypto-Key'] === 'undefined').should.equal(true);

		const regex = /vapid t=(.*), k=(.*)/g;
		const matches = regex.exec(authHeaders['Authorization']);
		matches.length.should.equal(3);

		const jwt = matches[1];
		const publicKey = matches[2];

		(jwt.length).should.equal(246);
		(publicKey.length).should.equal(87);
	});

	it('should generate specific VAPID authentication headers', async () => {
		const authHeaders = await VapidHelper2.createVapidAuthHeader(
			VALID_VAPID_KEYS,
			VALID_AUDIENCE,
			VALID_SUBJECT,
			VALID_EXPIRATION,
		);
		(authHeaders instanceof Object).should.equal(true);
		(typeof authHeaders['Authorization'] === 'string').should.equal(true);
		(typeof authHeaders['Crypto-Key'] === 'undefined').should.equal(true);

		const regex = /vapid t=(.*), k=(.*)/g;
		const matches = regex.exec(authHeaders['Authorization']);
		matches.length.should.equal(3);

		const jwt = matches[1];
		const publicKey = matches[2];

		publicKey.should.equal(VALID_OUTPUT.p256ecdsa);
		jwt.indexOf(VALID_OUTPUT.unsignedToken).should.equal(0);
	});
});
