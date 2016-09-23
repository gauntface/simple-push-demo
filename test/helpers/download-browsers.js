const seleniumAssistant = require('selenium-assistant');

const promises = [
  seleniumAssistant.downloadFirefoxDriver(),
  seleniumAssistant.downloadBrowser('firefox', 'stable', true),
  seleniumAssistant.downloadBrowser('firefox', 'beta', true),
  seleniumAssistant.downloadBrowser('firefox', 'unstable', true),
  seleniumAssistant.downloadBrowser('chrome', 'stable', true),
  seleniumAssistant.downloadBrowser('chrome', 'beta', true),
  seleniumAssistant.downloadBrowser('chrome', 'unstable', true)
];

Promise.all(promises)
.then(function() {
  console.log('Download complete.');
});
