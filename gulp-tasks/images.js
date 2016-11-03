/**
 *
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const gulp = require('gulp');
const del = require('del');
const imagemin = require('gulp-imagemin');

gulp.task('images:watch', function() {
  gulp.watch(global.config.src + '/images/**/*.*',
    ['images', global.config.browserSyncReload]);
});

gulp.task('images:clean', function(cb) {
  del([global.config.dest + '/*.{png,jpg,jpeg,gif,svg}'], {dot: true})
    .then(function() {
      cb();
    });
});

gulp.task('images', ['images:clean'], function() {
  let stream = gulp.src(global.config.src + '/**/*.{png,jpg,jpeg,gif,svg}');

  if (global.config.env === 'prod') {
    stream = stream.pipe(imagemin({
      progressive: true,
      interlaced: true,
      svgoPlugins: [{removeViewBox: false}],
    }));
  }

  return stream.pipe(gulp.dest(global.config.dest));
});
