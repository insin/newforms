'use strict';

var is = require('isomorph/is')

function isFormAsync(constructor) {
  var proto = constructor.prototype
  if (proto.clean.length == 1) { return true }
  var fieldNames = Object.keys(proto.baseFields)
  for (var i = 0, l = fieldNames.length; i < l ; i++) {
    var customClean = proto._getCustomClean(fieldNames[i])
    if (is.Function(customClean) && customClean.length == 1) {
      return true
    }
  }
  return false
}

module.exports = isFormAsync