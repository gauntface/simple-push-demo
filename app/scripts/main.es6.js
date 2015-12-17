'use strict';

/**
 *
 *  Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

import PushClient from './push-client.es6.js';

var API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';

// Define a different server URL here if desire.
var PUSH_SERVER_URL = '';


function updateUIForPush(pushToggleSwitch) {
  // This div contains the UI for CURL commands to trigger a push
  var sendPushOptions = document.querySelector('.js-send-push-options');

  var stateChangeListener = function(state, data) {
    // console.log(state);
    if (typeof(state.interactive) !== 'undefined') {
      if (state.interactive) {
        pushToggleSwitch.enable();
      } else {
        pushToggleSwitch.disable();
      }
    }

    if (typeof(state.pushEnabled) !== 'undefined') {
      if (state.pushEnabled) {
        pushToggleSwitch.on();
      } else {
        pushToggleSwitch.off();
      }
    }

    switch (state.id) {
    case 'ERROR':
      console.error(data);
      showErrorMessage(
        'Ooops a Problem Occurred',
        data
      );
      break;
    default:
      break;
    }
  };

  var subscriptionUpdate = (subscription) => {
    console.log('subscriptionUpdate: ', subscription);
    if (!subscription) {
      // Remove any subscription from your servers if you have
      // set it up.

      sendPushOptions.style.opacity = 0;
      return;
    }

    // We should figure the GCM curl command
    var produceGCMProprietaryCURLCommand = function() {
      var curlEndpoint = 'https://android.googleapis.com/gcm/send';
      var endpointSections = subscription.endpoint.split('/');
      var subscriptionId = endpointSections[endpointSections.length - 1];
      var curlCommand = 'curl --header "Authorization: key=' +
        API_KEY + '" --header Content-Type:"application/json" ' +
        curlEndpoint + ' -d "{\\"registration_ids\\":[\\"' +
        subscriptionId + '\\"]}"';
      return curlCommand;
    };

    var produceWebPushProtocolCURLCommand = function() {
      var curlEndpoint = subscription.endpoint;
      var curlCommand = 'curl --request POST ' + curlEndpoint;
      return curlCommand;
    };

    var curlCommand;
    if (subscription.endpoint.indexOf(
      'https://android.googleapis.com/gcm/send') === 0) {
      curlCommand = produceGCMProprietaryCURLCommand();
    } else {
      curlCommand = produceWebPushProtocolCURLCommand();
    }

    var curlCodeElement = document.querySelector('.js-curl-code');
    curlCodeElement.innerHTML = curlCommand;

    // Code to handle the XHR
    var sendPushViaXHRButton = document.querySelector('.js-send-push-button');
    sendPushViaXHRButton.addEventListener('click', function(e) {
      var headers = new Headers();
      headers.append('Content-Type', 'application/json');

      fetch(PUSH_SERVER_URL + '/send_web_push', {
        method: 'post',
        headers: headers,
        body: JSON.stringify(subscription)
      }).then(function(response) {
        return response.json();
      })
      .then((responseObj) => {
        if (!responseObj.success) {
          throw new Error('Unsuccessful attempt to send push message');
        }
      })
      .catch(function(err) {
        console.log('Fetch Error :-S', err);
      });
    });

    // Display the UI
    sendPushOptions.style.opacity = 1;
  };

  var pushClient = new PushClient(
    stateChangeListener,
    subscriptionUpdate
  );

  document.querySelector('.js-push-toggle-switch > input')
  .addEventListener('click', function(event) {
    // Inverted because clicking will change the checked state by
    // the time we get here
    if (!event.target.checked) {
      pushClient.unsubscribeDevice();
    } else {
      pushClient.subscribeDevice();
    }
  });

  // Check that service workers are supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js', {
      scope: './'
    });
  } else {
    showErrorMessage(
      'Service Worker Not Supported',
      'Sorry this demo requires service worker support in your browser. ' +
      'Please try this demo in Chrome or Firefox Nightly.'
    );
  }
}


// Below this comment is code to initialise a material design lite view.
var toggleSwitch = document.querySelector('.js-push-toggle-switch');
toggleSwitch.initialised = false;

// This is to wait for MDL initialising
document.addEventListener('mdl-componentupgraded', function() {
  if (toggleSwitch.initialised) {
    return;
  }

  toggleSwitch.initialised = toggleSwitch.classList.contains('is-upgraded');
  if (!toggleSwitch.initialised) {
    return;
  }

  var pushToggleSwitch = toggleSwitch.MaterialSwitch;

  updateUIForPush(pushToggleSwitch);
});

function showErrorMessage(title, message) {
  var errorContainer = document.querySelector('.js-error-message-container');

  var titleElement = errorContainer.querySelector('.js-error-title');
  var messageElement = errorContainer.querySelector('.js-error-message');
  titleElement.textContent = title;
  messageElement.textContent = message;
  errorContainer.style.opacity = 1;

  var pushOptionsContainer = document.querySelector('.js-send-push-options');
  pushOptionsContainer.style.display = 'none';
}
