'use strict';

var is = require('isomorph/is')
var validators = require('validators')

var CharField = require('./CharField')

/**
 * Validates that its input matches a given regular expression.
 * @constructor
 * @extends {CharField}
 * @param {(RegExp|string)} regex
 * @param {Object=} kwargs
 */
var RegexField = CharField.extend({
  constructor: function RegexField(regex, kwargs) {
    if (!(this instanceof RegexField)) { return new RegexField(regex, kwargs) }
    CharField.call(this, kwargs)
    if (is.String(regex)) {
      regex = new RegExp(regex)
    }
    this.regex = regex
    this.validators.push(validators.RegexValidator({regex: this.regex}))
  }
})

module.exports = RegexField