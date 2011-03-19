var qunit = require('qunit'),
    path = require('path');

qunit.options.coverage = false;
qunit.options.deps = [
  {path: './customAsserts.js'},
  {path: 'DOMBuilder', namespace: 'DOMBuilder'}
];

var lib = '../newforms.js';

path.exists(lib, function(exists) {
  if (!exists) {
    console.log(lib + " doesn't exist - run build.py to create it");
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
