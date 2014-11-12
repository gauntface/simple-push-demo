// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

suite('View Controller', function() {

  var testDiv;

  setup(function() {
    testDiv = document.body.appendChild(document.createElement('div'));
    testDiv.id = 'testDiv';
  });

  teardown(function() {
    document.body.removeChild(testDiv);
  });

  function dispatchEvent(type, target) {
    var event = document.createEvent('Event');
    event.initEvent(type, true, false);
    target.dispatchEvent(event);
  }

  function createTestHtml(s) {
    var div = document.getElementById('testDiv');
    div.innerHTML = s;

    Array.prototype.forEach.call(div.querySelectorAll('template'), function(t) {
      HTMLTemplateElement.decorate(t);
    });
  }

  test('Basic', function() {
    var ctorCount = 0;
    var clickCount = 0;
    var expectName = '';

    function Controller(root) {
      ctorCount++;
      this.model = [
        { name: 'one' },
        { name: 'two' },
        { name: 'three' }
      ];
    }
    Controller.prototype = {
      handleClick: function(item, e) {
        assert.strictEqual(expectName, item.name);
        clickCount++;
      }
    }
    window.Controller = Controller;

    createTestHtml('<ul data-controller="Controller">' +
                     '<template repeat>' +
                       '<li data-action="click:handleClick">{{ name }}</li>' +
                     '</template>' +
                   '</ul>');

    Platform.performMicrotaskCheckpoint();
    var thirdInstance =
        document.getElementById('testDiv').childNodes[0].childNodes[3];
    expectName = 'three';
    assert.strictEqual(expectName, thirdInstance.textContent);
    dispatchEvent('click', thirdInstance);
    assert.strictEqual(1, clickCount);

    var secondInstance =
        document.getElementById('testDiv').childNodes[0].childNodes[2];
    expectName = 'two';
    assert.strictEqual(expectName, secondInstance.textContent);
    dispatchEvent('click', secondInstance);
    assert.strictEqual(2, clickCount);

    assert.strictEqual(1, ctorCount);
  });

  test('Named argument', function() {
    var ctorCount = 0;
    var clickCount = 0;
    var expectName = '';

    function Controller(root) {
      ctorCount++;
      this.model = {foo: 1, bar: 2};
    }
    Controller.prototype = {
      handleClick: function(value) {
        assert.strictEqual(2, value);
        clickCount++;
      }
    }
    window.Controller = Controller;

    createTestHtml('<ul data-controller="Controller">' +
                     '<template bind>' +
                       '<li data-action="click:handleClick(bar)">' +
                           '{{ foo }}</li>' +
                     '</template>' +
                   '</ul>');

    Platform.performMicrotaskCheckpoint();
    var firstInstance =
        document.getElementById('testDiv').firstChild.firstChild.nextSibling;
    expectName = 'three';
    assert.strictEqual('1', firstInstance.textContent);
    dispatchEvent('click', firstInstance);
    assert.strictEqual(1, clickCount);
  });
});
