'use strict';

/* eslint-env browser, serviceworker */

// Make use of Google Analytics Measurement Protocol.
// https://developers.google.com/analytics/devguides/collection/protocol/v1/reference
class Analytics {
  trackEvent(eventAction, eventValue) {
    if (!this.trackingId) {
      console.error('You need to set a trackingId, for example:');
      console.error('self.analytics.trackingId = \'UA-XXXXXXXX-X\';');

      // We want this to be a safe method, so avoid throwing Unless
      // It's absolutely necessary.
      return Promise.resolve();
    }

    if (!eventAction && !eventValue) {
      console.warn('sendAnalyticsEvent() called with no eventAction or ' +
      'eventValue.');
      return Promise.resolve();
    }

    return self.registration.pushManager.getSubscription()
    .then(subscription => {
      if (subscription === null) {
        // The user has not subscribed yet.
        throw new Error('No subscription currently available.');
      }

      const payloadData = {
        // Version Number
        v: 1,
        // Client ID
        cid: subscription.endpoint,
        // Tracking ID
        tid: this.trackingId,
        // Hit Type
        t: 'event',
        // Data Source
        ds: 'serviceworker',
        // Event Category
        ec: 'serviceworker',
        // Event Action
        ea: eventAction,
        // Event Value
        ev: eventValue
      };

      const payloadString = Object.keys(payloadData)
      .filter(analyticsKey => {
        return payloadData[analyticsKey];
      })
      .map(analyticsKey => {
        return `${analyticsKey}=` +
          encodeURIComponent(payloadData[analyticsKey]);
      })
      .join('&');

      return fetch('https://www.google-analytics.com/collect', {
        method: 'post',
        body: payloadString
      });
    })
    .then(response => {
      if (!response.ok) {
        return response.text()
        .then(responseText => {
          throw new Error(
            `Bad response from Google Analytics ` +
            `[${response.status}] ${responseText}`);
        });
      }
    })
    .catch(err => {
      console.warn('Unable to send the analytics event', err);
    });
  }
}

if (typeof self !== 'undefined') {
  self.analytics = new Analytics();
}
