const seleniumAssistant = require('selenium-assistant');

const promises = [
  seleniumAssistant.downloadLocalBrowser('firefox', 'stable'),
  seleniumAssistant.downloadLocalBrowser('firefox', 'beta'),
  seleniumAssistant.downloadLocalBrowser('firefox', 'unstable'),
  seleniumAssistant.downloadLocalBrowser('chrome', 'stable'),
  seleniumAssistant.downloadLocalBrowser('chrome', 'beta'),
  seleniumAssistant.downloadLocalBrowser('chrome', 'unstable'),
];

console.log('Starting to download browsers.');
Promise.all(promises)
.then(function() {
  console.log('Download complete.');
});
