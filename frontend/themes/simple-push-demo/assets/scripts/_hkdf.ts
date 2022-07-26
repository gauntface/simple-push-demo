import {HMAC} from './_hmac';

export class HKDF {
  private ikm;
  private salt;
  private hmac;
  constructor(ikm, salt) {
    this.ikm = ikm;
    this.salt = salt;

    this.hmac = new HMAC(salt);
  }

  async generate(info, byteLength) {
    const fullInfoBuffer = new Uint8Array(info.byteLength + 1);
    fullInfoBuffer.set(info, 0);
    fullInfoBuffer.set(new Uint8Array(1).fill(1), info.byteLength);

    const prk = await this.hmac.sign(this.ikm);
    const nextHmac = new HMAC(prk);
    const nextPrk = await nextHmac.sign(fullInfoBuffer);
    return nextPrk.slice(0, byteLength);
  }
}