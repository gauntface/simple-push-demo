/* eslint-env browser */

import {uint8ArrayToBase64Url, base64UrlToUint8Array, joinUint8Arrays, arrayBuffersToCryptoKeys, cryptoKeysToUint8Array, generateSalt} from '/scripts/encryption/helpers.js';

describe('HMAC', async () => {
  it('should have a working HMAC implementation', async () => {
    const hmac = new HMAC(base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'));
    const prk = await hmac.sign(base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'));

    (prk instanceof ArrayBuffer).should.equal(true);
    const base64Prk = uint8ArrayToBase64Url(new Uint8Array(prk));
    base64Prk.should.equal('hTx0A5N9i2I5VpsYTreZP8X3Ua786ijyyGOFji0pxQs');
  });
});
