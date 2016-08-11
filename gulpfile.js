var gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    browserify = require('browserify'),
    uglify = require('gulp-uglify');

gulp.task('browserify', function() {
  return browserify({
        entries: 'src/colu.js',
        insertGlobals : true,
        standalone: 'Colu',
        ignoreMissing: true,
        // Define FormData globally to prevent fallback to browser's FormData and thus fix IE crash
        insertGlobalVars: {
            FormData: function(file, dir) {
                return 'require("form-data")';
            }
        }
    })
    .bundle()
    .pipe(source('colu.client.js'))
    .pipe(buffer())
    // .pipe(uglify({ mangle: false }))
    .pipe(gulp.dest('client'));
});