import seleniumAssistant from 'selenium-assistant';

async function run() {
	const promises = [
		seleniumAssistant.downloadLocalBrowser('firefox', 'stable'),
		seleniumAssistant.downloadLocalBrowser('firefox', 'beta'),
		seleniumAssistant.downloadLocalBrowser('firefox', 'unstable'),
		seleniumAssistant.downloadLocalBrowser('chrome', 'stable'),
		seleniumAssistant.downloadLocalBrowser('chrome', 'beta'),
		// seleniumAssistant.downloadLocalBrowser('chrome', 'unstable'),
	];

	console.log('Starting to download browsers.');
	await Promise.all(promises);
	console.log('Download complete.');
}

run();
