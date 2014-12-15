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

var PUSH_SERVER_URL = window.location.origin;

var notificationElements;
var pushPermissionElements;
var requestPushElements;
var revokePushElements;
var pushBtn;
var notificationBtn;
var requestPushBtn;
var revokePushBtn;
var pushTitleInput;
var pushMessageInput;

/**
 *
 * These methods are specific to setting up the UI
 *
 */
function prepareViews() {
  notificationElements = document.querySelector('#notification-permission');
  pushPermissionElements = document.querySelector('#push-permission');
  requestPushElements = document.querySelector('#request-push');
  revokePushElements = document.querySelector('#revoke-push');

  notificationBtn = notificationElements.querySelector('button');
  pushBtn = pushPermissionElements.querySelector('button');
  requestPushBtn = requestPushElements.querySelector('button');
  revokePushBtn = revokePushElements.querySelector('button');

  pushTitleInput = requestPushElements.querySelector('.title');
  pushMessageInput = requestPushElements.querySelector('.message');

  if (!(navigator.push && navigator.push.unregister)) {
    revokePushElements.style.display = 'none';
  }
}

function showError(title, message) {
  var buttonContainer = document.querySelector('.button-container');
  buttonContainer.style.display = 'none';

  var errorContainer = document.querySelector('.error-container');
  var titleElement = errorContainer.querySelector('.title');
  var messageElement = errorContainer.querySelector('.message');
  titleElement.innerHTML = title;
  messageElement.innerHTML = message;
  errorContainer.style.display = 'block';
}

/**
 *
 * The following methods deal with notifications
 *
 */
function requestNotificationPermission() {
  if (!Notification) {
    showError('Ooops Notifications Not Supported', 'This is most likely ' +
      'down to the experimental web features not being enabled in ' +
      'chrome://flags. ' +
      'Checkout chrome://flags/#enable-experimental-web-platform-features');
    return;
  }

  Notification.requestPermission(function(result) {
    if (result !== 'granted') {
      console.log('Permission wasn\'t granted. Allow a retry');
      return;
    }

    notificationBtn.disabled = true;
    notificationElements.classList.add('completed');
    pushBtn.disabled = false;
    pushPermissionElements.classList.remove('disabled');
  });
}

/**
 *
 * This method requests the server to send a push
 * message
 *
 */ 
function askServerToSendMessage() {
  var title = pushTitleInput.value;
  var message = pushMessageInput.value;

  var formData = new FormData();
  formData.append('title', title);
  formData.append('message', message);

  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    // The API for our App Engine returns a success value
    if (!JSON.parse(xhr.response).success) {
      window.alert('We were unable to request a push message ' +
        'due to an error with GCM. You may need to try again. ' +
        'Otherwise. Eek. Raise a bug or tweet @gauntface.');
      return;
    }
  };

  xhr.onerror = xhr.onabort = function() {
    window.alert('We were unable to request a push message ' +
      'from our server. Please check your internet ' +
      'connection and try again.');
  };

  xhr.open('POST', PUSH_SERVER_URL + '/push');
  xhr.send(formData);
}

/**
 *
 * The following methods are involved in setting
 * up push notifications
 *
 */
function sendRegistration(endpoint, registrationId) {
  console.log('sendRegistration endpoint = ', endpoint);
  console.log('sendRegistration registrationId = ', registrationId);
  var formData = new FormData();
  formData.append('registration', registrationId);
  formData.append('endpoint', endpoint);

  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    // The API for our App Engine returns a success value
    if (!JSON.parse(xhr.response).success) {
      return;
    }

    pushBtn.disabled = true;
    pushPermissionElements.classList.add('completed');
    requestPushBtn.disabled = false;
    requestPushElements.classList.remove('disabled');
    revokePushBtn.disabled = false;
    revokePushElements.classList.remove('disabled');
  };

  xhr.onerror = xhr.onabort = function() {
    window.alert('We were unable to register with our server. ' +
      'Please check your internet connection and try again.');
  };

  xhr.open('POST', PUSH_SERVER_URL + '/register_track');
  xhr.send(formData);
}

function requestPushPermission() {
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.register()
      .then(function(pushRegistration) {
        sendRegistration(pushRegistration.pushEndpoint, pushRegistration.pushRegistrationId);
      })
      .catch(function(e) {
        console.error('Unable to register for push', e);
        showError('Ooops Push Couldn\'t Register', 'When we tried to ' +
          'get the registration ID for GCM, something went wrong, not ' +
          'sure why. Check the console to see the error.');
      });
  });
}

function revokePushPermission() {
  navigator.serviceWorker.ready.then(function(sw) {
    navigator.push.unregister()
      .then(function(pushRegistration) {
        console.log('Revoked push permissions', pushRegistration);

        pushBtn.disabled = false;
        pushPermissionElements.classList.remove('completed');
        pushPermissionElements.classList.remove('disabled');

        revokePushBtn.disabled = true;
        revokePushElements.classList.add('disabled');
      })
      .catch(function(e) {
        console.error('Error thrown while revoking push notifications. ' +
          'Most likely because push was never registered', e);
      });
  });
}

window.addEventListener('load', function() {
  prepareViews();

  if (!('serviceWorker' in navigator)) {
    showError('Ooops No Service Worker found', 'This is most likely down ' +
      'to the site being run in a browser without service worker support. ' +
      'Make sure you are in Chrome M40 above (See chrome://version).');
    return;
  }

  // Once we have a service worker, enable the buttons
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    if (!serviceWorkerRegistration.pushManager) {
      showError('Ooops Push Isn\'t Supported', 'This is most likely ' +
        'down to the current browser doesn\'t have support for push. ' +
        'Try Chrome M41.');
      return;
    }

    var buttonContainer = document.querySelector('.button-container');
    buttonContainer.style.display = 'block';
  });

  // Register the Service Worker
  navigator.serviceWorker.register('/sw.js')
    .then(function(err) {
      // Registration worked :)
    })
    .catch(function(err) {
      // Registration failed :(

      showError('Ooops a Service Worker Error', 'Whilst registering the  ' +
      'service worker, something caused an error and resulting in the ' +
      'service worker not getting installed. #NeedsABugFix.');
    });

  notificationBtn.addEventListener('click', requestNotificationPermission);

  pushBtn.addEventListener('click', requestPushPermission);

  requestPushBtn.addEventListener('click', askServerToSendMessage);

  revokePushBtn.addEventListener('click', revokePushPermission);
});
