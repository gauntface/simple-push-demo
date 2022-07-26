export class HMAC {
  private ikm;

  constructor(ikm) {
    this.ikm = ikm;
  }

  async sign(input) {
    const key = await crypto.subtle.importKey('raw', this.ikm,
        {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
    return crypto.subtle.sign('HMAC', key, input);
  }
}