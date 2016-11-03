/*
  Copyright 2016 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/* eslint-env node */

'use strict';

const gulp = require('gulp');
const path = require('path');
const TestServer = require('sw-testing-helpers').TestServer;
const runSequence = require('run-sequence');

gulp.task('test:manual', function() {
  const testServer = new TestServer();
  testServer.startServer(path.join(__dirname, '..'), 8888)
  .then((portNumber) => {
    console.log('http://localhost:' + portNumber);
  });

  runSequence(['watch']);
});
