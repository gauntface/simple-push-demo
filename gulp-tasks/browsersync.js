var gulp = require('gulp');
var browserSync = require('browser-sync').create();

// Stash this in case other tasks want to use it
GLOBAL.config.browserSyncReload = browserSync.reload;

// Static server
gulp.task('browsersync', function() {
  browserSync.init({
    proxy: 'localhost:3000',
    port: 8080,
    open: false
  });
});
