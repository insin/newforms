'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var env = require('./env')
var fields = require('./fields')
var formats = require('./formats')
var forms = require('./forms')
var formsets = require('./formsets')
var locales = require('./locales')
var util = require('./util')
var widgets = require('./widgets')

var ErrorList = require('./ErrorList')
var ErrorObject = require('./ErrorObject')

module.exports = object.extend({
  addLocale: locales.addLocale
, env: env
, ErrorList: ErrorList
, ErrorObject: ErrorObject
, formats: formats
, formData: util.formData
, locales: locales
, setDefaultLocale: locales.setDefaultLocale
, util: util
, validateAll: util.validateAll
, ValidationError: validators.ValidationError
, validators: validators
}, fields, forms, formsets, widgets)
