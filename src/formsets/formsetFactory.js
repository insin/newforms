'use strict';

var object = require('isomorph/object')

var constants = require('../constants')
var util = require('../util')

var FormSet = require('../FormSet')

if ("production" !== process.env.NODE_ENV) {
  var warnedFormsetFactoryDeprecated = false
}

/**
 * Creates a FormSet constructor for the given Form constructor.
 * @param {Form} form
 * @param {Object=} kwargs
 */
function formsetFactory(form, kwargs) {
  if ("production" !== process.env.NODE_ENV) {
    if (!warnedFormsetFactoryDeprecated) {
      util.warning(
        'formsetFactory is deprecated and will be removed in version 0.12 - ' +
        'extend FormSet directly with FormSet.extend() instead'
      )
      warnedFormsetFactoryDeprecated = true
    }
  }

  kwargs = object.extend({
    form: form, formset: FormSet,
    extra: 1, canOrder: false, canDelete: false,
    maxNum: constants.FORMSET_DEFAULT_MAX_NUM, validateMax: false,
    minNum: constants.FORMSET_DEFAULT_MIN_NUM, validateMin: false
  }, kwargs)

  return object.pop(kwargs, 'formset').extend(kwargs)
}

module.exports = formsetFactory