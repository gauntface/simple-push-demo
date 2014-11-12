/*
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

suite('PointerMap', function() {
  var PointerMap = PolymerGestures.PointerMap;
  var p;
  setup(function() {
    p = new PointerMap();
  });

  test('PointerMap has Map API', function() {
    var keys = [
      'set',
      'get',
      'has',
      'delete',
      'pointers',
      'clear',
      'forEach'
    ];
    keys.forEach(function(k) {
      assert.property(PointerMap.prototype, k);
    });
  });
  test('PointerMap .set', function() {
    p.set(1, true);
    if (!window.Map || !(p instanceof Map)) {
      assert.lengthOf(p.keys, 1);
      assert.lengthOf(p.values, 1);
    }
    assert.equal(p.pointers(), 1);
  });
  test('PointerMap .get', function() {
    var p = new PointerMap();

  });
  test('PointerMap .pointers', function() {
    assert.isFunction(p.pointers);
    assert.equal(p.pointers(), 0);
    p.set(1, true);
    assert.equal(p.pointers(), 1);
    p.set(1, false);
    assert.equal(p.pointers(), 1);
  });
  test('PointerMap .has', function() {
    p.set(1, true);
    assert.isTrue(p.has(1));
    assert.isFalse(p.has(0));
  });
  test('PointerMap .delete', function() {
    p.set(1, true);
    p.set(2, false);
    assert.equal(p.pointers(), 2);
    p.delete(1);
    assert.equal(p.pointers(), 1);
    assert.isFalse(p.get(2));
  });
  test('PointerMap .clear', function() {
    p.set(1, true);
    p.clear();
    assert.equal(p.pointers(), 0);
  });
  test('PointerMap .forEach', function() {
    p.set(1, true);
    p.set(2, false);
    p.set(3, {});
    p.forEach(function(v, k, m) {
      assert.ok(k);
      assert.equal(p.get(k), v);
      // assert.equal(m, p);
    });
  });
});
