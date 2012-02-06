var object = require('isomorph/lib/object')

var util = require('./util')

object.extend(
  module.exports
, { callValidator: util.callValidator
  , isCallable: util.isCallable
  , ValidationError: util.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      iterate: util.iterate
    , prettyName: util.prettyName
    , strip: util.strip
    , parseUri: util.parseUri
    , makeUri: util.makeUri
    }
  }
, require('./validators')
, require('./widgets')
, require('./fields')
, require('./forms')
, require('./formsets')
, require('./models')
)
