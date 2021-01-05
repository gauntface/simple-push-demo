'use strict';

/* eslint-env browser, serviceworker */

/* globals idbKeyval */

// Make use of Google Analytics Measurement Protocol.
// https://developers.google.com/analytics/devguides/collection/protocol/v1/reference
class Analytics {
  async trackEvent(eventAction, eventValue, optionalParams) {
    if (!this.trackingId) {
      console.error('You need to set a trackingId, for example:');
      console.error('self.analytics.trackingId = \'UA-XXXXXXXX-X\';');

      // We want this to be a safe method, so avoid throwing Unless
      // It's absolutely necessary.
      return;
    }

    if (typeof eventAction === 'undefined' &&
      typeof eventValue === 'undefined') {
      console.warn('sendAnalyticsEvent() called with no eventAction or ' +
      'eventValue.');
      return;
    }

    try {
      let clientId = await this.getClientID();
      if (!clientId) {
        const subscription = await self.registration.getSubscription();
        if (!subscription) {
          throw new Error('No Google Analytics Client ID and No ' +
            'Push subscription.');
        }

        clientId = subscription.endpoint;
      }


      const payloadData = {
        // Version Number
        v: 1,
        // Client ID
        cid: clientId,
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
        ev: eventValue,
      };

      if (optionalParams) {
        Object.keys(optionalParams).forEach((key) => {
          payloadData[key] = optionalParams[key];
        });
      }

      const payloadString = Object.keys(payloadData)
          .filter((analyticsKey) => {
            return payloadData[analyticsKey];
          })
          .map((analyticsKey) => {
            return `${analyticsKey}=` +
              encodeURIComponent(payloadData[analyticsKey]);
          })
          .join('&');

      const response = await fetch('https://www.google-analytics.com/collect', {
        method: 'post',
        body: payloadString,
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
            `Bad response from Google Analytics ` +
            `[${response.status}] ${responseText}`);
      }
    } catch (err) {
      console.warn('Unable to send the analytics event', err);
    }
  }

  getClientID() {
    return idbKeyval.get('google-analytics-client-id')
        .catch(() => {
          return null;
        });
  }
}

if (typeof self !== 'undefined') {
  self.analytics = new Analytics();
}
