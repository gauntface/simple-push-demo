/*
  Copyright 2016 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

/* eslint-disable max-len, no-console, padded-blocks, no-multiple-empty-lines, max-nested-callbacks */
/* eslint-env node,mocha */

// These tests make use of selenium-webdriver. You can find the relevant
// documentation here: http://selenium.googlecode.com/git/docs/api/javascript/index.html

require('chai').should();
const path = require('path');
const SWTestingHelpers = require('sw-testing-helpers');
const TestServer = SWTestingHelpers.TestServer;
const automatedBrowserTesting = SWTestingHelpers.automatedBrowserTesting;
const mochaHelper = require('../node_modules/sw-testing-helpers/src/mocha/utils.js');
const seleniumFirefox = require('selenium-webdriver/firefox');

describe('Test sw-testing-helpers', function() {
  // Browser tests can be slow
  this.timeout(60000);

  // Driver is initialised to null to handle scenarios
  // where the desired browser isn't installed / fails to load
  // Null allows afterEach a safe way to skip quiting the driver
  let globalDriverReference = null;
  let testServer;
  let testServerURL;

  before(function() {
    testServer = new TestServer();
    return testServer.startServer(path.join(__dirname, '..'))
    .then(portNumber => {
      testServerURL = `http://localhost:${portNumber}`;
    });
  });

  after(function() {
    testServer.killServer();
  });

  afterEach(function() {
    this.timeout(10000);

    return automatedBrowserTesting.killWebDriver(globalDriverReference);
  });

  const queueUnitTest = browserInfo => {
    it(`should pass all tests in ${browserInfo.prettyName}`, () => {

      if (browserInfo.seleniumBrowserId === 'firefox') {
        const ffProfile = new seleniumFirefox.Profile();
        ffProfile.setPreference('security.turn_off_all_security_so_that_viruses_can_take_over_this_computer', true);
        browserInfo.seleniumOptions.setProfile(ffProfile);
      } else if (browserInfo.seleniumBrowserId === 'chrome') {
        /* eslint-disable camelcase */
        const chromePreferences = {
          profile: {
            content_settings: {
              exceptions: {
                notifications: {}
              }
            }
          }
        };
        chromePreferences.profile.content_settings.exceptions.notifications[testServerURL + ',*'] = {
          setting: 1
        };
        browserInfo.seleniumOptions.setUserPreferences(chromePreferences);
        /* eslint-enable camelcase */
      }

      globalDriverReference = browserInfo.getSeleniumDriver();

      return globalDriverReference.manage().timeouts().setScriptTimeout(2000)
      .then(() => {
        return automatedBrowserTesting.runMochaTests(
          browserInfo.prettyName,
          globalDriverReference,
          `${testServerURL}/test/browser-tests/`
        );
      })
      .then(testResults => {
        if (testResults.failed.length > 0) {
          const errorMessage = mochaHelper.prettyPrintErrors(
            browserInfo.prettyName,
            testResults
          );

          throw new Error(errorMessage);
        }
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          // Load simple push demo page
          globalDriverReference.get(`${testServerURL}/build/`)
          .then(() => {
            if (browserInfo.seleniumBrowserId === 'firefox') {
              return globalDriverReference.executeScript(function() {
                /* eslint-env browser */
                /* globals Components,Services */
                window.netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
                Components.utils.import('resource://gre/modules/Services.jsm');
                const uri = Services.io.newURI(window.location.origin, null, null);
                const principal = Services.scriptSecurityManager.getNoAppCodebasePrincipal(uri);
                Services.perms.addFromPrincipal(principal, 'desktop-notification', Services.perms.ALLOW_ACTION);
              });
            }
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                return document.body.dataset.simplePushDemoLoaded;
              });
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false;
              });
            });
          })
          .then(() => {
            // Check for network errors
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              if (!window.performance) {
                return null;
              }

              return JSON.stringify(window.performance.getEntries());
            });
          })
          .then(performanceEntries => {
            const requiredFiles = [
              '/scripts/main.js',
              '/styles/main.css'
            ];
            performanceEntries = JSON.parse(performanceEntries);
            performanceEntries.forEach(entry => {
              requiredFiles.forEach(requiredFile => {
                if (entry.name.indexOf(requiredFile) === (entry.name.length - requiredFile.length)) {
                  requiredFiles.splice(requiredFiles.indexOf(requiredFile), 1);
                }
              });
            });

            if (requiredFiles.length !== 0) {
              throw new Error('Missing required files in the final page', requiredFiles);
            }
          })
          .then(() => {
            // Toggle subscription switch
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              toggleSwitch.click();
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false;
              });
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const curlCodeElement = document.querySelector('.js-curl-code');
                return curlCodeElement.textContent.length > 0;
              });
            });
          })
          .then(() => {
            // Check curl command exists
            return globalDriverReference.executeScript(function() {
              const curlCodeElement = document.querySelector('.js-curl-code');
              return curlCodeElement.textContent;
            });
          })
          .then(curlCommand => {
            curlCommand.length.should.be.above(0);
          })
          .then(() => {
            // Click XHR Button
            return globalDriverReference.executeScript(function() {
              const pushButton = document.querySelector('.js-send-push-button');
              pushButton.click();
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeAsyncScript(function() {
                const cb = arguments[arguments.length - 1];
                navigator.serviceWorker.getRegistration()
                .then(registration => {
                  return registration.getNotifications();
                })
                .then(notifications => {
                  cb(notifications.length > 0);
                });
              }, 2000);
            });
          })
          .then(() => {
            // Detect notification
            return globalDriverReference.executeAsyncScript(function() {
              const cb = arguments[arguments.length - 1];
              navigator.serviceWorker.getRegistration()
              .then(registration => {
                return registration.getNotifications();
              })
              .then(notifications => {
                const notificationInfo = [];
                notifications.forEach(notification => {
                  notificationInfo.push({
                    title: notification.title,
                    body: notification.body,
                    icon: notification.icon,
                    tag: notification.tag
                  });
                });
                cb(notificationInfo);
              });
            }, 2000);
          })
          .then(notificationInfo => {
            notificationInfo.length.should.equal(1);
            notificationInfo[0].title.should.equal('Hello');
            notificationInfo[0].body.should.equal('Thanks for sending this push msg.');
            notificationInfo[0].tag.should.equal('simple-push-demo-notification');

            // Chrome adds the origin, FF doesn't
            const notifcationImg = '/images/icon-192x192.png';
            notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
          })
          .then(resolve)
          .thenCatch(reject);
        });
      });
    });
  };

  const automatedBrowsers = automatedBrowserTesting.getAutomatedBrowsers();
  automatedBrowsers.forEach(browserInfo => {
    queueUnitTest(browserInfo);
  });
});
