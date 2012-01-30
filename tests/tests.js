var qunit = require('qunit')
  , path = require('path')

qunit.options.deps = [
  {path: path.join(__dirname, 'customAsserts.js')},
  {path: 'DOMBuilder', namespace: 'DOMBuilder'}
]

qunit.run({
  code: {path: path.join(__dirname, '../src/newforms.js'), namespace: 'forms'}
, tests: [ path.join(__dirname, 'util.js')
         , path.join(__dirname, 'validators.js')
         , path.join(__dirname, 'forms.js')
         , path.join(__dirname, 'formsets.js')
         , path.join(__dirname, 'fields.js')
         , path.join(__dirname, 'errormessages.js')
         , path.join(__dirname, 'widgets.js')
         , path.join(__dirname, 'extra.js')
         , path.join(__dirname, 'regressions.js')
         ]
})
