/**
 *
 *  Copyright 2016 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */

'use strict';

const gulp = require('gulp');
const del = require('del');
const eslint = require('gulp-eslint');
const runSequence = require('run-sequence');
const babel = require('gulp-babel');

gulp.task('scripts:watch', function() {
  gulp.watch(GLOBAL.config.src + '/**/*.js',
    ['scripts', GLOBAL.config.browserSyncReload]);
  gulp.watch(['./.eslintrc', './.eslintignore'], ['scripts'])
    .on('change', function() {
      if (GLOBAL.config.browserSync) {
        GLOBAL.config.browserSync.reload();
      }
    });
});

gulp.task('scripts:copy', ['scripts:clean'], () => {
  return gulp.src([
    GLOBAL.config.src + '/**/*.js'
  ])
  .pipe(babel({
    presets: ['es2015']
  }))
  .pipe(gulp.dest(GLOBAL.config.dest));
});

gulp.task('scripts:eslint', function() {
  let stream = gulp.src([GLOBAL.config.src + '/**/*.js'])

    // eslint() attaches the lint output to the eslint property,
    // of the file object so it can be used by other modules.
    .pipe(eslint())

    // eslint.format() outputs the lint results to the console.
    // Alternatively use eslint.formatEach() (see Docs).
    .pipe(eslint.format());

  // To have the process exit with an error code (1) on
  // lint error, return the stream and pipe to failOnError last.
  if (GLOBAL.config.env === 'prod') {
    stream = stream.pipe(eslint.failOnError());
  }

  return stream;
});

// Delete any files currently in the scripts destination path
gulp.task('scripts:clean', function(cb) {
  del([GLOBAL.config.dest + '/**/*.js'], {dot: true})
    .then(function() {
      cb();
    });
});

gulp.task('scripts', function(cb) {
  runSequence(
    'scripts:eslint',
    'scripts:copy',
    cb
  );
});
