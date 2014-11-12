/*
 * @license
 * Copyright (c) 2014 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-karma');

  var sourceFiles = grunt.file.readJSON('build.json');
  var banner = grunt.file.read('banner.txt');
  var toolsPath = '../tools/';

  grunt.initConfig({
    concat: {
      polymergestures: {
        options: {
          stripBanners: true,
          banner: banner
        },
        nonull: true,
        src: sourceFiles,
        dest: 'polymergestures.dev.js'
      }
    },
    uglify: {
      polymergestures: {
        options: {
          banner: banner
        },
        nonull: true,
        dest: 'polymergestures.min.js',
        src: sourceFiles
      }
    },
    karma: {
      options: {
        configFile: 'conf/karma.conf.js',
        keepalive: true
      },
      polymergestures: {
      },
      buildbot: {
        reporters: 'crbot',
        logLevel: 'OFF'
      }
    }
  });

  grunt.loadTasks(toolsPath + 'tasks');
  grunt.registerTask('default', ['concat', 'uglify']);
  grunt.registerTask('test', ['override-chrome-launcher', 'karma:polymergestures']);
  grunt.registerTask('test-buildbot', ['override-chrome-launcher', 'karma:buildbot']);
};
