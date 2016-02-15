'use strict';

/* eslint-disable dot-notation */

var request = require('request-promise');
var express = require('express');
var bodyParser = require('body-parser');
var EncryptionHelper = require('./encryption-helper');
var urlBase64 = require('urlsafe-base64');

const GCM_USE_WEB_PUSH = true;
const GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';
const GCM_WEB_PUSH_ENDPOINT = 'https://jmt17.google.com/gcm/demo-webpush-00';
const GCM_AUTHORIZATION = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

var app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use('/', express.static('./dist'));

function handleGCMAPI(endpoint, encryptionHelper, encryptedDataBuffer) {
  var options = {
    uri: endpoint,
    method: 'POST',
    headers: {}
  };

  if (encryptionHelper !== null && encryptedDataBuffer !== null) {
    // Add required headers
    options.headers['Crypto-Key'] = 'dh=' +
      urlBase64.encode(encryptionHelper.getServerKeys().public);
    options.headers['Encryption'] = 'salt=' +
        urlBase64.encode(encryptionHelper.getSalt());
  }

  // Proprietary GCM
  var endpointParts = endpoint.split('/');
  var gcmRegistrationId = endpointParts[endpointParts.length - 1];

  if (GCM_USE_WEB_PUSH) {
    var webPushEndpoint = GCM_WEB_PUSH_ENDPOINT + '/' + gcmRegistrationId;
    return handleWebPushAPI(webPushEndpoint,
      encryptionHelper, encryptedDataBuffer);
  }

  // The registration ID cannot be included on the end of the GCM endpoint
  options.uri = GCM_ENDPOINT;
  options.headers['Content-Type'] = 'application/json';
  options.headers['Authorization'] = 'key=' + GCM_AUTHORIZATION;
  options.body = JSON.stringify({
    'to': gcmRegistrationId,
    'raw_data': encryptedDataBuffer.toString('base64')
  });

  return request(options);
}

function handleWebPushAPI(endpoint, encryptionHelper, encryptedDataBuffer) {
  var options = {
    uri: endpoint,
    method: 'POST',
    headers: {}
  };

  // GCM web push NEEDS this
  if (endpoint.indexOf(GCM_WEB_PUSH_ENDPOINT) === 0) {
    options.headers['Authorization'] = 'key=' + GCM_AUTHORIZATION;
  } else {
    // GCM web push FAILS with this, but firefox NEEDS this
    options.headers['Content-Encoding'] = 'aesgcm';
  }

  if (encryptionHelper !== null && encryptedDataBuffer !== null) {
    // Add required headers
    options.headers['Crypto-Key'] = 'dh=' +
      urlBase64.encode(encryptionHelper.getServerKeys().public);
    options.headers['Encryption'] = 'salt=' +
        urlBase64.encode(encryptionHelper.getSalt());
  }

  options.body = encryptedDataBuffer;

  return request(options);
}

function sendPushMessage(endpoint, keys) {
  let encryptionHelper = null;
  let encryptedDataBuffer = null;
  if (keys) {
    encryptionHelper = new EncryptionHelper({keys: keys});
    encryptedDataBuffer = encryptionHelper.encryptMessage('hello');
  }

  if (endpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
    // Handle Proprietary GCM API
    return handleGCMAPI(endpoint, encryptionHelper, encryptedDataBuffer);
  }

  // Handle Web Push API
  return handleWebPushAPI(endpoint, encryptionHelper, encryptedDataBuffer);
}

/**
 *
 * Massive h/t to Martin Thompson for his web-push-client code
 * https://github.com/martinthomson/webpush-client/
 *
 */
app.post('/send_web_push', function(req, res) {
  var endpoint = req.body.endpoint;
  var keys = req.body.keys;
  if (!endpoint) {
    // If there is no endpoint we can't send anything
    return res.status(404).json({success: false});
  }

  sendPushMessage(endpoint, keys)
  .then((responseText) => {
    console.log('Request success', responseText);
    // Check the response from GCM

    res.json({success: true});
  })
  .catch((err) => {
    console.log('Problem with request');
    res.json({success: false});
  });
});

var server = app.listen(3000, () => {
  var port = server.address().port;
  console.log('Server is listening at http://localhost:%s', port);
});

// Maybe prime256v1
// Maybe secp256k1
// var serverKeys = crypto.diffieHellman.generateKeys('binary');
// console.log(crypto.getCurves());
