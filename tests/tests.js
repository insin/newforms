var path = require('path')

var qqunit = require('qqunit')
var object = require('isomorph/object')

object.extend(global, require('./customAsserts.js'))
// This is a manually modified version of React 0.9.0 which hardcodes
// ExecutionEnvironment.canUseDOM to false so React.renderComponentToString()
// doesn't throw errors.
global.React = window.React = require('../vendor/react-0.9.0-qunit-testmod.js')
global.isomorph = require('isomorph')
global.forms = require('../newforms.js')

var tests = [ 'util.js'
            , 'forms.js'
            , 'forms-server.js'
            , 'formsets.js'
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
            ].map(function(t) { return path.join(__dirname, t) })

qqunit.Runner.run(tests, function(stats) {
  process.exit(stats.failed)
})
