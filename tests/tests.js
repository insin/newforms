var qunit = require('qunit'),
    path = require('path');

// Built newforms library
var lib = '../newforms.js';

// Add local node_modules to require.paths() in test processes, so DOMBuilder
// doesn't need to be installed globally.
qunit.options.paths = '../node_modules'
qunit.options.deps = [
  {path: './customAsserts.js'},
  {path: 'DOMBuilder', namespace: 'DOMBuilder'}
];

path.exists(lib, function(exists) {
  if (!exists) {
    console.error(lib + " doesn't exist - run build.py to create it");
    return;
  }

  qunit.run([
    {
      code: {path: lib, namespace: 'forms'},
      tests: ['./time.js', './util.js', './validators.js', './forms.js',
              './formsets.js', './fields.js','./errormessages.js',
              './widgets.js', './extra.js', './regressions.js']
    }
  ]);
});
