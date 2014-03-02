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

gulp.task('watch', function() {
  gulp.watch(jsPath, ['build-js'])
})

gulp.task('default', function() {
  gulp.start('build-js', 'watch')
})
