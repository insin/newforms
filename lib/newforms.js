'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var util = require('./util')
var widgets = require('./widgets')
var fields = require('./fields')
var forms = require('./forms')
var formsets = require('./formsets')

object.extend(
  module.exports
, { ValidationError: validators.ValidationError
  , ErrorObject: util.ErrorObject
  , ErrorList: util.ErrorList
  , formData: util.formData
  , util: {
      prettyName: util.prettyName
    }
  }
, validators
, widgets
, fields
, forms
, formsets
)
