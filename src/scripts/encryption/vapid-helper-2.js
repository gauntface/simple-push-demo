/**
 * PLEASE NOTE: This is in no way complete. This is just enabling
 * some testing in the browser / on github pages.
 *
 * Massive H/T to Peter Beverloo for this.
 */

/* eslint-env browser */

class VapidHelper2 {
  static createVapidAuthHeader(vapidKeys, audience, subject, exp) {
    if (!audience) {
      return Promise.reject(new Error('Audience must be the origin of the ' +
        'server'));
    }

    if (!subject) {
      return Promise.reject(new Error('Subject must be either a mailto or ' +
        'http link'));
    }

    if (typeof exp !== 'number') {
      // The `exp` field will contain the current timestamp in UTC plus
      // twelve hours.
      exp = Math.floor((Date.now() / 1000) + 12 * 60 * 60);
    }

    const publicApplicationServerKey = window.base64UrlToUint8Array(
      vapidKeys.publicKey);
    const privateApplicationServerKey = window.base64UrlToUint8Array(
      vapidKeys.privateKey);

    // Ensure the audience is just the origin
    audience = new URL(audience).origin;

    const tokenHeader = {
      typ: 'JWT',
      alg: 'ES256',
    };

    const tokenBody = {
      aud: audience,
      exp: exp,
      sub: subject,
    };

    // Utility function for UTF-8 encoding a string to an ArrayBuffer.
    const utf8Encoder = new TextEncoder('utf-8');

    // The unsigned token is the concatenation of the URL-safe base64 encoded
    // header and body.
    const unsignedToken =
      window.uint8ArrayToBase64Url(
        utf8Encoder.encode(JSON.stringify(tokenHeader))
      ) + '.' + window.uint8ArrayToBase64Url(
        utf8Encoder.encode(JSON.stringify(tokenBody))
      );

    // Sign the |unsignedToken| using ES256 (SHA-256 over ECDSA).
    const key = {
      kty: 'EC',
      crv: 'P-256',
      x: window.uint8ArrayToBase64Url(
        publicApplicationServerKey.subarray(1, 33)),
      y: window.uint8ArrayToBase64Url(
        publicApplicationServerKey.subarray(33, 65)),
      d: window.uint8ArrayToBase64Url(privateApplicationServerKey),
    };

    // Sign the |unsignedToken| with the server's private key to generate
    // the signature.
    return crypto.subtle.importKey('jwk', key, {
      name: 'ECDSA', namedCurve: 'P-256',
    }, true, ['sign'])
    .then((key) => {
      return crypto.subtle.sign({
        name: 'ECDSA',
        hash: {
          name: 'SHA-256',
        },
      }, key, utf8Encoder.encode(unsignedToken));
    })
    .then((signature) => {
      const jsonWebToken = unsignedToken + '.' +
        window.uint8ArrayToBase64Url(new Uint8Array(signature));
      const p256ecdsa = window.uint8ArrayToBase64Url(
        publicApplicationServerKey);

      return {
        Authorization: `vapid t=${jsonWebToken}, k=${p256ecdsa}`,
      };
    });
  }
}

if (typeof window !== 'undefined') {
  window.gauntface = window.gauntface || {};
  window.gauntface.VapidHelper2 = VapidHelper2;
}
