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
const runSequence = require('run-sequence');
const babel = require('gulp-babel');

gulp.task('scripts:watch', function() {
  gulp.watch(global.config.src + '/**/*.js',
    ['scripts', global.config.browserSyncReload]);
});

gulp.task('scripts:copy', ['scripts:clean'], () => {
  return gulp.src([
    global.config.src + '/**/*.js',
  ])
  .pipe(babel({
    presets: ['es2015'],
  }))
  .pipe(gulp.dest(global.config.dest));
});

// Delete any files currently in the scripts destination path
gulp.task('scripts:clean', function(cb) {
  del([global.config.dest + '/**/*.js'], {dot: true})
    .then(function() {
      cb();
    });
});

gulp.task('scripts', function(cb) {
  runSequence(
    'scripts:copy',
    cb
  );
});
