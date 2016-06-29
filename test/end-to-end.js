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

// These tests make use of selenium-webdriver. You can find the relevant
// documentation here: http://selenium.googlecode.com/git/docs/api/javascript/index.html

require('chai').should();
const fs = require('fs');
const del = require('del');
const path = require('path');
const mkdirp = require('mkdirp');
const exec = require('child_process').exec;
const seleniumAssistant = require('selenium-assistant');
const SWTestingHelpers = require('sw-testing-helpers');
const TestServer = SWTestingHelpers.TestServer;
const automatedBrowserTesting = SWTestingHelpers.automatedBrowserTesting;
const mochaUtils = SWTestingHelpers.mochaUtils;
const seleniumFirefox = require('selenium-webdriver/firefox');
const seleniumChrome = require('selenium-webdriver/chrome');

describe('Test simple-push-demo', function() {
  // Browser tests can be slow
  this.timeout(60000);

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

  const queueUnitTest = browserInfo => {
    describe(`Perform Tests in ${browserInfo.getPrettyName()}`, function() {
      // Driver is initialised to null to handle scenarios
      // where the desired browser isn't installed / fails to load
      // Null allows afterEach a safe way to skip quiting the driver
      let globalDriverReference = null;
      const PAYLOAD_TEST = 'Hello, world!';

      beforeEach(function() {
        // Enable Notifications
        if (browserInfo.getSeleniumBrowserId() === 'firefox') {
          const ffProfile = new seleniumFirefox.Profile();
          ffProfile.setPreference('security.turn_off_all_security_so_that_viruses_can_take_over_this_computer', true);
          browserInfo.getSeleniumOptions().setProfile(ffProfile);
        } else if (browserInfo.getSeleniumBrowserId() === 'chrome') {
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
          browserInfo.getSeleniumOptions().setUserPreferences(chromePreferences);
          /* eslint-enable camelcase */
        } else if (browserInfo.getSeleniumBrowserId() === 'opera') {
          /* eslint-disable camelcase */
          const operaPreferences = {
            profile: {
              content_settings: {
                exceptions: {
                  notifications: {}
                }
              }
            }
          };
          operaPreferences.profile.content_settings.exceptions.notifications[testServerURL + ',*'] = {
            last_used: 1464967088.793686,
            setting: [1, 1464967088.793686]
          };
          // Write to file
          const tempPreferenceFile = './test/output/temp/opera';
          mkdirp.sync(tempPreferenceFile);

          fs.writeFileSync(`${tempPreferenceFile}/Preferences`, JSON.stringify(operaPreferences));
          /* eslint-enable camelcase */
          const options = browserInfo.getSeleniumOptions();
          // const newOptions = new seleniumChrome.Options();
          // newOptions.setChromeBinaryPath(browserInfo._getExecutablePath());
          options.addArguments(`user-data-dir=${tempPreferenceFile}/`);
          // browserInfo.setSeleniumOptions(newOptions);
        }

        return browserInfo.getSeleniumDriver()
        .then(driver => {
          globalDriverReference = driver;
        });
      });

      afterEach(function() {
        this.timeout(10000);

        return automatedBrowserTesting.killWebDriver(globalDriverReference)
        .then(() => {
          return del('./test/output/');
        });
      });

      it(`should pass all browser tests`, () => {
        return mochaUtils.startWebDriverMochaTests(
          browserInfo.getPrettyName(),
          globalDriverReference,
          `${testServerURL}/test/browser-tests/`
        )
        .then(testResults => {
          if (testResults.failed.length > 0) {
            const errorMessage = mochaUtils.prettyPrintErrors(
              browserInfo.prettyName,
              testResults
            );

            throw new Error(errorMessage);
          }
        });
      });

      it(`should pass sanity checks and be able to trigger and receive a tickle`, function() {
        // This is to handle the fact that selenium-webdriver doesn't use native
        // promises.
        return new Promise((resolve, reject) => {
          // Load simple push demo page
          globalDriverReference.manage().timeouts().setScriptTimeout(2000)
          .then(() => {
            return globalDriverReference.get(`${testServerURL}/build/`);
          })
          .then(() => {
            if (browserInfo.getSeleniumBrowserId() === 'firefox') {
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
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false;
              });
            });
          })
          .then(() => {
            // Toggle subscription switch
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              if (!toggleSwitch.checked) {
                toggleSwitch.click();
              }
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false && toggleSwitch.checked;
              });
            });
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

                  notification.close();
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

      it(`should be able to trigger and receive a tickle via CURL`, function() {
        // This is to handle the fact that selenium-webdriver doesn't use native
        // promises.
        return new Promise((resolve, reject) => {
          // Load simple push demo page
          globalDriverReference.manage().timeouts().setScriptTimeout(2000)
          .then(() => {
            return globalDriverReference.get(`${testServerURL}/build/`);
          })
          .then(() => {
            if (browserInfo.getSeleniumBrowserId() === 'firefox') {
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
            // Toggle subscription switch
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              if (!toggleSwitch.checked) {
                toggleSwitch.click();
              }
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false && toggleSwitch.checked;
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

            // Need to use the curl command
            return new Promise((resolve, reject) => {
              exec(curlCommand, (error, stdout) => {
                if (error !== null) {
                  return reject(error);
                }

                if (stdout) {
                  const gcmResponse = JSON.parse(stdout);
                  if (gcmResponse.failure === 0) {
                    resolve();
                  } else {
                    reject('Bad GCM Response: ' + stdout);
                  }
                } else {
                  resolve();
                }
              });
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

                  notification.close();
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

      it(`should be able to enter payload text and receive a push message in ${browserInfo.getPrettyName()}`, function() {
        // This is to handle the fact that selenium-webdriver doesn't use native
        // promises.
        return new Promise((resolve, reject) => {
          // Load simple push demo page
          globalDriverReference.manage().timeouts().setScriptTimeout(2000)
          .then(() => {
            return globalDriverReference.get(`${testServerURL}/build/`);
          })
          .then(() => {
            if (browserInfo.getSeleniumBrowserId() === 'firefox') {
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
            // Toggle subscription switch
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              if (!toggleSwitch.checked) {
                toggleSwitch.click();
              }
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false && toggleSwitch.checked;
              });
            });
          })
          .then(() => {
            // Add Payload text
            return globalDriverReference.executeScript(function(payloadText) {
              const textfield = document.querySelector('.js-payload-textfield');
              textfield.value = payloadText;

              // This triggers the logic to hide / display options for
              // triggering push messages
              textfield.oninput();
            }, PAYLOAD_TEST);
          })
          .then(() => {
            // Attempt to trigger push via fetch button
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

                  notification.close();
                });
                cb(notificationInfo);
              });
            }, 2000);
          })
          .then(notificationInfo => {
            notificationInfo.length.should.equal(1);
            notificationInfo[0].title.should.equal('Received Payload');
            notificationInfo[0].body.should.equal(`Push data: '${PAYLOAD_TEST}'`);
            notificationInfo[0].tag.should.equal('simple-push-demo-notification');

            // Chrome adds the origin, FF doesn't
            const notifcationImg = '/images/icon-192x192.png';
            notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
          })
          .then(resolve)
          .thenCatch(reject);
        });
      });

      it(`should be able to trigger and receive a message with payload via CURL or unless no CURL command is shown`, function() {
        // This is to handle the fact that selenium-webdriver doesn't use native
        // promises.
        return new Promise((resolve, reject) => {
          // Load simple push demo page
          globalDriverReference.manage().timeouts().setScriptTimeout(2000)
          .then(() => {
            return globalDriverReference.get(`${testServerURL}/build/`);
          })
          .then(() => {
            if (browserInfo.getSeleniumBrowserId() === 'firefox') {
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
            // Toggle subscription switch
            return globalDriverReference.executeScript(function() {
              /* eslint-env browser */
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              if (!toggleSwitch.checked) {
                toggleSwitch.click();
              }
            });
          })
          .then(() => {
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
                return toggleSwitch.disabled === false && toggleSwitch.checked;
              });
            });
          })
          .then(() => {
            // Add Payload text
            return globalDriverReference.executeScript(function(payloadText) {
              const textfield = document.querySelector('.js-payload-textfield');
              textfield.value = payloadText;

              // This triggers the logic to hide / display options for
              // triggering push messages
              textfield.oninput();
            }, PAYLOAD_TEST);
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
              if (curlCodeElement.style.display === 'none') {
                return '';
              }

              return curlCodeElement.textContent;
            });
          })
          .then(curlCommand => {
            if (curlCommand.length > 0) {
              // Need to use the curl command
              return new Promise((resolve, reject) => {
                exec(curlCommand, (error, stdout) => {
                  if (error !== null) {
                    return reject(error);
                  }

                  if (stdout) {
                    const gcmResponse = JSON.parse(stdout);
                    if (gcmResponse.failure === 0) {
                      resolve();
                    } else {
                      reject('Bad GCM Response: ' + stdout);
                    }
                  } else {
                    resolve();
                  }
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

                      notification.close();
                    });
                    cb(notificationInfo);
                  });
                }, 2000);
              })
              .then(notificationInfo => {
                notificationInfo.length.should.equal(1);
                notificationInfo[0].title.should.equal('Received Payload');
                notificationInfo[0].body.should.equal(`Push data: '${PAYLOAD_TEST}'`);
                notificationInfo[0].tag.should.equal('simple-push-demo-notification');

                // Chrome adds the origin, FF doesn't
                const notifcationImg = '/images/icon-192x192.png';
                notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
              });
            }
          })
          .then(resolve)
          .thenCatch(reject);
        });
      });
    });
  };

  seleniumAssistant.printAvailableBrowserInfo();
  const browsers = seleniumAssistant.getAvailableBrowsers();
  browsers.forEach(browserInfo => {
    // Marionette doesn't support tests auto-approving notifications :(
    // No firefox tests for now.
    if (browserInfo.getSeleniumBrowserId() === 'firefox' &&
      browserInfo.getVersionNumber() <= 50) {
      // 49 has issues with marionette / permission issues.
      return;
    }

    if (browserInfo.getSeleniumBrowserId() === 'opera' &&
        browserInfo.getVersionNumber() <= 39) {
      // Opera has no feature detect for push support, so bail
      return;
    }

    queueUnitTest(browserInfo);
  });
});
