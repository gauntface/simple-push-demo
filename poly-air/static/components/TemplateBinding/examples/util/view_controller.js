// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

(function() {
  var CONTROLLER_ATTRIBUTE = 'data-controller';
  var CONTROLLER_SELECTOR = '*[' + CONTROLLER_ATTRIBUTE + ']';

  var ACTION_ATTRIBUTE = 'data-action';
  var ACTION_SELECTOR = '*[' + ACTION_ATTRIBUTE + ']';

  var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

  function bindController(node) {
    if (node.nodeType !== Node.ELEMENT_NODE)
      return;

    var controllerClass = node.getAttribute(CONTROLLER_ATTRIBUTE);
    if (!controllerClass ||
        !this[controllerClass] ||
        typeof this[controllerClass] != 'function') {
      return;
    }

    var controller = new this[controllerClass](node);
    if (controller.model) {
      HTMLTemplateElement.forAllTemplatesFrom_(node, function(t) {
        t.model = controller.model;
      });
    }
    node.controller = controller;
  }

  var registeredEvents = {};

  var actionPattern = /(\w*)\s*:\s*(\w*)(\(([\w\.\$]*)\)){0,1}/;

  function getAction(node) {
    if (node.nodeType !== Node.ELEMENT_NODE)
      return;

    var actionText = node.getAttribute(ACTION_ATTRIBUTE);
    if (!actionText)
      return;
    var match = actionText.match(actionPattern);
    if (!match)
      return;

    return {
      eventType: match[1],
      name: match[2],
      path: match[4]
    }
  }

  function registerAction(node) {
    var action = getAction(node);
    if (!action)
      return;
    if (registeredEvents[action.eventType])
      return;

    document.addEventListener(action.eventType, handleAction, false);
    registeredEvents[action.eventType] = true;
  }

  document.addEventListener('DOMContentLoaded', function(e) {
    var controllerElements = document.querySelectorAll(CONTROLLER_SELECTOR);
    forEach(controllerElements, bindController);

    var actionElements = document.querySelectorAll(ACTION_SELECTOR);
    forEach(actionElements, registerAction);

    // Controller constructors may have bound data.
    Platform.performMicrotaskCheckpoint();
  }, false);

  document.addEventListener('DOMNodeInserted', function(e) {
    if (e.target.nodeType !== Node.ELEMENT_NODE)
      return;
    bindController(e.target);
    registerAction(e.target);
  }, false);

  function handleAction(e) {
    var action;
    var currentTarget = e.target;
    while (!action && currentTarget) {
      action = getAction(currentTarget);
      if (!action)
        currentTarget = currentTarget.parentNode;
    }

    var handled = false;
    while (!handled && currentTarget) {
      if (!currentTarget.controller ||
          !currentTarget.controller[action.name] ||
          typeof currentTarget.controller[action.name] != 'function') {
        currentTarget = currentTarget.parentNode;
        continue;
      }

      var func = currentTarget.controller[action.name];
      var model;
      var templateInstance = e.target.templateInstance;
      if (templateInstance) {
        model = templateInstance.model;
        if (action.path)
          model = PathObserver.getValueAtPath(model, action.path);
      }

      func.call(currentTarget.controller, model, e);
      handled = true;
    }

    if (handled)
      Platform.performMicrotaskCheckpoint();
    else
      console.error('Error: unhandled action', action, e);
  }
})();
