var path = require('path')

var qqunit = require('qqunit')
var object = require('isomorph/object')

// qqunit doesn't set up a navigator object as part of its environmental fakery
global.navigator = {userAgent: 'fake'}

object.extend(global, require('./customAsserts.js'))
global.React = window.React = require('react/dist/react.js')
global.ReactDOMServer = window.ReactDOMServer = require('react-dom/server')
global.isomorph = require('isomorph')
global.forms = require('../dist/newforms.js')

var tests = [
      'extra.js'
            ].map(function(t) { return path.join(__dirname, t) })

qqunit.Runner.run(tests, function(stats) {
  process.exit(stats.failed)
})
