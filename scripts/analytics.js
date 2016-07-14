'use strict';

/* eslint-env browser, serviceworker */

// Make use of Google Analytics Measurement Protocol.
// https://developers.google.com/analytics/devguides/collection/protocol/v1/reference

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Analytics = function () {
  function Analytics() {
    _classCallCheck(this, Analytics);
  }

  _createClass(Analytics, [{
    key: 'trackEvent',
    value: function trackEvent(eventAction, eventValue) {
      var _this = this;

      if (!this.trackingId) {
        console.error('You need to set a trackingId, for example:');
        console.error('self.analytics.trackingId = \'UA-XXXXXXXX-X\';');

        // We want this to be a safe method, so avoid throwing Unless
        // It's absolutely necessary.
        return Promise.resolve();
      }

      if (!eventAction && !eventValue) {
        console.warn('sendAnalyticsEvent() called with no eventAction or ' + 'eventValue.');
        return Promise.resolve();
      }

      return self.registration.pushManager.getSubscription().then(function (subscription) {
        if (subscription === null) {
          // The user has not subscribed yet.
          throw new Error('No subscription currently available.');
        }

        var payloadData = {
          // Version Number
          v: 1,
          // Client ID
          cid: subscription.endpoint,
          // Tracking ID
          tid: _this.trackingId,
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

        var payloadString = Object.keys(payloadData).filter(function (analyticsKey) {
          return payloadData[analyticsKey];
        }).map(function (analyticsKey) {
          return analyticsKey + '=' + encodeURIComponent(payloadData[analyticsKey]);
        }).join('&');

        return fetch('https://www.google-analytics.com/collect', {
          method: 'post',
          body: payloadString
        });
      }).then(function (response) {
        if (!response.ok) {
          return response.text().then(function (responseText) {
            throw new Error('Bad response from Google Analytics ' + ('[' + response.status + '] ' + responseText));
          });
        }
      }).catch(function (err) {
        console.warn('Unable to send the analytics event', err);
      });
    }
  }]);

  return Analytics;
}();

if (typeof self !== 'undefined') {
  self.analytics = new Analytics();
}