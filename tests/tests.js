var qunit = require('qunit')
  , path = require('path');

function abspath(p) {
  return path.join(__dirname, p);
}

// Built newforms library
var lib = abspath('../newforms.js');

qunit.options.deps = [
  {path: abspath('customAsserts.js')},
  {path: 'DOMBuilder', namespace: 'DOMBuilder'}
];

path.exists(lib, function(exists) {
  if (!exists) {
    console.error(lib + " doesn't exist - run build.py to create it");
    return;
  }

  qunit.run({
    code: {path: lib, namespace: 'forms'},
    tests: ['time.js', 'util.js', 'validators.js', 'forms.js',
            'formsets.js', 'fields.js','errormessages.js',
            'widgets.js', 'extra.js', 'regressions.js'].map(abspath)
  });
});
