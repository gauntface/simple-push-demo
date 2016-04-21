/**
 *
 *  Web Starter Kit
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
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const browserify = require('browserify');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');
const path = require('path');
const glob = require('glob');
const del = require('del');
const eslint = require('gulp-eslint');
const runSequence = require('run-sequence');

function bundleJS(fullFilePath) {
  const browserifyBundles = browserify({
    entries: fullFilePath
  });

  // Rollupify reduces the size of the final output but increases build
  // time to do it so enable for production build only
  if (GLOBAL.config.env === 'prod') {
    browserifyBundles.transform('rollupify');
  }

  let stream = browserifyBundles
  .transform('babelify', {presets: ['es2015']})
  .bundle()
  // `source` Converts Browserify's Node Stream to a Gulp Stream
  // Use path.relative to make the file have the correct home in `dest`
  .pipe(
    source(path.join('.', path.relative(GLOBAL.config.src, fullFilePath)))
  )
  .pipe(buffer())
  .pipe(sourcemaps.init());

  if (GLOBAL.config.env === 'prod') {
    stream = stream.pipe(uglify());
  }

  return stream.pipe(sourcemaps.write('.'))
  .pipe(gulp.dest(GLOBAL.config.dest));
}

function build() {
  const globResponse = glob.sync(GLOBAL.config.src + '/**/*.js', {
    dot: false
  });

  const buildPromise = globResponse.reduce((promise, filePath) => {
    return promise.then(() => {
      return new Promise((resolve, reject) => {
        bundleJS(filePath)
        .on('error', reject)
        .on('end', () => resolve());
      });
    });
  }, Promise.resolve());

  return buildPromise;
}

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

gulp.task('scripts:transpile', function() {
  return build();
});

gulp.task('scripts', function(cb) {
  runSequence(
    [
      'scripts:clean',
      'scripts:eslint'
    ],
    [
      'scripts:transpile'
    ],
    cb
  );
});
