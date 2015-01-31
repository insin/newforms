'use strict';

var object = require('isomorph/object')
var validators = require('validators')

var CharField = require('./CharField')

var cleanIPv6Address = validators.ipv6.cleanIPv6Address

var GenericIPAddressField = CharField.extend({
  constructor: function GenericIPAddressField(kwargs) {
    if (!(this instanceof GenericIPAddressField)) { return new GenericIPAddressField(kwargs) }
    kwargs = object.extend({protocol: 'both', unpackIPv4: false}, kwargs)
    this.unpackIPv4 = kwargs.unpackIPv4
    this.defaultValidators =
      validators.ipAddressValidators(kwargs.protocol, kwargs.unpackIPv4).validators
    CharField.call(this, kwargs)
  }
})

GenericIPAddressField.prototype.toJavaScript = function(value) {
  if (!value) {
    return ''
  }
  if (value && value.indexOf(':') != -1) {
    return cleanIPv6Address(value, {unpackIPv4: this.unpackIPv4})
  }
  return value
}


module.exports = GenericIPAddressField