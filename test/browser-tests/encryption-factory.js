/* eslint-env browser */

import {EncryptionFactory} from '/frontend/scripts/encryption/encryption-factory.js';
import {EncryptionAESGCM} from '/frontend/scripts/encryption/encryption-aes-gcm.js';
import {EncryptionAES128GCM} from '/frontend/scripts/encryption/encryption-aes-128-gcm.js';

describe('EncryptionFactory', function() {
	let initialContentEncoding;

	before(function() {
		initialContentEncoding = window.PushManager.supportedContentEncodings;
	});

	after(function() {
		window.PushManager.supportedContentEncodings = initialContentEncoding;
	});

	// Test no content encoding
	it('should default to aes128gcm if no content encoding', function() {
		delete window.PushManager.supportedContentEncodings;
		const helper = EncryptionFactory.generateHelper();
		(helper instanceof EncryptionAES128GCM).should.equal(true);
	});

	// Test with content encoding of just aesgcm
	it('should use aesgcm if first encoding', function() {
		window.PushManager.supportedContentEncodings = ['aesgcm', 'aes128gcm'];
		const helper = EncryptionFactory.generateHelper();
		(helper instanceof EncryptionAESGCM).should.equal(true);
	});

	// Test with content encoding with aes128gcm
	it('should use aes128gcm if first encoding', function() {
		window.PushManager.supportedContentEncodings = ['aes128gcm', 'aesgcm'];

		const helper = EncryptionFactory.generateHelper();
		(helper instanceof EncryptionAES128GCM).should.equal(true);
	});

	// Test with unknown encoding
	it('should throw for unknown encodings', function() {
		window.PushManager.supportedContentEncodings = ['unknown', 'other'];
		window.chai.expect(() => {
			EncryptionFactory.generateHelper();
		}).to.throw('Unable to find a known encoding');
	});
});
