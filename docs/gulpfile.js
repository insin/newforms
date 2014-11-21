var fs = require('fs')
var path = require('path')

var browserify = require('browserify')
var del = require('del')
var glob = require('glob')
var gulp = require('gulp')
var source = require('vinyl-source-stream')

var flatten = require('gulp-flatten')
var jshint = require('gulp-jshint')
var plumber = require('gulp-plumber')
var react = require('gulp-react')
var shell = require('gulp-shell')

var EXAMPLE_TEMPLATE = '<!DOCTYPE html>\n\
<head>\n\
  <meta charset="UTF-8">\n\
  <link rel="stylesheet" href="../css/newforms-examples.css">\n\
  <script src="../js/react.js"></script>\n\
  <script src="../js/newforms.js"></script>\n\
  <script src="../js/build/FormRenderer.js"></script>\n\
  <script src="../js/resizeIFrame.js"></script>\n\
</head>\n\
<body>\n\
  <script src="../js/build/{example}.js"></script>\n\
</body>'

gulp.task('clean-docs-html', function(cb) {
  del('./_static/html/*.html')
  cb()
})

gulp.task('docs-html', ['clean-docs-html'], function(cb) {
  glob.sync('./src/examples/*.jsx').forEach(function(file) {
    var example = path.basename(file, '.jsx')
    fs.writeFileSync('./_static/html/' + example + '.html',
                     EXAMPLE_TEMPLATE.replace(/{example}/, example))
  })
  cb()
})

gulp.task('clean-docs-js', function(cb) {
  del('./_static/js/build/*.js')
  cb()
})

gulp.task('build-docs-js', ['clean-docs-js'], function() {
  return gulp.src(['./src/**/*.js', './src/**/*.jsx'])
    .pipe(plumber())
    .pipe(react({harmony: true}))
    .pipe(flatten())
    .pipe(gulp.dest('./_static/js/build'))
})

gulp.task('docs-js', ['build-docs-js'], function() {
  return gulp.src('./_static/js/build/*.js')
    .pipe(jshint('./.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
})

gulp.task('docs', shell.task('make html', {cwd: '.'}))

gulp.task('watch', function() {
  gulp.watch(['./*.rst', './*.py'], ['docs'])
  gulp.watch(['./src/**/*.js', './src/**/*.jsx'], ['docs-js'])
})

gulp.task('default', ['docs-js', 'watch'])