'use strict';

var validators = require('validators')

var CharField = require('./CharField')

/**
 * Validates that its input is a valid IPv4 address.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 * @deprecated in favour of GenericIPAddressField
 */
var IPAddressField = CharField.extend({
  defaultValidators: [validators.validateIPv4Address]

, constructor: function IPAddressField(kwargs) {
    if (!(this instanceof IPAddressField)) { return new IPAddressField(kwargs) }
    CharField.call(this, kwargs)
  }
})

module.exports = IPAddressField