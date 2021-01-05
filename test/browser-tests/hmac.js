/* eslint-env browser */

describe('HMAC', async () => {
  it('should have a working HMAC implementation', async () => {
    const HMAC = window.gauntface.HMAC;
    const hmac = new HMAC(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'));
    const prk = await hmac.sign(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'));

    (prk instanceof ArrayBuffer).should.equal(true);
    const base64Prk = window.uint8ArrayToBase64Url(new Uint8Array(prk));
    base64Prk.should.equal('hTx0A5N9i2I5VpsYTreZP8X3Ua786ijyyGOFji0pxQs');
  });
});
