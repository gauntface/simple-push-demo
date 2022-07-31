'use strict';

/* eslint-env browser, serviceworker */

/* global logger */
importScripts('https://unpkg.com/@gauntface/logger@3.0.13/build/browser-globals.js');

logger.setPrefix('simple-push-demo/service worker');

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('push', function(event) {
	logger.log('Push message received.');
	let notificationTitle = 'Hello';
	const notificationOptions = {
		body: 'Thanks for sending this push msg.',
		icon: './images/logo-192x192.png',
		badge: './images/badge-72x72.png',
		tag: 'simple-push-demo-notification',
		data: {
			url: 'https://web.dev/push-notifications-overview/',
		},
	};

	if (event.data) {
		const dataText = event.data.text();
		notificationTitle = 'Received Payload';
		notificationOptions.body = `Push data: '${dataText}'`;
	}

	event.waitUntil(
		self.registration.showNotification(
			notificationTitle,
			notificationOptions,
		),
	);
});

self.addEventListener('notificationclick', function(event) {
	logger.log('Notification clicked.');
	event.notification.close();

	let clickResponsePromise = Promise.resolve();
	if (event.notification.data && event.notification.data.url) {
		clickResponsePromise = clients.openWindow(event.notification.data.url);
	}

	event.waitUntil(clickResponsePromise);
});
