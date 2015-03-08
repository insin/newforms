var fs = require('fs')

var browserify = require('browserify')
var gulp = require('gulp')
var source = require('vinyl-source-stream')

var concat = require('gulp-concat')
var flatten = require('gulp-flatten')
var flattenRequires = require('gulp-flatten-requires')
var header = require('gulp-header')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var react = require('gulp-react')
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

var jsSrcPath = './src/**/*.js*'
var jsLibPath = './lib/*.js*'
var jsEntryPoint = './lib/newforms.js'

gulp.task('transpile-js', function() {
  return gulp.src(jsSrcPath)
    .pipe(plumber())
    .pipe(react({harmony: true}))
    .pipe(flatten())
    .pipe(flattenRequires())
    .pipe(gulp.dest('./lib'))
})

gulp.task('lint', ['transpile-js'], function() {
  return gulp.src(jsLibPath)
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

gulp.task('browserify-js', ['lint'], function() {
  var b = browserify(jsEntryPoint, {
    debug: !!gutil.env.debug
  , standalone: 'forms'
  , detectGlobals: false
  })
  b.transform('browserify-shim')

  var stream = b.bundle()
    .pipe(source('newforms.js'))
    .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
    .pipe(gulp.dest('./dist'))

  if (gutil.env.production) {
    stream = stream
      .pipe(rename('newforms.min.js'))
      .pipe(streamify(uglify()))
      .pipe(streamify(header(srcHeader, {pkg: pkg, dev: dev})))
      .pipe(gulp.dest('./dist'))
  }

  return stream
})

gulp.task('npm-copy', ['lint'], function() {
  return gulp.src([jsLibPath, './LICENSE.md', './package.json', './README.md'])
    .pipe(gulp.dest('./npm-newforms'))
})

gulp.task('npm', ['npm-copy'], function(cb) {
  var pkg = require('./package.json')
  pkg.main = './newforms.js'
  delete pkg.devDependencies
  delete pkg.scripts
  fs.writeFile('./npm-newforms/package.json', JSON.stringify(pkg, null, 2), cb)
})

gulp.task('watch', function() {
  gulp.watch(jsSrcPath, ['browserify-js'])
})

gulp.task('default', ['browserify-js', 'watch'])