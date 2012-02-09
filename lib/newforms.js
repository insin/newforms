var object = require('isomorph/lib/object')

var util = require('./util')
  , validators = require('./validators')
  , ipv6 = require('./ipv6')
  , widgets = require('./widgets')
  , fields = require('./fields')
  , forms = require('./forms')
  , formsets = require('./formsets')
  , models = require('./models')

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
    , parseUri: util.parseUri
    , makeUri: util.makeUri
    , ipv6: ipv6
    }
  }
, validators
, widgets
, fields
, forms
, formsets
, models
)
