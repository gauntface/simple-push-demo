/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

(function(scope) {
  function extract(args) {
    var remain = [];
    var callback = function(){};
    for (var i = 0; i < args.length; i++) {
      if (args[i] instanceof Function) {
        callback = args[i];
        break;
      } else {
        remain.push(args[i]);
      }
    }
    remain.callback = callback;
    return remain;
  }

  function testNewMouse() {
    var has = false;
    try {
      has = Boolean(new MouseEvent('x'));
    } catch(_){}
    return has;
  }

  var HAS_MS = Boolean(navigator.msPointerEnabled);
  var HAS_POINTER = Boolean(navigator.pointerEnabled);
  var HAS_NEW_MOUSE = !HAS_MS && !HAS_POINTER && testNewMouse();

  function Fake() {}

  Fake.prototype = {
    targetAt: function(x, y) {
      return PolymerGestures.targetFinding.searchRoot(document, x, y);
    },
    middleOfNode: function(node) {
      var bcr = node.getBoundingClientRect();
      return {y: bcr.top + (bcr.height / 2), x: bcr.left + (bcr.width / 2)};
    },
    topLeftOfNode: function(node) {
      var bcr = node.getBoundingClientRect();
      return {y: bcr.top, x: bcr.left};
    },
    makeEvent: function(type, x, y) {
      var e;
      var props = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        buttons: type === 'up' ? 0 : 1,
        pointerId: 1,
        isPrimary: true,
        pointerType: 'mouse'
      };
      if (HAS_POINTER) {
        e = PolymerGestures.eventFactory.makePointerEvent('pointer' + type, props);
      } else if (HAS_MS) {
        var cap = type.slice(0, 1).toUpperCase() + type.slice(1);
        e = PolymerGestures.eventFactory.makePointerEvent('MSPointer' + cap, props);
      } else {
        if (HAS_NEW_MOUSE) {
          e = new MouseEvent('mouse' + type, props);
        } else {
          e = document.createEvent('MouseEvent');
          e.initMouseEvent('mouse' + type, true, true, null, null, 0, 0, x, y, false, false, false, false, 0, null);
        }
      }
      return e;
    },
    downOnNode: function() {
      var args = extract(arguments);
      var done = args.callback;
      var node = args[0], offsetX = args[1] || 0, offsetY = args[2] || 0;
      var xy;
      if (offsetX === 0 && offsetY === 0) {
        xy = this.middleOfNode(node);
      } else {
        xy = this.topLeftOfNode(node);
      }
      this.downAt(xy.x + offsetX, xy.y + offsetY, done);
    },
    downAt: function(x, y, done) {
      done = done || function(){};
      this.x = x | 0;
      this.y = y | 0;
      this.target = this.targetAt(x, y);
      var e = this.makeEvent('down', x, y);
      this.target.dispatchEvent(e);
      done();
    },
    moveToNode: function() {
      var args = extract(arguments);
      var done = args.callback;
      var node = args[0], offsetX = args[1] || 0, offsetY = args[2] || 0, step = args[3] || 0;
      var xy;
      if (offsetX === 0 && offsetY === 0) {
        xy = this.middleOfNode(node);
      } else {
        xy = this.topLeftOfNode(node);
      }
      this.moveTo(xy.x + offsetX, xy.y + offsetY, step, done);
    },
    move: function() {
      var args = extract(arguments);
      var done = args.callback;
      var x = args[0] || 0, y = args[1] || 0, step = args[2] || 0;
      this.moveTo(this.x + x, this.y + y, step, done);
    },
    moveTo: function() {
      var args = extract(arguments);
      var done = args.callback;
      if (!this.target) {
        return done();
      }
      var x = args[0] || 0, y = args[1] || 0, step = args[2] || 0;
      x = x | 0;
      y = y | 0;
      step = step || 5;
      var dx = Math.floor((x - this.x) / step);
      var dy = Math.floor((y - this.y) / step);
      var curX = this.x, curY = this.y;
      var self = this;
      requestAnimationFrame(function fn() {
        var e;
        if (step > 0) {
          e = self.makeEvent('move', curX, curY);
          self.target.dispatchEvent(e);
          curX = Math.round(curX + dx);
          curY = Math.round(curY + dy);
          requestAnimationFrame(fn);
          step--;
        } else {
          self.x = x;
          self.y = y;
          e = self.makeEvent('move', x, y);
          self.target.dispatchEvent(e);
          done();
        }
      });
    },
    upOnNode: function() {
      var args = extract(arguments);
      var done = args.callback;
      var node = args[0], offsetX = args[1] || 0, offsetY = args[2] || 0;
      if (offsetX === 0 && offsetY === 0) {
        xy = this.middleOfNode(node);
      } else {
        xy = this.topLeftOfNode(node);
      }
      this.upAt(xy.x, xy.y, done);
    },
    upAt: function(x, y, done) {
      done = done || function(){};
      x = x | 0;
      y = y | 0;
      var self = this;
      this.moveTo(x, y, function() {
        var e = self.makeEvent('up', x, y);
        self.targetAt(x, y).dispatchEvent(e);
        done();
      });
    }
  };

  scope.Fake = Fake;
})(window);
