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
const cleanCSS = require('gulp-clean-css');
const autoprefixer = require('gulp-autoprefixer');
const sourcemaps = require('gulp-sourcemaps');
const license = require('gulp-license');

const AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10',
];

gulp.task('styles:watch', function() {
  gulp.watch(global.config.src + '/**/*.css',
    ['styles', global.config.browserSyncReload]);
});

// Delete any files currently in the scripts destination path
gulp.task('styles:clean', function(cb) {
  del([global.config.dest + '/**/*.css'], {dot: true})
    .then(function() {
      cb();
    });
});

gulp.task('styles:css', function() {
  let stream = gulp.src(global.config.src + '/**/*.css');

  if (global.config.env !== 'prod') {
    // Only create sourcemaps for dev
    stream = stream.pipe(sourcemaps.init());
  }

  stream = stream.pipe(autoprefixer(AUTOPREFIXER_BROWSERS));

  if (global.config.env !== 'prod') {
    // Only create sourcemaps for dev
    stream = stream.pipe(cleanCSS())
      .pipe(license(global.config.license, global.config.licenseOptions))
      .pipe(sourcemaps.write());
  }

  return stream.pipe(gulp.dest(global.config.dest));
});

gulp.task('styles', function(cb) {
  runSequence(
    'styles:clean',
    'styles:css',
    cb
  );
});
