/* eslint-env browser */

describe('HKDF', function() {
  it('should have a working HKDF implementation', async () => {
    const HKDF = window.gauntface.HKDF;
    const hkdf = new HKDF(
        window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'),
        window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'),
    );
    const hkdfOutput = await hkdf.generate(window.base64UrlToUint8Array('AAAAAAAAAAAAAAAAAAAAAA'), 16);

    (hkdfOutput instanceof ArrayBuffer).should.equal(true);
    const base64HKDFOutput = window.uint8ArrayToBase64Url(new Uint8Array(hkdfOutput));
    base64HKDFOutput.should.equal('cS9spnQtVwB3AuvBt3wglw');
  });
});
