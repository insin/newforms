var browserify = require('browserify')
var gulp = require('gulp')
var source = require('vinyl-source-stream')
var watchify = require('watchify')

var concat = require('gulp-concat')
var header = require('gulp-header')
var jshint = require('gulp-jshint-cached')
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

var jsPath = './lib/*.js'
var jsEntryPoint = './lib/newforms.js'

// Lints the build modules dir
gulp.task('lint', function() {
  return gulp.src(jsPath)
    .pipe(jshint.cached('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

function buildJS(watch) {
  var bundler = (watch ? watchify(jsEntryPoint) : browserify(jsEntryPoint))
  bundler.transform('browserify-shim')
  bundler.on('update', rebundle)

  function rebundle() {
    var stream = bundler.bundle({
        debug: !gutil.env.production
      , standalone: 'forms'
      , detectGlobals: false
      })
      .pipe(source('newforms.js'))
      .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
      .pipe(gulp.dest('./'))

    if (gutil.env.production) {
      stream = stream
        .pipe(rename('newforms.min.js'))
        .pipe(streamify(uglify()))
        .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
        .pipe(gulp.dest('./'))
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
  return gulp.src('./newforms*.js')
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

gulp.task('default', function() {
  gulp.start('browserify-js', 'watch')
})
