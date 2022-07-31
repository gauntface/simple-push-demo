/* eslint-env browser */

import {uint8ArrayToBase64Url, base64UrlToUint8Array} from '/frontend/scripts/encryption/helpers.js';
import {HKDF} from '/frontend/scripts/encryption/hkdf.js';

describe('HKDF', function() {
	it('should have a working HKDF implementation', async () => {
		const hkdf = new HKDF(
			base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'),
			base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'),
		);
		const hkdfOutput = await hkdf.generate(base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'), 16);

		(hkdfOutput instanceof ArrayBuffer).should.equal(true);
		const base64HKDFOutput = uint8ArrayToBase64Url(new Uint8Array(hkdfOutput));
		base64HKDFOutput.should.equal('cS9spnQtVwB3AuvBt3wglw');
	});
});
