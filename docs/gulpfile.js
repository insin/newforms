var fs = require('fs')
var path = require('path')

var browserify = require('browserify')
var del = require('del')
var envify = require('envify/custom')
var glob = require('glob')
var gulp = require('gulp')
var source = require('vinyl-source-stream')
var touch = require('touch')
var transform = require('vinyl-transform')

var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var react = require('gulp-react')
var shell = require('gulp-shell')
var streamify = require('gulp-streamify')
var uglify = require('gulp-uglify')

var EXAMPLE_TEMPLATE = '<!DOCTYPE html>\n\
<head>\n\
  <meta charset="UTF-8">\n\
  <title>newforms {example} example</title>\n\
  <link rel="stylesheet" href="../css/newforms-examples.css">\n\
  <script src="../js/deps.js"></script>\n\
</head>\n\
<body>\n\
  <script src="../js/examples/{example}.js"></script>\n\
</body>'

process.env.NODE_ENV = 'development'

gulp.task('bundle-deps', function() {
  var b = browserify({
    detectGlobals: false
  })
  b.require('react')
  b.require('react-dom')
  b.require('../lib/newforms', {expose: 'newforms'})
  b.transform('envify', {global: true})

  return b.bundle()
    .pipe(source('deps.js'))
    .pipe(gulp.dest('./_static/js'))
})

gulp.task('clean-html', function(cb) {
  del('./_static/html/*.html', cb)
})

gulp.task('html', ['clean-html'], function(cb) {
  glob.sync('./src/examples/*.jsx').forEach(function(file) {
    var example = path.basename(file, '.jsx')
    fs.writeFileSync('./_static/html/' + example + '.html',
                     EXAMPLE_TEMPLATE.replace(/{example}/g, example))
  })
  cb()
})

gulp.task('clean-js', function(cb) {
  del(['./_build/js/**/*', './_static/js/examples/*.js'], cb)
})

gulp.task('transpile-js', ['clean-js'], function() {
  return gulp.src('./src/**/*.js*')
    .pipe(plumber())
    .pipe(react({harmony: true}))
    .pipe(gulp.dest('./_build/js'))
})

gulp.task('lint-js', ['transpile-js'], function() {
  return gulp.src('./_static/js/build/*.js')
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

gulp.task('js', ['lint-js'], function() {
  var browserified = transform(function(filename) {
    var b = browserify(filename)
    b.external('react')
    b.external('react-dom')
    b.external('newforms')
    return b.bundle()
  })

  return gulp.src('./_build/js/examples/*.js')
    .pipe(browserified)
    .pipe(gulp.dest('./_static/js/examples'))
})

gulp.task('docs', shell.task('make html', {cwd: '.'}))

gulp.task('js-and-docs', ['html', 'js'], function(cb) {
  touch('./index.rst', cb)
})

gulp.task('watch', function() {
  gulp.watch(['./*.rst', './*.py'], ['docs'])
  gulp.watch(['./src/**/*.js', './src/**/*.jsx'], ['js-and-docs'])
})

gulp.task('default', ['docs', 'watch'])
