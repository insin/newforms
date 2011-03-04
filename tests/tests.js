var qunit = require('qunit'),
    path = require('path');

qunit.options.coverage = false;

function abspath(p) {
  return path.join(__dirname, p);
}

// time.js tests aren't dependent on newforms in any way
qunit.run({
  code: abspath('../src/time.js'),
  tests: abspath('time.js')
});

// newforms tests
var lib = abspath('../newforms.js')
path.exists(lib, function(exists) {
  if (!exists) {
    console.log(lib + " doesn't exist - run build.py");
    return;
  }

  qunit.run({
    code: lib,
    tests: ['util.js', 'validators.js', 'forms.js', 'formsets.js',
            'fields.js','errormessages.js', 'widgets.js', 'extra.js',
            'regressions.js'].map(abspath)
  });
});
