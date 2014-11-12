/*
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

module.exports = function(karma) {
  var common = require('../../tools/test/karma-common.conf.js');
  karma.set(common.mixin_common_opts(karma, {
    // base path, that will be used to resolve files and exclude
    basePath: '../../',

    // list of files / patterns to load in the browser
    files: [
      'polymer-expressions/node_modules/chai/chai.js',
      'polymer-expressions/conf/mocha.conf.js',
      'TemplateBinding/load.js',
      'polymer-expressions/third_party/esprima/esprima.js',
      'polymer-expressions/src/polymer-expressions.js',
      'polymer-expressions/tests/tests.js',
      {pattern: 'NodeBind/src/*.js', included: false},
      {pattern: 'TemplateBinding/src/*.css', included: false},
      {pattern: 'TemplateBinding/src/*.js', included: false},
      {pattern: 'observe-js/src/*.js', included: false}
    ]
  }));
};
