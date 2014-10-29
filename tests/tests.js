var path = require('path')

var qqunit = require('qqunit')
var object = require('isomorph/object')

// qqunit doesn't set up a navigator object as part of its environmental fakery
global.navigator = {userAgent: 'fake'}

global.NodeList = require('../node_modules/qqunit/node_modules/jsdom/lib/jsdom').dom.level3.core.NodeList

object.extend(global, require('./customAsserts.js'))
global.React = window.React = require('../vendor/react-0.12.0.js')
global.isomorph = require('isomorph')
global.forms = require('../newforms.js')

var tests = [ 'util.js'
            , 'formats.js'
            , 'locales.js'
            , 'forms.js'
            , 'forms-browser.js'
            , 'forms-server.js'
            , 'formsets.js'
            , 'formsets-server.js'
            , 'fields.js'
            , 'fields-browser.js'
            , 'fields-server.js'
            , 'errormessages.js'
            , 'errormessages-server.js'
            , 'widgets.js'
            , 'widgets-server.js'
            , 'extra.js'
            , 'regressions.js'
            , 'docs.js'
            , 'docs-server.js'
            , 'dom-initial.js'
            ].map(function(t) { return path.join(__dirname, t) })

qqunit.Runner.run(tests, function(stats) {
  process.exit(stats.failed)
})
