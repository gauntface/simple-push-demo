var gulp = require('gulp');
var browserSync = require('browser-sync').create();

// Static server
gulp.task('browsersync', function() {
    browserSync.init({
        server: {
            baseDir: GLOBAL.config.dest
        }
    });
});
