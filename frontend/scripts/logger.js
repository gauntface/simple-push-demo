/* eslint-env browser */

let l = console;
if (window['gauntface'] && window['gauntface'].logger) {
	window['gauntface'].logger.setPrefix('simple-push-demo');
	l = window['gauntface'].logger;
}

export const logger = l;
