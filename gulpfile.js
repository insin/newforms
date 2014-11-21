var browserify = require('browserify')
var gulp = require('gulp')
var source = require('vinyl-source-stream')
var watchify = require('watchify')

var concat = require('gulp-concat')
var header = require('gulp-header')
var jshint = require('gulp-jshint')
var rename = require('gulp-rename')
var streamify = require('gulp-streamify')
var uglify = require('gulp-uglify')
var gutil = require('gulp-util')

var pkg = require('./package.json')
var dev = gutil.env.release ? '' : ' (dev build at ' + (new Date()).toUTCString() + ')'
var srcHeader = '/**\n\
 * newforms <%= pkg.version %><%= dev %> - https://github.com/insin/newforms\n\
 * MIT Licensed\n\
 */\n'

process.env.NODE_ENV = gutil.env.production ? 'production' : 'development'

var jsPath = './lib/*.js'
var jsEntryPoint = './lib/newforms.js'

// Lints the build modules dir
gulp.task('lint', function() {
  return gulp.src(jsPath)
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

function buildJS(watch) {
  var b = browserify(jsEntryPoint, {
    debug: !gutil.env.production
  , standalone: 'forms'
  , detectGlobals: false
  , cache: {}
  , packageCache: {}
  , fullPaths: true
  })
  // if (watch) {
  //   b = watchify(b)
  // }
  b.transform('browserify-shim')
  // b.on('update', rebundle)

  function rebundle() {
    var stream = b.bundle()
      .pipe(source('newforms.js'))
      .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
      .pipe(gulp.dest('./build'))

    if (gutil.env.production) {
      stream = stream
        .pipe(rename('newforms.min.js'))
        .pipe(streamify(uglify()))
        .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
        .pipe(gulp.dest('./build'))
    }

    return stream
  }

  return rebundle()
}

gulp.task('browserify-js', ['lint'], function() {
  return buildJS(false)
})

gulp.task('watchify-js', ['lint'], function() {
  return buildJS(true)
})

// Copies browser build to ./dist, renaming to include a version number suffix
gulp.task('dist', ['browserify-js'], function() {
  return gulp.src('./build/newforms*.js')
    .pipe(rename(function(path) {
       // As of 1.0, gulp-rename doesn't include .min as part of the extension,
       // so we need to use this custom rename function to insert the desired
       // suffix into the basename.
       path.basename = path.basename.replace(/(newforms)/, '$1-' + pkg.version)
     }))
    .pipe(gulp.dest('./dist'))
})

gulp.task('watch', function() {
  gulp.watch(jsPath, ['watchify-js'])
})

gulp.task('default', ['browserify-js', 'watch'])