var gulp = require('gulp')

var browserify = require('gulp-browserify')
var concat = require('gulp-concat')
var header = require('gulp-header')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var rename = require('gulp-rename')
var uglify = require('gulp-uglify')
var gutil = require('gulp-util')

var pkg = require('./package.json');
var srcHeader = '/**\n\
 * newforms <%= pkg.version %> - https://github.com/insin/newforms\n\
 * MIT Licensed\n\
 */\n'

var jsPath = './lib/*.js'
var jsEntryPoint = './lib/newforms.js'

// Lints the build modules dir
gulp.task('lint', function() {
  return gulp.src(jsPath)
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

gulp.task('build-js', ['lint'], function(){
  var stream = gulp.src(jsEntryPoint, {read: false})
    .pipe(plumber())
    .pipe(browserify({
      debug: !gutil.env.production
    , standalone: 'forms'
    , detectGlobals: false
    }))
    .pipe(concat('newforms.js'))
    .pipe(header(srcHeader, {pkg: pkg}))
    .pipe(gulp.dest('./'))

  if (gutil.env.production) {
    stream = stream
      .pipe(rename('newforms.min.js'))
      .pipe(uglify())
      .pipe(header(srcHeader, {pkg: pkg}))
      .pipe(gulp.dest('./'))
  }

  return stream
})

// Copies browser build to ./dist, renaming to include a version number suffix
gulp.task('dist', ['build-js'], function() {
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
  gulp.watch(jsPath, ['build-js'])
})

gulp.task('default', function() {
  gulp.start('build-js', 'watch')
})
