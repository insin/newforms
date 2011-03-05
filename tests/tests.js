var qunit = require('qunit'),
    path = require('path');

qunit.options.coverage = false;
qunit.options.deps = [
 {file: 'customAsserts.js'},
 {module: 'DOMBuilder', as: 'DOMBuilder'}
];

var lib = '../newforms.js';

path.exists(lib, function(exists) {
  if (!exists) {
    console.log(lib + " doesn't exist - run build.py to create it");
    return;
  }

  qunit.run([
    {
      code: {file: '../src/time.js', as: 'time'},
      tests: './time.js'
    },
    {
      code: {file: lib, as: 'forms'},
      tests: ['util.js', 'validators.js', 'forms.js', 'formsets.js',
              'fields.js','errormessages.js', 'widgets.js', 'extra.js',
              'regressions.js']
    }
  ]);
});
