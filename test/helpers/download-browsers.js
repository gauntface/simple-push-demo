const seleniumAssistant = require('selenium-assistant');

const promises = [
  seleniumAssistant.downloadFirefoxDriver(),
  seleniumAssistant.downloadBrowser('firefox', 'stable'),
  seleniumAssistant.downloadBrowser('firefox', 'beta'),
  seleniumAssistant.downloadBrowser('firefox', 'unstable'),
  seleniumAssistant.downloadBrowser('chrome', 'stable'),
  seleniumAssistant.downloadBrowser('chrome', 'beta'),
  seleniumAssistant.downloadBrowser('chrome', 'unstable'),
  seleniumAssistant.downloadBrowser('opera', 'stable'),
  seleniumAssistant.downloadBrowser('opera', 'beta'),
  seleniumAssistant.downloadBrowser('opera', 'unstable')
];

Promise.all(promises)
.then(function() {
  console.log('Download complete.');
});
