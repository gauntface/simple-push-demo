'use strict';

/*!
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

var API_KEY = 'AIzaSyBBh4ddPa96rQQNxqiq_qQj7sq1JdsNQUQ';
var PUSH_SERVER_URL = 'https://simple-push-demo.appspot.com';

function onPushSubscription(pushSubscription) {
  console.log('pushSubscription = ', pushSubscription.endpoint);
  // Here we would normally send the endpoint
  // and subscription ID to our server.
  // In this demo we just use send these values to
  // our server via XHR which sends a push message.
  window.PushDemo.ui.showGCMPushOptions(true);
  window.PushDemo.ui.setPushSwitchDisabled(false);

  console.log('pushSubscription: ', pushSubscription);

  // Code to handle the XHR
  var sendPushViaXHRButton = document.querySelector('.js-xhr-button');
  sendPushViaXHRButton.addEventListener('click', function(e) {
    var formData = new FormData();

    var endpoint = pushSubscription.endpoint;

    // This will no be needed in M44 / M45
    if ('subscriptionId' in pushSubscription) {
      // Make the endpoint always contain the subscriptionId
      // so the server is always consistent
      if (!endpoint.includes(pushSubscription.subscriptionId)) {
        endpoint += '/' + pushSubscription.subscriptionId;
      }
    }

    formData.append('endpoint', endpoint);

    fetch(PUSH_SERVER_URL + '/send_push', {
        method: 'post',
        body: formData
      }).then(function(response) {
        console.log('Response = ', response);
      }).catch(function(err) {
        console.log('Fetch Error :-S', err);
      });
  });

  var curlEndpoint = pushSubscription.endpoint;
  var curlCommand = 'curl -I -X POST ' + pushSubscription.endpoint;

  // GCM is propriatery and needs extra hacking
  if (curlEndpoint.indexOf('https://android.googleapis.com/gcm/send') === 0) {
    curlEndpoint = 'https://android.googleapis.com/gcm/send';
    var subscriptionId = null;
    if (pushSubscription.subscriptionId) {
      subscriptionId = pushSubscription.subscriptionId;
    } else {
      var endpointSections = pushSubscription.endpoint.split('/');
      subscriptionId = endpointSections[endpointSections.length - 1];
    }
    curlCommand = 'curl --header "Authorization: key=' + API_KEY +
      '" --header Content-Type:"application/json" ' + curlEndpoint +
      ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';
  }
  // The curl command to trigger a push message straight from GCM

  var curlCodeElement = document.querySelector('.js-curl-code');
  curlCodeElement.innerHTML = curlCommand;
}

function subscribeDevice() {
  // Disable the switch so it can't be changed while
  // we process permissions
  window.PushDemo.ui.setPushSwitchDisabled(true);

  // We need the service worker registration to access the push manager
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true })
      .then(onPushSubscription)
      .catch(function(e) {
        // Check for a permission prompt issue
        if ('permissions' in navigator) {
          navigator.permissions.query({name: 'push', userVisibleOnly: true})
            .then(function(permissionStatus) {
              console.log('subscribe() Error: Push permission status = ',
                permissionStatus);
              window.PushDemo.ui.setPushChecked(false);
              if (permissionStatus.status === 'denied') {
                // The user blocked the permission prompt
                window.PushDemo.ui.showError('Ooops Notifications are Blocked',
                  'Unfortunately you just permanently blocked notifications. ' +
                  'Please unblock / allow them to switch on push ' +
                  'notifications.');
              } else if (permissionStatus.status === 'prompt') {
                // The user didn't accept the permission prompt
                window.PushDemo.ui.setPushSwitchDisabled(false);
                return;
              } else {
                window.PushDemo.ui.showError('Ooops Push Couldn\'t Register',
                  '<p>When we tried to ' +
                  'get the subscription ID for GCM, something went wrong,' +
                  ' not sure why.</p>' +
                  '<p>Have you defined "gcm_sender_id" and ' +
                  '"gcm_user_visible_only" in the manifest?</p>' +
                  '<p>Error message: ' +
                  e.message +
                  '</p>');
                window.PushDemo.ui.setPushSwitchDisabled(false);
                window.PushDemo.ui.setPushChecked(false);
              }
            }).catch(function(err) {
              window.PushDemo.ui.showError('Ooops Push Couldn\'t Register',
                '<p>When we tried to ' +
                'get the subscription ID for GCM, something went wrong, not ' +
                'sure why.</p>' +
                '<p>Have you defined "gcm_sender_id" and ' +
                '"gcm_user_visible_only" in the manifest?</p>' +
                '<p>Error message: ' +
                err.message +
                '</p>');
              window.PushDemo.ui.setPushSwitchDisabled(false);
              window.PushDemo.ui.setPushChecked(false);
            });
        } else {
          // Use notification permission to do something
          if (Notification.permission === 'denied') {
            window.PushDemo.ui.showError('Ooops Notifications are Blocked',
              'Unfortunately you just permanently blocked notifications. ' +
              'Please unblock / allow them to switch on push notifications.');
            window.PushDemo.ui.setPushSwitchDisabled(true);
          } else {
            window.PushDemo.ui.showError('Ooops Push Couldn\'t Register',
              '<p>When we tried to ' +
              'get the subscription ID for GCM, something went wrong, not ' +
              'sure why.</p>' +
              '<p>Have you defined "gcm_sender_id" and ' +
              '"gcm_user_visible_only" in the manifest?</p>' +
              '<p>Error message: ' +
              e.message +
              '</p>');
            window.PushDemo.ui.setPushSwitchDisabled(false);
          }
          window.PushDemo.ui.setPushChecked(false);
        }
      });
  });
}

function unsubscribeDevice() {
  // Disable the switch so it can't be changed while
  // we process permissions
  window.PushDemo.ui.setPushSwitchDisabled(true);

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        // Check we have everything we need to unsubscribe
        if (!pushSubscription) {
          // Disable the switch so it can't be changed while
          // we process permissions
          window.PushDemo.ui.setPushSwitchDisabled(false);

          // Set the state of the push switch
          window.PushDemo.ui.setPushChecked(false);

          window.PushDemo.ui.showGCMPushOptions(false);
          return;
        }

        // TODO: Remove the device details from the server
        // i.e. the pushSubscription.subscriptionId and
        // pushSubscription.endpoint
        console.log('Unsubscribe from push');
        pushSubscription.unsubscribe().then(function(successful) {
          console.log('Unsubscribed from push: ', successful);
          if (!successful) {
            // The unsubscribe was unsuccessful, but we can
            // remove the subscriptionId from our server
            // and notifications will stop
            // This just may be in a bad state when the user returns
            console.error('We were unable to unregister from push');
          }

          window.PushDemo.ui.setPushSwitchDisabled(false);
          window.PushDemo.ui.showGCMPushOptions(false);
        }).catch(function(e) {
          console.log('Unsubscribtion error: ', e);
          window.PushDemo.ui.setPushSwitchDisabled(false);
          window.PushDemo.ui.showGCMPushOptions(true);

          // Set the state of the push switch
          window.PushDemo.ui.setPushChecked(true);
        });
      }.bind(this)).catch(function(e) {
        console.error('Error thrown while revoking push notifications. ' +
          'Most likely because push was never registered', e);
      });
  });
}

function permissionStatusChange(permissionStatus) {
  console.log('permissionStatusChange = ', permissionStatus);
  // If the notification permission is denied, it's a permanent block
  switch (permissionStatus.status) {
    case 'denied':
      window.PushDemo.ui.showError('Ooops Push has been Blocked',
        'Unfortunately the user permanently blocked push. Please unblock / ' +
        'allow them to switch on push notifications.');

      // Set the state of the push switch
      window.PushDemo.ui.setPushChecked(false);
      window.PushDemo.ui.setPushSwitchDisabled(true);
      break;
    case 'granted':
      // Set the state of the push switch

      window.PushDemo.ui.setPushSwitchDisabled(false);
      break;
    case 'prompt':
      window.PushDemo.ui.setPushChecked(false);
      window.PushDemo.ui.setPushSwitchDisabled(false);
      break;
  }
}

function setUpPushPermission() {
  navigator.permissions.query({name: 'push', userVisibleOnly: true})
    .then(function(permissionStatus) {
      // Set the initial state
      permissionStatusChange(permissionStatus);

      // Handle Permission State Changes
      permissionStatus.onchange = function() {
        permissionStatusChange(this);
      };

      // Check if push is supported and what the current state is
      navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        // Let's see if we have a subscription already
        serviceWorkerRegistration.pushManager.getSubscription()
          .then(function(subscription) {
            if (!subscription) {
              // NOOP
              console.log('No subscription given');
              return;
            }

            // Set the initial state of the push switch
            window.PushDemo.ui.setPushChecked(true);

            // Update the current state with the
            // subscriptionid and endpoint
            onPushSubscription(subscription);
          })
          .catch(function(e) {
            console.log('An error occured while calling getSubscription()', e);
          });
      });
    }).catch(function(err) {
      console.error(err);
      window.PushDemo.ui.showError('Ooops Unable to check the permission',
        'Unfortunately the permission for push notifications couldn\'t be ' +
        'checked. Are you on Chrome 43+?');
    });
}

function setUpNotificationPermission() {
  // If the notification permission is denied, it's a permanent block
  if (Notification.permission === 'denied') {
    window.PushDemo.ui.showError('Ooops Notifications are Blocked', 
      'Unfortunately notifications are permanently blocked. Please unblock / ' +
      'allow them to switch on push notifications.');
    return;
  } else if (Notification.permission === 'default') {
    window.PushDemo.ui.setPushChecked(false);
    window.PushDemo.ui.setPushSwitchDisabled(false);
    return;
  }

  // Check if push is supported and what the current state is
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // Let's see if we have a subscription already
    serviceWorkerRegistration.pushManager.getSubscription()
      .then(function(subscription) {
        if (!subscription) {
          // NOOP
          window.PushDemo.ui.setPushChecked(false);
          window.PushDemo.ui.setPushSwitchDisabled(false);
          return;
        }

        // Set the initial state of the push switch
        window.PushDemo.ui.setPushChecked(true);

        // Update the current state with the
        // subscriptionid and endpoint
        onPushSubscription(subscription);
      })
      .catch(function(e) {
        console.log('An error occured while calling getSubscription()', e);
      });
  });
}

// Once the service worker is registered set the initial state
function initialiseState() {
  // Check if push messaging is supported
  if (!('PushManager' in window)) {
    window.PushDemo.ui.showError('Ooops Push Isn\'t Supported',
      'If this isn\'t an expected error please get in touch with ' +
      '<a href="https://twitter.com/gauntface">@gauntface</a> as the ' +
      'demo is probably broken.');
    return;
  }

  // Is the Permissions API supported
  if ('permissions' in navigator) {
    setUpPushPermission();
    return;
  } else {
    setUpNotificationPermission();
  }
}

window.addEventListener('UIReady', function() {
  // When the toggle switch changes, enabled / disable push
  // messaging
  var enablePushSwitch = document.querySelector('.js-enable-push');
  enablePushSwitch.addEventListener('change', function(e) {
    if (e.target.checked) {
      subscribeDevice();
    } else {
      unsubscribeDevice();
    }
  });

  // Check that service workers are supported
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js', {
      scope: './'
    })
    .then(initialiseState);
  } else {
    // Service Workers aren't supported so you should hide the push UI
    // If it's currently visible.
    window.PushDemo.ui.showError('Ooops Service Workers aren\'t Supported',
      'Service Workers aren\'t supported in this browser. ' +
      'For this demo be sure to use ' +
      '<a href="https://www.google.co.uk/chrome/browser/canary.html">Chrome Canary</a>' +
      ' or version 42.');
    window.PushDemo.ui.showOnlyError();
  }
});
