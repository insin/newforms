var path = require('path')

var qqunit = require('qqunit')
  , object = require('isomorph/object')

object.extend(global, require('./customAsserts'))
// This is a manually modified version of React 0.9.0 which hardcodes
// ExecutionEnvironment.canUseDOM to false so React.renderComponentToString()
// doesn't throw errors.
global.React = require('../vendor/react-0.9.0-qunit-testmod.js')
global.isomorph = require('isomorph')
global.forms = require('../lib/newforms')

var tests = [ 'util.js'
            , 'forms.js'
            , 'formsets.js'
            , 'fields.js'
            , 'errormessages.js'
            , 'widgets.js'
            , 'extra.js'
            , 'regressions.js'
            , 'docs.js'
            ].map(function(t) { return path.join(__dirname, t) })

qqunit.Runner.run(tests, function(stats) {
  process.exit(stats.failed)
})
