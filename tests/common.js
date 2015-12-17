// Copyright 2015 Peter Beverloo. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

if (!Array.prototype.hasOwnProperty('includes')) {
  Array.prototype.includes = function(value) {
    for (var key in this) {
      if (this[key] == value)
        return true;
    }
    return false;
  };
}

if (!String.prototype.hasOwnProperty('padRight')) {
  String.prototype.padRight = function(length, character) {
    if (length <= this.length)
      return this;

    var string = this;
    for (var i = this.length; i < length; ++i)
      string += character;

    return string;
  }
}

// Returns the value of |element|.
function getElementValue(element) {
  switch (element.tagName) {
    case 'SELECT':
      var value = element.options[element.selectedIndex].value;
      if (value.indexOf(';') == 1)
        return value.substr(2);
      return value;
    case 'INPUT':
      return element.value;
  }

  return undefined;
}

// Displays a dialog with a copy of |contentElement|. Returns a promise that
// will be resolved when the dialog has been closed.
function DisplayDialog(contentElement) {
  return new Promise(function(resolve) {
    var overlayElement = document.createElement('div');
    overlayElement.className = 'dialog-overlay';

    contentElement.classList.remove('dialog-content');

    var dialogElement = document.createElement('div');
    dialogElement.className = 'dialog';

    dialogElement.appendChild(contentElement);

    document.body.appendChild(overlayElement);
    document.body.appendChild(dialogElement);

    overlayElement.addEventListener('click', function() {
      document.body.removeChild(dialogElement);
      document.body.removeChild(overlayElement);

      resolve();
    });
  });
}

// Base for features that have one or more requirements that have to be
// satisfied before the feature itself can be used.
function RequirementsBase(requirementsElement) {
  this.requirementsElement_ = requirementsElement;

  this.requirements_ = {};
  this.satisfied_ = {};
}

RequirementsBase.prototype.addRequirement = function(id, description) {
  if (this.satisfied_.hasOwnProperty(id))
    delete this.satisfied_[id];

  this.requirements_[id] = description;
  this.requirementsChanged();
};

RequirementsBase.prototype.satisfyRequirement = function(id) {
  if (!this.requirements_.hasOwnProperty(id))
    return;

  this.satisfied_[id] = this.requirements_[id];
  delete this.requirements_[id];

  this.requirementsChanged();
};

RequirementsBase.prototype.verifyRequirements = function() {
  var unsatisfiedRequirements = '';
  for (var id in this.requirements_)
    unsatisfiedRequirements += '- ' + this.requirements_[id] + '\n';

  if (!unsatisfiedRequirements.length)
    return true;

  alert(unsatisfiedRequirements);
  return false;
};

RequirementsBase.prototype.requirementsChanged = function() {
  var unsatisfiedRequirements = [];
  for (var id in this.requirements_)
    unsatisfiedRequirements.push(this.requirements_[id]);

  if (!unsatisfiedRequirements.length) {
    this.requirementsElement_.style.display = 'none';
    return;
  }

  this.requirementsElement_.style.display = 'block';

  // Remove all existing children from the requirements list.
  while (this.requirementsElement_.firstChild)
    this.requirementsElement_.removeChild(this.requirementsElement_.firstChild);

  // Add all requirements as new list items to the list.
  for (var i = 0; i < unsatisfiedRequirements.length; ++i) {
    var listItem = document.createElement('li');
    listItem.textContent = unsatisfiedRequirements[i];

    this.requirementsElement_.appendChild(listItem);
  }
};

// Base for features that can generate settings from one or more fields. The
// serialization, deserialization and registration of fields will be managed by
// the common code, whereas applying the fields will be done by the user.
function GeneratorBase(requirementsElement, element) {
  RequirementsBase.call(this, requirementsElement);

  this.element_ = element;

  this.fields_ = {};
  this.serialized_state_ = {};
}

GeneratorBase.prototype = Object.create(RequirementsBase.prototype);

GeneratorBase.FIELD_TYPE_STRING = 0;
GeneratorBase.FIELD_TYPE_BOOL = 1;
GeneratorBase.FIELD_TYPE_ARRAY = 2;
GeneratorBase.FIELD_TYPE_BUTTONS = 3;
GeneratorBase.FIELD_TYPE_TIME_OFFSET = 4;

GeneratorBase.SEPARATOR_FIELD = ';;';
GeneratorBase.SEPARATOR_VALUE = '=';

GeneratorBase.prototype.serialize = function(state) {
  var serialization = [];
  Object.keys(state).forEach(function(name) {
    var value = state[name].index !== undefined ? state[name].index
                                                : state[name].value;

    serialization.push(name + GeneratorBase.SEPARATOR_VALUE + value);
  });

  return serialization.join(GeneratorBase.SEPARATOR_FIELD);
};

GeneratorBase.prototype.deserialize = function(serialization) {
  if (!serialization.startsWith('#'))
    return;

  serialization = serialization.substr(1);

  var fields = serialization.split(GeneratorBase.SEPARATOR_FIELD),
      self = this;

  fields.forEach(function(field) {
    var valueIndex = field.indexOf(GeneratorBase.SEPARATOR_VALUE);
    if (valueIndex == -1)
      return;

    self.serialized_state_[field.substr(0, valueIndex)] =
        field.substr(valueIndex + 1);
  });
};

GeneratorBase.prototype.setFields = function(fields) {
  var self = this;
  Object.keys(fields).forEach(function(key) {
    var settings = fields[key];

    self.fields_[key] = {
      element: self.element_.querySelector('#' + settings[0]),
      elementCustom: self.element_.querySelector('#' + settings[0] + '_custom'),
      type: settings[1]
    };

    self.initializeField(key);
  });
};

