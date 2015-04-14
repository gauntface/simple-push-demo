'use strict';

function UIHandler() {
  var enablePushSwitch = document.querySelector('.js-enable-push');
  var wrappedPushSwitch = new MaterialSwitch(document.querySelector('.wsk-js-switch'));

  var sendPushOptions = document.querySelector('.js-send-push-options');

  var xhrPushButton = document.querySelector('.js-xhr-button');
  new MaterialButton(xhrPushButton);

  this.getPushSwitchElement = function() {
    return enablePushSwitch;
  };

  this.getWrappedPushSwitch = function() {
    return wrappedPushSwitch;
  };

  this.getSendPushOptionsElement = function() {
    return sendPushOptions;
  };
}

UIHandler.prototype.showError = function(title, message) {
  var errorContainer = document.querySelector('.js-error-message-container');

  var titleElement = errorContainer.querySelector('.js-error-title');
  var messageElement = errorContainer.querySelector('.js-error-message');
  titleElement.innerHTML = title;
  messageElement.innerHTML = message;
  errorContainer.style.opacity = 1;

  var sendPushElement = this.getSendPushOptionsElement();
  sendPushElement.style.display = 'none';
};

UIHandler.prototype.showOnlyError = function() {
  var pushSwitchContainer = document.querySelector('.js-push-switch-container');
  pushSwitchContainer.style.display = 'none';
};

UIHandler.prototype.setPushChecked = function(isChecked) {
  console.log('Set Checked State = ' + isChecked);
  var pushSwitch = this.getPushSwitchElement();
  pushSwitch.checked = isChecked;
  this.getWrappedPushSwitch().onChange_();
};

UIHandler.prototype.setPushSwitchDisabled = function(isDisabled) {
  console.log('Set disabled State = ' + isDisabled);
  var pushSwitch = this.getPushSwitchElement();
  pushSwitch.disabled = isDisabled;
  this.getWrappedPushSwitch().onChange_();
};

UIHandler.prototype.showGCMPushOptions = function(show) {
  var pushOptionsElement = this.getSendPushOptionsElement();
  var opacity = show ? 1.0 : 0.0;
  pushOptionsElement.style.opacity = opacity;
};

window.addEventListener('load', function() {
  window.PushDemo = window.PushDemo || {};
  window.PushDemo.ui = new UIHandler();

  var event = new CustomEvent('UIReady');
  window.dispatchEvent(event);
});
