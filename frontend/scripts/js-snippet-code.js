import {logger} from './logger.js';

/* eslint-env browser */

const classNames = {
	COPIED: 'copied',
	NOT_SUPPORTED: 'nosupport',
};

const snippets = document.querySelectorAll('.js-snippet-code code');
for (const s of snippets) {
	s.addEventListener('click', () => onMouseClickHandler(s));
	s.addEventListener('mouseout', () => onMouseOutHandler(s));
}

async function onMouseClickHandler(snippet) {
	const successful = await copyToClipboard(snippet);
	snippet.classList.add(successful ?
		classNames.COPIED :
		classNames.NOT_SUPPORTED);
}

function onMouseOutHandler(snippet) {
	snippet.classList.remove(classNames.COPIED);
}

async function copyToClipboard(snippet) {
	try {
		await window.navigator.clipboard.writeText(snippet.textContent);
		return true;
	} catch (err) {
		logger.error('Failed to copy text to clipboard: ', err);
		return false;
	}
}
