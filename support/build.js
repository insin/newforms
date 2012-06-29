var path = require('path')

var buildumb = require('buildumb')

buildumb.build({
  root: path.normalize(path.join(__dirname, '..'))
, modules: {
  // isomorph
    'node_modules/isomorph/is.js'     : ['isomorph/is', './is']
  , 'node_modules/isomorph/format.js' : 'isomorph/format'
  , 'node_modules/isomorph/object.js' : 'isomorph/object'
  , 'node_modules/isomorph/array.js'  : 'isomorph/array'
  , 'node_modules/isomorph/copy.js'   : 'isomorph/copy'
  , 'node_modules/isomorph/time.js'   : 'isomorph/time'
  , 'node_modules/isomorph/url.js'    : 'isomorph/url'
  // Concur
  , 'node_modules/Concur/lib/concur.js': 'Concur'
  // DOMBuilder
  , 'node_modules/DOMBuilder/lib/dombuilder/core.js' : ['./dombuilder/core', './core']
  , 'node_modules/DOMBuilder/lib/dombuilder/dom.js'  : './dombuilder/dom'
  , 'node_modules/DOMBuilder/lib/dombuilder/html.js' : './dombuilder/html'
  , 'node_modules/DOMBuilder/support/DOMBuilder.js'  : 'DOMBuilder'
  // validators + deps
  , 'node_modules/validators/node_modules/punycode/punycode.js' : 'punycode'
  , 'node_modules/validators/lib/errors.js'                     : './errors'
  , 'node_modules/validators/lib/ipv6.js'                       : './ipv6'
  , 'node_modules/validators/lib/validators.js'                 : ['./validators', 'validators']
  // newforms
  , 'lib/util.js'       : './util'
  , 'lib/widgets.js'    : './widgets'
  , 'lib/fields.js'     : './fields'
  , 'lib/forms.js'      : './forms'
  , 'lib/formsets.js'   : './formsets'
  , 'lib/models.js'     : './models'
  , 'lib/newforms.js'   : 'newforms'
  }
, exports: {
    'forms': 'newforms'
  }
, exposeRequire: true
, output: 'newforms.js'
, compress: 'newforms.min.js'
, header: buildumb.formatTemplate(path.join(__dirname, 'header.js'),
                                  require('../package.json').version)
})
