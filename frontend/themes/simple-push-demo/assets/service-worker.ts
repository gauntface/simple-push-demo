/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope

import {logger} from '@gauntface/logger';

/* eslint-env browser, serviceworker */

logger.setPrefix('simple-push-demo/service-worker');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('push', function(event: PushEvent) {
  logger.log('Push message received');

  event.waitUntil(processPushEvent(event));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  logger.debug('Notification clicked');
});

self.addEventListener('notificationclose', function(event) {
  logger.debug('Notification closed');
});

async function processPushEvent(event: PushEvent) {
  let notificationTitle = 'Simple Push Demo';
  const notificationOptions = {
    body: 'Thanks for sending this push msg.',
    icon: './images/logo-192x192.png',
    badge: './images/badge-72x72.png',
    tag: 'simple-push-demo-notification',
  };

  if (event.data) {
    const dataText = event.data.text();
    notificationTitle += 'with Payload';
    notificationOptions.body = `Push data: '${dataText}'`;
  }

  await self.registration.showNotification(
    notificationTitle,
    notificationOptions,
  )
}