'use strict';

/* eslint-env browser, serviceworker */

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('push', function(event) {
	console.log('Push message received.');
	let notificationTitle = 'Hello';
	const notificationOptions = {
		body: 'Thanks for sending this push msg.',
		icon: './images/logo-192x192.png',
		badge: './images/badge-72x72.png',
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
	console.log('Notification clicked.');
	event.notification.close();

	let clickResponsePromise = Promise.resolve();
	if (event.notification.data && event.notification.data.url) {
		clickResponsePromise = clients.openWindow(event.notification.data.url);
	}

	event.waitUntil(clickResponsePromise);
});
