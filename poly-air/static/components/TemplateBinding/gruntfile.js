// Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
// This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
// The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
// The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
// Code distributed by Google as part of the polymer project is also
// subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

module.exports = function(grunt) {

  grunt.initConfig({
    'wct-test': {
      local: {
        options: {remote: false},
      },
      'local-min': {
        options: {remote: false, webRunner: 'test/index.html?build=min'},
      },
      remote: {
        options: {remote: true},
      },
      'remote-min': {
        options: {remote: true, webRunner: 'test/index.html?build=min'},
      },
    },
    concat: {
      modules: {
        src: grunt.file.readJSON('build.json'),
        dest: 'TemplateBinding.min.js',
        nonull: true
      }
    }
  });

  grunt.loadTasks('../tools/tasks');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('web-component-tester');

  grunt.registerTask('default', 'concat');
  grunt.registerTask('test', ['wct-test:local']);
  grunt.registerTask('test-min', ['concat', 'wct-test:local-min']);
  grunt.registerTask('test-remote', ['wct-test:remote']);
  grunt.registerTask('test-remote-min', ['concat', 'wct-test:remote-min']);
  grunt.registerTask('test-buildbot', ['test-min']);
};
