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

var STATE_NOTIFICATION_PERMISSION = 0;
var STATE_PUSH_PERMISSION = 1;
var STATE_ALLOW_PUSH_SEND = 2;

var currentState = STATE_NOTIFICATION_PERMISSION;

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
}

function changeState(newState) {
  if (newState !== STATE_NOTIFICATION_PERMISSION &&
    Notification.permission !== 'granted') {
    changeState(STATE_NOTIFICATION_PERMISSION);
    return;
  }

  switch (newState) {
    case STATE_NOTIFICATION_PERMISSION:
      if (Notification.permission === 'granted') {
        changeState(STATE_PUSH_PERMISSION);
        return;
      }
      notificationBtn.disabled = false;
      notificationElements.classList.remove('completed');
      notificationElements.classList.remove('disabled');

      pushBtn.disabled = true;
      pushPermissionElements.classList.remove('completed');
      pushPermissionElements.classList.add('disabled');

      requestPushBtn.disabled = true;
      pushTitleInput.disabled = true;
      pushMessageInput.disabled = true;
      requestPushElements.classList.add('disabled');

      revokePushBtn.disabled = true;
      revokePushElements.classList.add('disabled');
      break;
    case STATE_PUSH_PERMISSION:
      notificationBtn.disabled = true;
      notificationElements.classList.add('completed');

      pushBtn.disabled = false;
      pushPermissionElements.classList.remove('completed');
      pushPermissionElements.classList.remove('disabled');

      requestPushBtn.disabled = true;
      pushTitleInput.disabled = true;
      pushMessageInput.disabled = true;
      requestPushElements.classList.add('disabled');

      revokePushBtn.disabled = true;
      revokePushElements.classList.add('disabled');
      break;
    case STATE_ALLOW_PUSH_SEND:
      notificationBtn.disabled = true;
      notificationElements.classList.add('completed');

      pushBtn.disabled = true;
      pushPermissionElements.classList.add('completed');
      pushPermissionElements.classList.remove('disabled');

      requestPushBtn.disabled = false;
      pushTitleInput.disabled = false;
      pushMessageInput.disabled = false;
      requestPushElements.classList.remove('disabled');

      revokePushBtn.disabled = false;
      revokePushElements.classList.remove('disabled');
      break;
  }

  currentState = newState;
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
      console.log('Permission wasn\'t granted. Allow a retry.');
      return;
    }

    changeState(STATE_PUSH_PERMISSION);
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
function sendSubscription(subscriptionObject) {
  var endpoint = subscriptionObject.endpoint;
  var subscriptionId = subscriptionObject.subscriptionId;
  console.log('sendRegistration endpoint = ', endpoint);
  console.log('sendRegistration subscriptionId = ', subscriptionId);
  var formData = new FormData();
  formData.append('registration', subscriptionId);
  formData.append('endpoint', endpoint);

  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    // The API for our App Engine returns a success value
    if (!JSON.parse(xhr.response).success) {
      return;
    }

    changeState(STATE_ALLOW_PUSH_SEND);
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
    serviceWorkerRegistration.pushManager.subscribe()
      .then(function(pushSubscription) {
        sendSubscription(pushSubscription);
      })
      .catch(function(e) {
        console.error('Unable to register for push', e);
        showError('Ooops Push Couldn\'t Register', 'When we tried to ' +
          'get the registration ID for GCM, something went wrong, not ' +
          'sure why. Check the console to see the error.');
      });
  });
}

function revokePushSubscription() {
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        // Check we have everything we need to unsubscribe
        if (!pushSubscription || !pushSubscription.unsubscribe) {
          return;
        }
        
        pushSubscription.unsubscribe();

        changeState(STATE_NOTIFICATION_PERMISSION);
      }.bind(this)).catch(function(e) {
        console.error('Error thrown while revoking push notifications. ' +
          'Most likely because push was never registered', e);
      });
  });
}

window.addEventListener('load', function() {
  prepareViews();

  // Check service workers are supported
  if (!('serviceWorker' in navigator)) {
    showError('Ooops No Service Worker found', 'This is most likely down ' +
      'to the site being run in a browser without service worker support. ' +
      'Make sure you are in Chrome M40 above (See chrome://version).');
    return;
  }

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // Check if this service worker supports push
    if (!serviceWorkerRegistration.pushManager) {
      showError('Ooops Push Isn\'t Supported', 'This is most likely ' +
        'down to the current browser doesn\'t have support for push. ' +
        'Try Chrome M41.');
      return;
    }

    // Check if we have permission for push messages already
    serviceWorkerRegistration.pushManager.hasPermission().then(
      function(pushPermissionStatus) {
        // Once we have a service worker, and checked permission,
        // enable the buttons
        var buttonContainer = document.querySelector('.button-container');
        buttonContainer.style.display = 'block';

        // If we don't have permission then set the UI accordingly
        if (pushPermissionStatus !== 'granted') {
          changeState(STATE_NOTIFICATION_PERMISSION);
          return;
        }

        // We have permission, so let's update the subscription
        // just to be safe
        serviceWorkerRegistration.pushManager.getSubscription().then(
          function(pushSubscription) {
            // Check if we have an existing pushSubscription
            if (pushSubscription) {
              sendSubscription(pushSubscription);
              changeState(STATE_ALLOW_PUSH_SEND);
            } else {
              changeState(STATE_NOTIFICATION_PERMISSION);
            }
          });
      });
  });

  // Register the Service Worker
  navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
      // Registration worked :)
      console.log('registration = ', registration);
      //registration.onupdatefound = function(serviceWorker) {
      //  console.log('onUpdatefound');
      //};
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

  revokePushBtn.addEventListener('click', revokePushSubscription);
});
