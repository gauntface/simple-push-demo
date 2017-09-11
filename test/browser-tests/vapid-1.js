/* eslint-env browser,mocha */

'use strict';

describe('Test VAPID 1', function() {
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

  const generateVapidKeys = () => {
    return crypto.subtle.generateKey({name: 'ECDH', namedCurve: 'P-256'},
      true, ['deriveBits'])
      .then((keys) => {
        return window.cryptoKeysToUint8Array(
          keys.publicKey, keys.privateKey);
      });
  };

  it('should be able to generate vapid keys', function() {
    return generateVapidKeys()
    .then((keys) => {
      keys.should.not.equal('undefined');
      keys.should.have.property('publicKey');
      keys.should.have.property('privateKey');
    });
  });

  it('should be able to generate VAPID authentication headers', () => {
    return generateVapidKeys()
    .then((keys) => {
      return window.gauntface.VapidHelper1.createVapidAuthHeader(
        {
          publicKey: window.uint8ArrayToBase64Url(keys.publicKey),
          privateKey: window.uint8ArrayToBase64Url(keys.privateKey),
        },
        'http://localhost',
        'mailto:simple-push-demo@gauntface.co.uk');
    })
    .then((authHeaders) => {
      (authHeaders instanceof Object).should.equal(true);
      (typeof authHeaders['Authorization'] === 'string').should.equal(true);
      (typeof authHeaders['Crypto-Key'] === 'string').should.equal(true);

      (authHeaders['Authorization'].length).should.equal(254);
      (authHeaders['Crypto-Key'].length).should.equal(97);
    });
  });

  it('should generate specific VAPID authentication headers', () => {
    return window.gauntface.VapidHelper1.createVapidAuthHeader(
      VALID_VAPID_KEYS,
      VALID_AUDIENCE,
      VALID_SUBJECT,
      VALID_EXPIRATION
    )
    .then((authHeaders) => {
      (authHeaders instanceof Object).should.equal(true);
      (typeof authHeaders['Authorization'] === 'string').should.equal(true);
      (typeof authHeaders['Crypto-Key'] === 'string').should.equal(true);

      authHeaders['Authorization'].indexOf(`WebPush ${VALID_OUTPUT.unsignedToken}`).should.equal(0);
      authHeaders['Crypto-Key'].should.equal(`p256ecdsa=${VALID_OUTPUT.p256ecdsa}`);
    });
  });
});
