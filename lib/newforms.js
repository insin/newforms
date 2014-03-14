'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var env = require('./env')
var util = require('./util')
var formats = require('./formats')
var widgets = require('./widgets')
var fields = require('./fields')
var forms = require('./forms')
var formsets = require('./formsets')

object.extend(
  module.exports
, { env: env
  , ValidationError: validators.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      formatToArray: util.formatToArray
    , makeChoices: util.makeChoices
    , prettyName: util.prettyName
    }
  , formats: formats
  , validators: validators
  }
, widgets
, fields
, forms
, formsets
)
