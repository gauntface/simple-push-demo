var textEncoder = require('text-encoding').TextEncoder;
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/', express.static('./dist'));

/**
 *
 * Massive h/t to Martin Thompson for his web-push-client code
 * https://github.com/martinthomson/webpush-client/
 *
 */
app.post('/send_web_push', function(req, res) {
  var endpoint = req.body.endpoint;
  if (!endpoint) {
    // If there is no endpoint we can't send anything
    return res.status(404).json({success: false});
  }

  /** var keys = req.body.keys;
  var webClientPublicKey = keys.p256dh;
  var webClientAuth = keys.auth;

  var crypto = require('crypto');
  if (crypto.getCurves().indexOf('prime256v1') > -1) {
    // We need the P-256 Diffie Hellman Elliptic Curve to generate the server
    // certificates
    // secp256r1 === prime256v1
    console.log('Looks like we have the right curve');
  }

  // Create a public, private key pair on the client
  // This should be done per web client (i.e. per subscription)
  var ellipticCurve = crypto.createECDH('prime256v1');
  ellipticCurve.generateKeys();
  var serverPublicKey = ellipticCurve.getPublicKey('base64');
  var serverPrivateKey = ellipticCurve.getPrivateKey('base64');
  console.log('public key', serverPublicKey);
  console.log('private key', serverPrivateKey);

  var sharedSecret = ellipticCurve.computeSecret(webClientPublicKey, 'base64');
  console.log('shared secret', sharedSecret);

// TODO: Store client endpoint, client p256dh, client auth, server public key,
// and server shared key

  const salt = crypto.randomBytes(16);
  console.log('Salt: ', salt);

  //
  // The following code makes the pseudo random key
  var authInfo = UTF8.encode('Content-Encoding: auth\0');
  var byteLength = 32;

  var internalPseudoRandomKey = crypto.createHmac('SHA256', webClientAuth)
    .update(sharedSecret).digest('base64');
  var prkHmac = crypto.createHmac('SHA256', internalPseudoRandomKey);
  var UTF8 = textEncoder('utf-8');
  var info = new Uint8Array(authInfo.byteLength + 1);
  info.set(new Uint8Array(authInfo));
  info.set(new Uint8Array([1]), authInfo.byteLength);

  var hkdf = prkHmac.update(info).digest('base64');
  var pseudoRandomKey = hkdf.slice(0, byteLength);
  console.log('hkdfValue: ', pseudoRandomKey);



  internalPseudoRandomKey = crypto.createHmac('SHA256', salt)
    .update(pseudoRandomKey).digest('base64');
  var nonceHmac = crypto.createHmac('SHA256', internalPseudoRandomKey);

  var context = new Uint8Array(5 + 1 + 2 + 65 + 2 + 65);
  context.set([0x50, 0x2D, 0x32, 0x35, 0x36], 0);

  context.set([0x00, self.recipientPublicKey_.byteLength], 6);
  context.set(new Uint8Array(self.recipientPublicKey_), 8);

  context.set([0x00, senderPublic.byteLength], 73);
  context.set(new Uint8Array(senderPublic), 75)
  var cekInfo = new Uint8Array(27 + 1 + context.byteLength);
  info = new Uint8Array(authInfo.byteLength + 1);
  info.set(new Uint8Array(authInfo));
  info.set(new Uint8Array([1]), authInfo.byteLength);

  hkdf = nonceHmac.update(info).digest('base64');
  var pseudoRandomKey = hkdf.slice(0, byteLength);**/


  res.json({success: true});
});

var server = app.listen(3000, () => {
  var port = server.address().port;
  console.log('Server is listening at http://localhost:%s', port);
});

// Maybe prime256v1
// Maybe secp256k1
// var serverKeys = crypto.diffieHellman.generateKeys('binary');
// console.log(crypto.getCurves());
