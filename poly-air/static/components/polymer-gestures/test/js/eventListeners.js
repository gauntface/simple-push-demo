/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

suite('Gesture Dependencies', function() {
  var d = PolymerGestures.dispatcher;
  var dm = d.dependencyMap;
  var g = d.gestures;

  test('Down and Up are sentinel dependencies', function() {
    assert.deepPropertyVal(dm, 'down.index', -1);
    assert.deepPropertyVal(dm, 'up.index', -1);
  });
  test('Tap dependency', function() {
    var tap = dm.tap;
    assert.ok(tap);
    assert.isObject(d.gestures[tap.index]);
  });
  test('Hold', function() {
    var h = dm.hold;
    var hp = dm.holdpulse;
    var r = dm.release;
    assert.property(h, 'index');
    assert.property(hp, 'index');
    assert.property(r, 'index');
    assert(h.index === hp.index && hp.index === r.index, 'hold gestures should have the same recognizer');
    assert.isObject(d.gestures[h.index]);
  });
  test('track', function() {
    var track = dm.track;
    var trackstart = dm.trackstart;
    var trackend = dm.trackend;
    var trackx = dm.trackx;
    var tracky = dm.tracky;
    assert.property(track, 'index');
    assert.property(trackstart, 'index');
    assert.property(trackend, 'index');
    assert.property(trackx, 'index');
    assert.property(tracky, 'index');
    var expected = [];
    for (var i = 0; i < 5; i++) {
      expected.push(track.index);
    }
    assert.isObject(d.gestures[track.index]);
    assert.deepEqual([track.index, trackstart.index, trackend.index, trackx.index, tracky.index], expected, 'track gestures should have the same recognizer');
  });
});

suite('Event Listeners', function() {
  var work;
  setup(function() {
    work = document.createElement('div');
    document.body.appendChild(work);
  });
  teardown(function() {
    document.body.removeChild(work);
  });

  suite('addEventListener', function() {
    test('full API of native addEventListener', function() {
      var args;
      work.addEventListener = function() {
        args = [].slice.call(arguments);
      };
      var handler = function(){};
      PolymerGestures.addEventListener(work, 'foo', handler, true);
      assert.deepEqual(args, ['foo', handler, true]);
    });

    test('nodes store gesture information', function() {
      PolymerGestures.addEventListener(work, 'tap', function(){});
      assert.deepPropertyVal(work, '._pgEvents.tap', 1);
      PolymerGestures.addEventListener(work, 'tap', function(){});
      assert.deepPropertyVal(work, '._pgEvents.tap', 2);
    });

    test('other events are added', function() {
      var worked = false;
      var fn = function(){ worked = true; };
      PolymerGestures.addEventListener(work, 'test', fn);
      var ev = document.createEvent('Event');
      ev.initEvent('test', true, true);
      work.dispatchEvent(ev);
      assert.isTrue(worked);
    });
  });

  suite('removeEventListener', function() {
    test('full API of native', function() {
      var args;
      work.removeEventListener = function() {
        args = [].slice.call(arguments);
      };
      var handler = function(){};
      PolymerGestures.removeEventListener(work, 'foo', handler, true);
      assert.deepEqual(args, ['foo', handler, true]);
    });

    test('remove node gesture information', function() {
      var fn = function(){};
      PolymerGestures.addEventListener(work, 'tap', fn);
      assert.deepPropertyVal(work, '._pgEvents.tap', 1);
      PolymerGestures.removeEventListener(work, 'tap', fn);
      assert.deepPropertyVal(work, '._pgEvents.tap', 0);
    });

    test('other events are removed', function() {
      var worked = 0;
      var fn = function(){ worked++; };
      PolymerGestures.addEventListener(work, 'test', fn);
      var ev = document.createEvent('Event');
      ev.initEvent('test', true, true);
      work.dispatchEvent(ev);
      assert.equal(worked, 1);
      PolymerGestures.removeEventListener(work, 'test', fn);
      ev = document.createEvent('Event');
      ev.initEvent('test', true, true);
      work.dispatchEvent(ev);
      assert.equal(worked, 1);
    });

    test('document keeps mouse event listeners, always', function(done) {
      var finger = new Fake();
      work.style.cssText = 'height: 50px; width: 50px;';
      var found = 0;
      var fn = function(ev) {
        found++;
      };
      // down should always trigger from mouse on document
      document.addEventListener('down', fn);
      PolymerGestures.addEventListener(document, 'tap', fn);
      PolymerGestures.removeEventListener(document, 'tap', fn);
      finger.downOnNode(work, function() {
        finger.upOnNode(work, function() {
          assert.equal(found, 1);
          done();
        });
      });
    });
  });
});
