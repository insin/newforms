'use strict';

var object = require('isomorph/object')

var env = require('../env')
var TextInput = require('./TextInput')

/**
 * An HTML <input type="password"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var PasswordInput = TextInput.extend({
  constructor: function PasswordInput(kwargs) {
    if (!(this instanceof PasswordInput)) { return new PasswordInput(kwargs) }
    kwargs = object.extend({renderValue: false}, kwargs)
    TextInput.call(this, kwargs)
    this.renderValue = kwargs.renderValue
  }
, inputType: 'password'
})

PasswordInput.prototype.render = function(name, value, kwargs) {
  if (!env.browser && !this.renderValue) {
    value = ''
  }
  return TextInput.prototype.render.call(this, name, value, kwargs)
}

module.exports = PasswordInput