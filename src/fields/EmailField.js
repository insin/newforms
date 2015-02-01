'use strict';

var validators = require('validators')

var util = require('../util')

var CharField = require('./CharField')
var EmailInput = require('../widgets/EmailInput')

/**
 * Validates that its input appears to be a valid e-mail address.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var EmailField = CharField.extend({
  widget: EmailInput
, defaultValidators: [validators.validateEmail]

, constructor: function EmailField(kwargs) {
    if (!(this instanceof EmailField)) { return new EmailField(kwargs) }
    CharField.call(this, kwargs)
  }
})

EmailField.prototype.clean = function(value) {
  value = util.strip(this.toJavaScript(value))
  return CharField.prototype.clean.call(this, value)
}


module.exports = EmailField