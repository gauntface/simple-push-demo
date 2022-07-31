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

// TODO: Figure out if this can be salvaged.

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
const mochaUtils = SWTestingHelpers.mochaUtils;
const seleniumFirefox = require('selenium-webdriver/firefox');

async function getNotificationInfo(driver) {
	await driver.wait(function() {
		return driver.executeAsyncScript(async (...args) => {
			const registration = await navigator.serviceWorker.getRegistration();
			const notifications = await registration.getNotifications();

			const cb = args[args.length - 1];
			cb(notifications.length > 0);
		}, 2000);
	});

	return driver.executeAsyncScript(async (...args) => {
		const cb = args[args.length - 1];
		const registration = await navigator.serviceWorker.getRegistration();
		const notifications = await registration.getNotifications();
		const notificationInfo = [];
		notifications.forEach((notification) => {
			notificationInfo.push({
				title: notification.title,
				body: notification.body,
				icon: notification.icon,
				tag: notification.tag,
			});

			notification.close();
		});
		cb(notificationInfo);
	}, 2000);
}

describe('Test simple-push-demo', function() {
	// Browser tests can be slow
	this.timeout(60000);
	// Add retries as end to end tests are error prone
	if (process.env.TRAVIS) {
		this.retries(3);
	} else {
		this.retries(0);
	}

	let testServer;
	let testServerURL;

	before(async () => {
		testServer = new TestServer();
		const portNumber = await testServer.startServer(path.join(__dirname, '..'));
		testServerURL = `http://localhost:${portNumber}`;
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
			const PAYLOAD_TEST = 'Hello, world!';

			async function initDriver() {
				// Enable Notifications
				switch (browserInfo.getId()) {
				case 'firefox': {
					// This is based off of: https://bugzilla.mozilla.org/show_bug.cgi?id=1275521
					// Unfortunately it doesn't seem to work :(
					const ffOpts = new seleniumFirefox.Options();
					ffOpts.setPreference('security.turn_off_all_security_so_that_' +
              'viruses_can_take_over_this_computer', true);
					ffOpts.setPreference('dom.push.testing.ignorePermission', true);
					ffOpts.setPreference('notification.prompt.testing', true);
					ffOpts.setPreference('notification.prompt.testing.allow', true);
					const builder = await browserInfo.getSeleniumDriverBuilder();
					builder.setFirefoxOptions(ffOpts);
					// browserInfo.setSeleniumOptions(ffOpts);
					break;
				}
				case 'opera': {
					/* eslint-disable camelcase */
					const operaPreferences = {
						profile: {
							content_settings: {
								exceptions: {
									notifications: {},
								},
							},
						},
					};
					operaPreferences.profile.content_settings.exceptions
						.notifications[testServerURL + ',*'] = {
							last_used: 1464967088.793686,
							setting: [1, 1464967088.793686],
						};

					// Write to file
					const tempPreferenceFile = './test/output/temp/opera';
					mkdirp.sync(tempPreferenceFile);

					fs.writeFileSync(`${tempPreferenceFile}/Preferences`, JSON.stringify(operaPreferences));
					/* eslint-enable camelcase */
					const options = browserInfo.getSeleniumOptions();
					options.addArguments(`user-data-dir=${tempPreferenceFile}/`);
					break;
				}
				case 'chrome': {
					/* eslint-disable camelcase */
					const chromePreferences = {
						profile: {
							content_settings: {
								exceptions: {
									notifications: {},
								},
							},
						},
					};
					chromePreferences.profile.content_settings.
						exceptions.notifications[testServerURL + ',*'] = {
							setting: 1,
						};
					browserInfo.getSeleniumOptions().setUserPreferences(chromePreferences);
					/* eslint-enable camelcase */
					break;
				}
				}

				const driver = await browserInfo.getSeleniumDriver();
				try {
					if (driver.manager && driver.manager().timeouts) {
						await driver.manage().timeouts().setScriptTimeout(2000);
					}
				} catch (err) {
					if (browserInfo.getId() === 'firefox' && browserInfo.getVersionNumber() === 56) {
						// See: https://github.com/mozilla/geckodriver/issues/800
						console.warn('Swallowing setScriptTimeoutError() <- Geckodriver issue.');
					} else {
						throw err;
					}
				}
				globalDriverReference = driver;
			}

			afterEach(async () => {
				this.timeout(10000);

				await seleniumAssistant.killWebDriver(globalDriverReference);
				await del('./test/output/');
			});

			it(`should pass all browser tests`, async () => {
				await initDriver();

				const testResults = await mochaUtils.startWebDriverMochaTests(
					browserInfo.getPrettyName(),
					globalDriverReference,
					`${testServerURL}/test/browser-tests/`,
				);

				if (testResults.failed.length > 0) {
					const errorMessage = mochaUtils.prettyPrintErrors(
						browserInfo.prettyName,
						testResults,
					);

					throw new Error(errorMessage);
				}
			});

			it(`should pass sanity checks and be able to trigger and receive a tickle`, async () => {
				// Load simple push demo page
				await initDriver();

				await globalDriverReference.get(`${testServerURL}/build/`);

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						return document.body.dataset.simplePushDemoLoaded;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false;
					});
				});

				// Check for network errors
				const performanceEntriesString = await globalDriverReference.executeScript(function() {
					/* eslint-env browser */
					if (!window.performance) {
						return null;
					}

					return JSON.stringify(window.performance.getEntries());
				});

				const requiredFiles = [
					'/scripts/app-controller.js',
					'/styles/main.css',
				];
				const performanceEntries = JSON.parse(performanceEntriesString);
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

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						if (toggleSwitch.disabled === false && toggleSwitch.checked) {
							return true;
						}
						toggleSwitch.click();
						return false;
					});
				});

				// Click XHR Button
				await globalDriverReference.executeScript(function() {
					const pushButton = document.querySelector('.js-send-push-button');
					pushButton.click();
				});

				const notificationInfo = await getNotificationInfo(globalDriverReference);

				notificationInfo.length.should.equal(1);
				notificationInfo[0].title.should.equal('Hello');
				notificationInfo[0].body.should.equal('Thanks for sending this push msg.');
				notificationInfo[0].tag.should.equal('simple-push-demo-notification');

				// Chrome adds the origin, FF doesn't
				const notifcationImg = '/images/logo-192x192.png';
				notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
			});

			it(`should be able to trigger and receive a tickle via CURL`, async () => {
				// Load simple push demo page
				await initDriver();

				await globalDriverReference.get(`${testServerURL}/build/`);

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						return document.body.dataset.simplePushDemoLoaded;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						if (toggleSwitch.disabled === false && toggleSwitch.checked) {
							return true;
						}
						toggleSwitch.click();
						return false;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const curlCodeElement = document.querySelector('.js-curl-code');
						return curlCodeElement.textContent.length > 0;
					});
				});

				// Check curl command exists
				const curlCommand = await globalDriverReference.executeScript(function() {
					const curlCodeElement = document.querySelector('.js-curl-code');
					return curlCodeElement.textContent;
				});

				curlCommand.length.should.be.above(0);

				// Need to use the curl command
				await new Promise((resolve, reject) => {
					exec(curlCommand, (error, stdout) => {
						if (error !== null) {
							return reject(error);
						}

						if (stdout) {
							const gcmResponse = JSON.parse(stdout);
							if (gcmResponse.failure === 0) {
								resolve();
							} else {
								reject(new Error('Bad GCM Response: ' + stdout));
							}
						} else {
							resolve();
						}
					});
				});

				const notificationInfo = await getNotificationInfo(globalDriverReference);

				notificationInfo.length.should.equal(1);
				notificationInfo[0].title.should.equal('Hello');
				notificationInfo[0].body.should.equal('Thanks for sending this push msg.');
				notificationInfo[0].tag.should.equal('simple-push-demo-notification');

				// Chrome adds the origin, FF doesn't
				const notifcationImg = '/images/logo-192x192.png';
				notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
			});

			it(`should be able to enter payload text and receive a push message in ${browserInfo.getPrettyName()}`, async () => {
				// Load simple push demo page
				await initDriver();

				await globalDriverReference.get(`${testServerURL}/build/`);

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						return document.body.dataset.simplePushDemoLoaded;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						if (toggleSwitch.disabled === false && toggleSwitch.checked) {
							return true;
						}
						toggleSwitch.click();
						return false;
					});
				});

				// Add Payload text
				await globalDriverReference.executeScript(function(payloadText) {
					const textfield = document.querySelector('.js-payload-textfield');
					textfield.value = payloadText;

					// This triggers the logic to hide / display options for
					// triggering push messages
					textfield.oninput();
				}, PAYLOAD_TEST);

				// Attempt to trigger push via fetch button
				await globalDriverReference.executeScript(function() {
					const pushButton = document.querySelector('.js-send-push-button');
					pushButton.click();
				});

				const notificationInfo = await getNotificationInfo(globalDriverReference);

				notificationInfo.length.should.equal(1);
				notificationInfo[0].title.should.equal('Received Payload');
				notificationInfo[0].body.should.equal(`Push data: '${PAYLOAD_TEST}'`);
				notificationInfo[0].tag.should.equal('simple-push-demo-notification');

				// Chrome adds the origin, FF doesn't
				const notifcationImg = '/images/logo-192x192.png';
				notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
			});

			it(`should be able to trigger and receive a message with payload via CURL or unless no CURL command is shown`, async () => {
				// Load simple push demo page
				await initDriver();

				await globalDriverReference.get(`${testServerURL}/build/`);

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						return document.body.dataset.simplePushDemoLoaded;
					});
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false;
					});
				});

				// Toggle subscription switch
				await globalDriverReference.executeScript(function() {
					/* eslint-env browser */
					const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
					if (!toggleSwitch.checked) {
						toggleSwitch.click();
					}
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const toggleSwitch = document.querySelector('.js-push-toggle-switch > input');
						return toggleSwitch.disabled === false && toggleSwitch.checked;
					});
				});

				// Add Payload text
				await globalDriverReference.executeScript(function(payloadText) {
					const textfield = document.querySelector('.js-payload-textfield');
					textfield.value = payloadText;

					// This triggers the logic to hide / display options for
					// triggering push messages
					textfield.oninput();
				}, PAYLOAD_TEST);

				await new Promise((resolve) => {
					// Slight timeout to ensure the payload is updated on Travis
					setTimeout(resolve, 500);
				});

				await globalDriverReference.wait(function() {
					return globalDriverReference.executeScript(function() {
						const curlCodeElement = document.querySelector('.js-curl-code');
						return curlCodeElement.textContent.length > 0;
					});
				});

				// Check curl command exists
				const curlCommand = await globalDriverReference.executeScript(function() {
					const curlCodeElement = document.querySelector('.js-curl-code');
					if (curlCodeElement.style.display === 'none') {
						return '';
					}

					return curlCodeElement.textContent;
				});

				if (curlCommand.length > 0) {
					// Need to use the curl command
					await new Promise((resolve, reject) => {
						exec(curlCommand, (error, stdout) => {
							if (error !== null) {
								return reject(error);
							}

							if (stdout) {
								const gcmResponse = JSON.parse(stdout);
								if (gcmResponse.failure === 0) {
									resolve();
								} else {
									reject(new Error('Bad GCM Response: ' + stdout));
								}
							} else {
								resolve();
							}
						});
					});

					const notificationInfo = await getNotificationInfo(globalDriverReference);

					notificationInfo.length.should.equal(1);
					notificationInfo[0].title.should.equal('Received Payload');
					notificationInfo[0].body.should.equal(`Push data: '${PAYLOAD_TEST}'`);
					notificationInfo[0].tag.should.equal('simple-push-demo-notification');

					// Chrome adds the origin, FF doesn't
					const notifcationImg = '/images/logo-192x192.png';
					notificationInfo[0].icon.indexOf(notifcationImg).should.equal(notificationInfo[0].icon.length - notifcationImg.length);
				}
			});
		});
	};

	seleniumAssistant.printAvailableBrowserInfo();
	const browsers = seleniumAssistant.getLocalBrowsers();
	browsers.forEach((browserInfo) => {
		if (browserInfo.getId() === 'opera') {
			// Opera has no feature detect for push support, so bail
			return;
		}

		if (browserInfo.getId() === 'safari') {
			// Safari not supported at the moment
			return;
		}

		if (browserInfo.getId() === 'firefox') {
			// Firefox returns the following:
			// The notification permission may only be requested in a secure context.
			return;
		}

		queueUnitTest(browserInfo);
	});
});
