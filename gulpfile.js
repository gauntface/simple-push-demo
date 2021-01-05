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

global.config = {
  env: 'prod',
  src: 'src',
  dest: 'build',
  license: 'Apache',
  licenseOptions: {
    organization: 'Google Inc. All rights reserved.',
  },
};

const gulp = require('gulp');
require('./gulp-tasks/clean');
require('./gulp-tasks/copy');
require('./gulp-tasks/html');
require('./gulp-tasks/images');
require('./gulp-tasks/scripts');
require('./gulp-tasks/styles');

gulp.task('default', gulp.series(
    'clean',
    'styles',
    'scripts',
    'copy',
    'html',
    'images',
));

require('./gulp-tasks/browsersync');
require('./gulp-tasks/watch');
require('./gulp-tasks/test');

gulp.task('dev', gulp.series(
    async () => global.config.env = 'dev',
    'default',
    'watch',
    'browsersync',
));
