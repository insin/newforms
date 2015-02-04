'use strict';

var url = require('isomorph/url')

var CharField = require('./CharField')
var URLInput = require('../widgets/URLInput')

var {URLValidator} = require('validators')
var {strip} = require('../util')

/**
 * Validates that its input appears to be a valid URL.
 * @constructor
 * @extends {CharField}
 * @param {Object=} kwargs
 */
var URLField = CharField.extend({
  widget: URLInput
, defaultErrorMessages: {
    invalid: 'Enter a valid URL.'
  }
, defaultValidators: [URLValidator()]

, constructor: function URLField(kwargs) {
    if (!(this instanceof URLField)) { return new URLField(kwargs) }
    CharField.call(this, kwargs)
  }
})

URLField.prototype.toJavaScript = function(value) {
  if (value) {
    var urlFields = url.parseUri(value)
    if (!urlFields.protocol) {
      // If no URL protocol given, assume http://
      urlFields.protocol = 'http'
    }
    if (!urlFields.path) {
      // The path portion may need to be added before query params
      urlFields.path = '/'
    }
    value = url.makeUri(urlFields)
  }
  return CharField.prototype.toJavaScript.call(this, value)
}

URLField.prototype.clean = function(value) {
  value = strip(this.toJavaScript(value))
  return CharField.prototype.clean.call(this, value)
}

module.exports = URLField