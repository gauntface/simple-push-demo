import test from 'ava';
import puppeteer from 'puppeteer';
import {startServer, stopServer} from './utils/dev-server.js';

let addr;
let browser;

test.before(async (t) => {
	// Server for project
	addr = await startServer();
});
test.before(async (t) => {
	// Start browser
	browser = await puppeteer.launch({headless: false});
	const context = browser.defaultBrowserContext();
	context.overridePermissions(addr, ['notifications']);
});

test.after('cleanup', async (t) => {
	// This runs before all tests
	stopServer();

	await browser.close();
});

test.beforeEach(async (t) => {
	// Create new page for test
	t.context.page = await browser.newPage();

	// Ensure we get 200 responses from the server
	t.context.page.on('response', (response) => {
		if (response) {
			t.deepEqual(response.status(), 200);
		}
	});
});

test.afterEach(async (t) => {
	await t.context.page.close();
});

test('browser tests', async (t) => {
	const page = t.context.page;

	await page.goto(`${addr}/test/browser-tests/index.html`, {
		waitUntil: 'networkidle0',
	});

	await page.waitForFunction(() => {
		// eslint-disable-next-line
    return 'test-results' in window;
	});

	const results = await page.evaluate(() => {
		// eslint-disable-next-line
    return window['test-results'];
	});
	console.log(prettyPrintResults(results));
	t.deepEqual(results.failed, [], `There were ${results.failed.length} test failures`);
});

function prettyPrintResults(testResults) {
	let prettyResultsString = ``;
	testResults.passed.forEach((testResult) => {
		let testResultString = ``;
		switch (testResult.state) {
		case 'passed':
			testResultString += '✔️ [Passed] ';
			break;
		case 'failed':
			testResultString += '❌ [Failed] ';
			break;
		default:
			testResultString += '❓ [Unknown] ';
			break;
		}

		testResultString += `${testResult.parentTitle} > ` +
      `${testResult.title}\n`;

		if (testResult.state === 'failed') {
			const pad = '    ';
			const indentedStack = testResult.stack.split('\n').join(`\n${pad}`);

			testResultString += `\n${pad}${testResult.errMessage}\n\n`;
			testResultString += `${pad}[Stack Trace]\n`;
			testResultString += `${pad}${indentedStack}\n`;
		}

		prettyResultsString += testResultString + '\n';
	});
	return prettyResultsString;
}
