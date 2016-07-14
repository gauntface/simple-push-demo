'use strict';

/* eslint-env browser */

function uint8ArrayToBase64Url(uint8Array, start, end) {
  start = start || 0;
  end = end || uint8Array.byteLength;

  var base64 = window.btoa(String.fromCharCode.apply(null, uint8Array.subarray(start, end)));
  return base64.replace(/\=/g, '') // eslint-disable-line no-useless-escape
  .replace(/\+/g, '-').replace(/\//g, '_');
}

// Converts the URL-safe base64 encoded |base64UrlData| to an Uint8Array buffer.
function base64UrlToUint8Array(base64UrlData) {
  var padding = '='.repeat((4 - base64UrlData.length % 4) % 4);
  var base64 = (base64UrlData + padding).replace(/\-/g, '+').replace(/_/g, '/');

  var rawData = window.atob(base64);
  var buffer = new Uint8Array(rawData.length);

  for (var i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

if (window) {
  window.uint8ArrayToBase64Url = uint8ArrayToBase64Url;
  window.base64UrlToUint8Array = base64UrlToUint8Array;
} else if (module && module.exports) {
  module.exports = {
    uint8ArrayToBase64Url: uint8ArrayToBase64Url,
    base64UrlToUint8Array: base64UrlToUint8Array
  };
}