GeneratorBase.prototype.initializeField = function(name) {
  var field = this.fields_[name],
      self = this;

  field.defaultValue = '';
  if (field.element.tagName == 'SELECT') {
    field.defaultValue =
        field.element.options[field.element.selectedIndex].getAttribute('data-id');
  } else if (field.element.type == 'checkbox') {
    field.defaultValue = field.element.checked;
  }

  // Listen for value changes so that the custom element can be displayed or
  // hidden on demand. (If the "custom" value is present in the field.)
  field.element.addEventListener('change', function() {
    if (!field.elementCustom)
      return;

    if (getElementValue(field.element) == 'custom')
      field.elementCustom.style.display = 'initial';
    else
      field.elementCustom.style.display = 'none';
  });

  var hasCustomValue = false;

  // If a deserialized value for this field has been stored, try to select the
  // intended value in the element.
  if (this.serialized_state_.hasOwnProperty(name)) {
    var value = this.serialized_state_[name];
    switch (field.element.tagName) {
      case 'INPUT':
        if (field.element.type == 'checkbox')
          field.element.checked = value === 'true' || value === '1';
        else
          field.element.value = value;
        break;
      case 'SELECT':
        if (option = field.element.querySelector('[data-id="' + value + '"]'))
          field.element.selectedIndex = option.index;
        else if (field.elementCustom) {
          if (option = field.element.querySelector('[data-custom]'))
            field.element.selectedIndex = option.index;

          field.elementCustom.value = value;
          hasCustomValue = true;
        }
        break;
    }
  }

  // Hide the custom element by default unless a value has been deserialized.
  if (field.elementCustom && !hasCustomValue)
    field.elementCustom.style.display = 'none';
};

GeneratorBase.prototype.getField = function(state, name, defaultValue) {
  if (!state.hasOwnProperty(name))
    return defaultValue;

  switch (state[name].type) {
    case GeneratorBase.FIELD_TYPE_ARRAY:
      if (!state[name].value.length)
        return defaultValue;

      var pattern = [];
      state[name].value.split(',').forEach(function(chunk) {
        pattern.push(parseInt(chunk, 10));
      });

      return pattern;
    case GeneratorBase.FIELD_TYPE_BUTTONS:
      if (!state[name].value.length)
        return defaultValue;

      var buttons = state[name].value.split(GeneratorBase.SEPARATOR_FIELD),
          actions = [];

      for (var index = 0; index < buttons.length; ++index) {
        actions.push({
          action: index,
          title: buttons[index]
        });
      }

      return actions;
    case GeneratorBase.FIELD_TYPE_TIME_OFFSET:
      if (!state[name].value.length)
        return defaultValue;

      var currentTime = Date.now(),
          givenTime = parseInt(state[name].value);

      return currentTime + givenTime;
    case GeneratorBase.FIELD_TYPE_BOOL:
      return !!state[name].value;
    case GeneratorBase.FIELD_TYPE_STRING:
      return state[name].value;
  }

  // This should never be reached, as the switch() handles all cases.
  return defaultValue;
};

GeneratorBase.prototype.resolveFieldState = function(name) {
  var field = this.fields_[name],
      index = undefined,
      value = undefined;

  switch (field.element.tagName) {
    case 'INPUT':
      if (field.element.type == 'checkbox')
        value = field.element.checked;
      else
        value = field.element.value;
      break;
    case 'SELECT':
      var option = field.element.options[field.element.selectedIndex];
      if (option.hasAttribute('data-custom') && field.elementCustom) {
        value = field.elementCustom.value;
      } else {
        index = option.index;
        value = option.value;
      }
      break;
  }

  return { index: index, value: value, type: field.type };
};

GeneratorBase.prototype.computeState = function(includeDefault) {
  var self = this,
      state = {};

  // Iterate over each of the fields and resolve their value.
  Object.keys(this.fields_).forEach(function(name) {
    var defaultValue = self.fields_[name].defaultValue,
        fieldState = self.resolveFieldState(name);

    if (((fieldState.index !== undefined && fieldState.index == defaultValue) ||
         (fieldState.value == defaultValue)) && !includeDefault)
      return;

    // TODO: Check for the default value if |includeDefault|.
    state[name] = fieldState;
  });

  return state;
};

// Base class for notification generators, e.g. the Push API and the Notification
// API. Will automatically register the common requirements.
function NotificationGeneratorBase(requirementsElement, element, serviceWorker) {
  GeneratorBase.call(this, requirementsElement, element);

  this.serviceWorker_ = serviceWorker;

  this.addRequirement(NotificationGeneratorBase.REQUIREMENT_PERMISSION,
                      'Requires permission to display notifications.');
  this.addRequirement(NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER,
                      'Requires the Service Worker to be registered.');
}

NotificationGeneratorBase.prototype = Object.create(GeneratorBase.prototype);

NotificationGeneratorBase.REQUIREMENT_PERMISSION = 1000;
NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER = 1001;

NotificationGeneratorBase.prototype.registerServiceWorker = function(scope) {
  navigator.serviceWorker.register(scope + this.serviceWorker_, { scope: scope }).catch(function(error) {
    console.error('Unable to register the service worker: ' + error);
  });

  var self = this;
  return navigator.serviceWorker.ready.then(function(serviceWorker) {
    self.satisfyRequirement(NotificationGeneratorBase.REQUIREMENT_SERVICE_WORKER);
    return serviceWorker;
  });
};

NotificationGeneratorBase.prototype.requestPermission = function() {
  var self = this;
  Notification.requestPermission(function(status) {
    if (status == 'granted')
      self.satisfyRequirement(NotificationGeneratorBase.REQUIREMENT_PERMISSION);
  });
};
