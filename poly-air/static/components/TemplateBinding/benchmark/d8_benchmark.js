// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

var console = {
  log: print,
  error: print
};

var requestAnimationFrame = function(callback) {
  callback();
}

var testDiv = document.createElement('div');
var width = 2;
var depth = 4;
var decoration = 8;
var instanceCount = 10;
var oneTime = false;
var compoundBindings = false;
var expressionCheckbox = false;
var bindingDensities = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1];

function benchmarkComplete(results) {
  console.log(JSON.stringify(results));
}

function updateStatus(b, variation, runCount) {
  console.log((100 * b.density) + '% binding density, ' + runCount + ' runs');
}

var benchmarks = bindingDensities.map(function(density) {
  return new MDVBenchmark(testDiv, density, width, depth, decoration,
                          instanceCount,
                          oneTime,
                          compoundBindings,
                          expressionCheckbox);
});

Benchmark.all(benchmarks, 0, updateStatus).then(benchmarkComplete);
