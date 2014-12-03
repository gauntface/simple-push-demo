/*!
 *
 *  Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
'use strict';

var PUSH_SERVER_URL = 'http://localhost:8080';

var pushBtn;
var notificationBtn;
var requestPushBtn;

var requestNotificationPermission = function() {
  return new Promise(function(resolve, reject) {
    if (!Notification) {
      console.log('Try enabling Experimental web platform features ' +
        'chrome://flags/#enable-experimental-web-platform-features');
      reject('Notifications are not supported');
      return;
    }

    Notification.requestPermission(function(result) {
      if (result === 'granted') {
        console.log('Granted permission to display notifications');
        resolve(result);
      } else {
        console.log('Granted permission to display notifications');
        reject(result);
      }
      return;
    });
  });
};

var sendRegistration = function(registrationId) {
  console.log('sending ' + registrationId + ' to ' +
    PUSH_SERVER_URL + '/register_track');

  var formData = new FormData();
  formData.append('registration', registrationId);

  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    console.log('registration with server status: ' +
      JSON.parse(xhr.response).success);

    if (!JSON.parse(xhr.response).success) {
      return;
    }

    var pushBtn = document.querySelector('#push-permission-btn');
    pushBtn.disabled = true;


    requestPushBtn.disabled = false;
  };
  xhr.onerror = xhr.onabort = function() {
    console.log('registration with server failed');
  };
  xhr.open('POST', PUSH_SERVER_URL + '/register_track');
  xhr.send(formData);
};

window.addEventListener('load', function() {
  console.log('Registering the SW');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ',
        registration.scope);
    }).catch(function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  }

  notificationBtn = document.querySelector('#notification-permission-btn');
  pushBtn = document.querySelector('#push-permission-btn');
  requestPushBtn = document.querySelector('#request-push-btn');

  notificationBtn.addEventListener('click', function(e) {
    console.log('Requesting permission for notifications');
    requestNotificationPermission().then(function() {
      console.log('Enabled push request button');
      e.target.disabled = true;

      pushBtn.disabled = false;
    });
  });

  pushBtn.addEventListener('click', function() {
    console.log('Registering SW, waiting for the ready event');
    navigator.serviceWorker.ready.then(function(sw) {
      console.log('ServiceWorker is Ready');
      navigator.push.register().then(
        function(pushRegistration) {
          console.log('Push registration has been successful');
          console.log('Push registration ID: ',
          pushRegistration.pushRegistrationId);
          sendRegistration(pushRegistration.pushRegistrationId);
        })
        .catch(function(e) {
          console.log('navigator.push error', e);
        });
    });
  });

  requestPushBtn.addEventListener('click', function() {
    console.log('Request Push to Self');
    var formData = new FormData();
    formData.append('message', 'Hello World');

    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
      console.log('Push Request received: ' +
      JSON.parse(xhr.response).success);

      if (!JSON.parse(xhr.response).success) {
        return;
      }
    };
    xhr.onerror = function() {
      console.log('push request on error');
    };
    xhr.onabort = function() {
      console.log('push request on abort');
    };
    xhr.open('POST', PUSH_SERVER_URL + '/push');
    xhr.send(formData);
  });
});
