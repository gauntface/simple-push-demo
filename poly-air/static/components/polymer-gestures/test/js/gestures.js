/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

suite('Platform Events', function() {
  var finger, inner, outer;

  setup(function() {
    finger = new Fake();
    outer = document.createElement('div');
    outer.style.cssText = 'height: 100px; width: 100px; background: orange; position: absolute; top: 0; left: 0;';
    inner = document.createElement('div');
    inner.style.cssText = 'height: 50px; width: 50px; background: blue; top: 25px; left: 25px; position: relative;';
    outer.appendChild(inner);
    document.body.appendChild(outer);
  });
  teardown(function() {
    outer.parentNode.removeChild(outer);
  });

  suite('Gesture Events', function() {
    suite('Down and Up', function() {
      test('down gesture has expected api', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(document, 'down', test);
          assert.isTrue(ev.isPrimary);
          assert.equal(ev.buttons, 1);
          assert.equal(ev.pointerId, 1);
          assert.property(ev, '_source');
          assert.isFunction(ev.preventTap);
          assert.equal(ev.target, inner, 'target incorrect');
          done();
        }
        PolymerGestures.addEventListener(document, 'down', test);
        finger.downOnNode(inner);
      });

      test('up gesture has expected api', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(document, 'up', test);
          assert.isTrue(ev.isPrimary);
          assert.propertyVal(ev, 'buttons', 0);
          assert.propertyVal(ev, 'pointerId', 1);
          assert.property(ev, '_source');
          assert.property(ev, 'x');
          assert.property(ev, 'y');
          assert.isFunction(ev.preventTap);
          assert.equal(ev.target, inner, 'target incorrect');
          assert.equal(ev.relatedTarget, outer, 'relatedTarget incorrect');
          done();
        }
        PolymerGestures.addEventListener(document, 'up', test);
        finger.downOnNode(inner, function() {
          finger.upOnNode(outer, 1, 1);
        });
      });
    });

    suite('Tap', function() {
      test('tap has expected api', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(document, 'tap', test);
          assert.property(ev, 'x');
          assert.property(ev, 'y');
          assert.property(ev, 'detail');
          assert.propertyVal(ev, '_source', 'tap');
          done();
        }
        PolymerGestures.addEventListener(document, 'tap', test);
        finger.downOnNode(inner, function() {
          finger.upOnNode(inner);
        });
      });

      test('tap dispatches to a common ancestor of down and up', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(outer, 'tap', test);
          assert.equal(ev.target, outer);
          done();
        }
        PolymerGestures.addEventListener(outer, 'tap', test);
        finger.downOnNode(inner, function() {
          finger.upOnNode(outer, 1, 1);
        });
      });

      test('preventTap works on down', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(inner, 'tap', test);
          assert.fail();
        }
        function prevent(ev) {
          PolymerGestures.removeEventListener(inner, 'down', prevent);
          ev.preventTap();
        }
        PolymerGestures.addEventListener(inner, 'down', prevent);
        PolymerGestures.addEventListener(inner, 'tap', test);
        finger.downOnNode(inner, function() {
          finger.upOnNode(inner, function() {
            setTimeout(done, 100);
          });
        });
      });

      test('preventTap works on up', function(done) {
        function test(ev) {
          PolymerGestures.removeEventListener(inner, 'tap', test);
          assert.fail();
        }
        function prevent(ev) {
          PolymerGestures.removeEventListener(inner, 'up', prevent);
          ev.preventTap();
        }
        PolymerGestures.addEventListener(inner, 'up', prevent);
        PolymerGestures.addEventListener(inner, 'tap', test);
        finger.downOnNode(inner, function() {
          finger.upOnNode(inner, function() {
            setTimeout(done, 100);
          });
        });
      });

      test('tap works on svg', function(done) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', '10');
        circle.setAttribute('cx', '50');
        circle.setAttribute('cy', '50');
        circle.setAttribute('fill', 'black');
        svg.appendChild(circle);
        inner.appendChild(svg);
        function test(ev) {
          done();
        }
        PolymerGestures.addEventListener(circle, 'tap', test);
        finger.downOnNode(circle, function() {
          finger.upOnNode(circle);
        });
      });
    });

    /* suite.skip('Hold, Holdpulse, and Release', function() {
      test.skip('hold/holdpulse/release has expected api', function(done) {
      });

      test.skip('hold/holdpulse/release can prevent tap', function(done) {
      });

      test.skip('hold fires after 200ms', function(done) {
      });

      test.skip('holdpulse fires on 200ms loop', function(done) {
      });

      test.skip('release fires after holding', function(done) {
      });

      test.skip('sloppy hold is ok', function(done) {
      });
    });

    suite.skip('Trackstart, Track, Trackx, Tracky, Trackend', function() {
      test.skip('trackstart/track/trackend has expected api', function(done) {
      });

      test.skip('trackstart/track/trackx/tracky/trackend can prevent tap', function(done) {
      });

      test.skip('trackx has expected api', function(done) {
      });

      test.skip('tracky has expected api', function(done) {
      });

      test.skip('track sets touch-action: none', function(done) {
      });

      test.skip('trackx sets touch-action: pan-y', function(done) {
      });

      test.skip('tracky sets touch-action: pan-x', function(done) {
      });
    }); */
  });
});
