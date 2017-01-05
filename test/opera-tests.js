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

// Opera Driver is borked so these tests will not pass.
/**
const fs = require('fs');
const del = require('del');
const path = require('path');
const mkdirp = require('mkdirp');
const seleniumAssistant = require('selenium-assistant');
const SWTestingHelpers = require('sw-testing-helpers');

require('chai').should();

const TestServer = SWTestingHelpers.TestServer;
const mochaUtils = SWTestingHelpers.mochaUtils;

require('operadriver');

describe('Opera Tests', function() {
  // Browser tests can be slow
  this.timeout(60000);
  // Add retries as end to end tests are error prone
  this.retries(4);

  let testServer;
  let testServerURL;

  before(function() {
    testServer = new TestServer();
    return testServer.startServer(path.join(__dirname, '..'))
      .then((portNumber) => {
        testServerURL = `http://localhost:${portNumber}`;
      });
  });

  after(function() {
    testServer.killServer();
  });

  const queueUnitTest = (browserInfo) => {
    describe(`Perform Tests in ${browserInfo.getPrettyName()}`, function() {
      // Driver is initialised to null to handle scenarios
      // where the desired browser isn't installed / fails to load
      // Null allows afterEach a safe way to skip quiting the driver
      let globalDriverReference = null;

      beforeEach(function() {
        // Enable Notifications
        if (browserInfo.getId() === 'opera') {
          /* eslint-disable camelcase */
          /**
          const operaPreferences = {
            profile: {
              content_settings: {
                exceptions: {
                  notifications: {},
                },
              },
            },
          };
          operaPreferences.profile.content_settings.exceptions.notifications[testServerURL + ',*'] = {
            last_used: 1464967088.793686,
            setting: [1, 1464967088.793686],
          };
          // Write to file
          const tempPreferenceFile = './test/output/temp/opera';
          mkdirp.sync(tempPreferenceFile);

          fs.writeFileSync(`${tempPreferenceFile}/Preferences`, JSON.stringify(operaPreferences));
          /* eslint-enable camelcase */
          /**
          const options = browserInfo.getSeleniumOptions();
          // const newOptions = new seleniumChrome.Options();
          // newOptions.setChromeBinaryPath(browserInfo._getExecutablePath());
          options.addArguments(`user-data-dir=${tempPreferenceFile}/`);
          // browserInfo.setSeleniumOptions(newOptions);
        }

        return browserInfo.getSeleniumDriver()
          .then((driver) => {
            globalDriverReference = driver;
          });
      });

      afterEach(function() {
        this.timeout(10000);

        return seleniumAssistant.killWebDriver(globalDriverReference)
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
          .then((testResults) => {
            if (testResults.failed.length > 0) {
              const errorMessage = mochaUtils.prettyPrintErrors(
                browserInfo.prettyName,
                testResults
              );

              throw new Error(errorMessage);
            }
          });
      });

      it(`should be blocked with no push service error`, function() {
        // Load simple push demo page
        return globalDriverReference.manage().timeouts().setScriptTimeout(2000)
          .then(() => {
            return globalDriverReference.get(`${testServerURL}/build/`);
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
              /**
              if (!window.performance) {
                return null;
              }

              return JSON.stringify(window.performance.getEntries());
            });
          })
          .then((performanceEntries) => {
            const requiredFiles = [
              '/scripts/main.js',
              '/styles/main.css',
            ];
            performanceEntries = JSON.parse(performanceEntries);
            performanceEntries.forEach((entry) => {
              requiredFiles.forEach((requiredFile) => {
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
              /**
              const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
              if (!toggleSwitch.checked) {
                toggleSwitch.click();
              }
            });
          })
          .then(() => {
            console.log('Waiting on the error messages');
            return globalDriverReference.wait(function() {
              return globalDriverReference.executeScript(function() {
                let errorMsg = document.querySelector('.js-error-message')
                  .textContent;
                return (errorMsg.indexOf('push service not available') !== -1);
              });
            });
          });
      });
    });
  };

  const browsers = seleniumAssistant.getLocalBrowsers();
  browsers.forEach((browserInfo) => {
    // Marionette doesn't support tests auto-approving notifications :(
    // No firefox tests for now.
    if (browserInfo.getId() !== 'opera') {
      // These tests cover Opera only (they have push API, but don't support
      // it).
      return;
    }

    queueUnitTest(browserInfo);
  });
});**/
