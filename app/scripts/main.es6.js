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

import PushClient from './push-client.js';

var API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';
var PUSH_SERVER_URL = 'https://simple-push-demo.appspot.com';

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
      console.log(data);
      break;
    default:
      break;
    }
    /** switch (state) {
    case 'UNSUPPORTED':
      // Disable or Hide / Remove UI
      pushToggleSwitch.disable();
      pushToggleSwitch.off();
      break;
    case 'INITIALISING':
      // Disable and set UI to off state while library figures out state
      // pushToggleSwitch.disabled = true;
      // pushToggleSwitch.checked = false;
      break;
    case 'PERMISSION_DENIED':
      // Disable and Keep Off
      pushToggleSwitch.disable();
      pushToggleSwitch.off();
      break;
    case 'PERMISSION_GRANTED':
      // Enable Push UI
      pushToggleSwitch.enable();
      break;
    case 'PERMISSION_PROMPT':
      // Enable Push UI but set to Off
      pushToggleSwitch.enable();
      pushToggleSwitch.off();
      break;
    case 'STARTING_SUBSCRIBE':
      // During subscribe prevent the user from interacting with UI
      pushToggleSwitch.on();
      break;
    case 'ERROR':
      // This shouldn't occur
      pushToggleSwitch.disable();
      pushToggleSwitch.off();
      break;
    case 'SUBSCRIBED':
      pushToggleSwitch.enable();
      pushToggleSwitch.on();
      break;
    case 'UNSUBSCRIBED':
      pushToggleSwitch.enable();
      pushToggleSwitch.off();
      break;
    default:
      console.log('Unknown push state change: ', state);
      break;
    }**/
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

    console.log(curlCommand);

    var curlCodeElement = document.querySelector('.js-curl-code');
    curlCodeElement.innerHTML = curlCommand;

    // Code to handle the XHR
    var sendPushViaXHRButton = document.querySelector('.js-xhr-button');
    sendPushViaXHRButton.addEventListener('click', function(e) {
      var formData = new FormData();

      var endpoint = subscription.endpoint;

      // This will no be needed in M44 / M45
      if ('subscriptionId' in subscription) {
        // Make the endpoint always contain the subscriptionId
        // so the server is always consistent
        if (!endpoint.includes(subscription.subscriptionId)) {
          endpoint += '/' + subscription.subscriptionId;
        }
      }

      formData.append('endpoint', endpoint);

      fetch(PUSH_SERVER_URL + '/send_push', {
        method: 'post',
        body: formData
      }).then(function(response) {
        this.log('Response = ', response);
      }).catch(function(err) {
        this.log('Fetch Error :-S', err);
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
    // Service Workers aren't supported so you should hide the push UI
    // If it's currently visible.
    /** window.PushDemo.ui.showError('Ooops Service Workers aren\'t Supported',
      'Service Workers aren\'t supported in this browser. ' +
      'For this demo be sure to use ' +
      '<a href="https://www.google.co.uk/chrome/browser/' +
      'canary.html">Chrome Canary</a>' +
      ' or version 42.');
    window.PushDemo.ui.showOnlyError();**/
  }
}
/** window.addEventListener('UIReady', function() {
  this.log('UIReady');
  var pushClient = new PushClient(API_KEY);

  // When the toggle switch changes, enabled / disable push
  // messaging
  var enablePushSwitch = document.querySelector('.js-enable-push');
  enablePushSwitch.addEventListener('change', function(e) {
    if (e.target.checked) {
      pushClient.subscribeDevice();
    } else {
      pushClient.unsubscribeDevice();
    }
  });
});**/
