var gulp = require('gulp')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')
var browserify = require('browserify')
var babel = require('gulp-babel')

gulp.task('browserify', function () {
  return browserify({
    entries: 'src/colu.js',
    insertGlobals: true,
    standalone: 'Colu',
    ignoreMissing: true,
		// Define FormData globally to prevent fallback to browser's FormData and thus fix IE crash
    insertGlobalVars: {
      FormData: function (file, dir) {
        return 'require("form-data")'
      }
    },
    debug: true
  })
  .ignore('redis-parser')
  .ignore('mkpath')
  .bundle()
  .pipe(source('colu.client.js'))
  .pipe(buffer())
  // .pipe(uglify({ mangle: false }))
  .pipe(gulp.dest('client'))
})

gulp.task('babel', function () {
  return gulp.src('client/colu.client.js')
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest('client'))
})
