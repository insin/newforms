'use strict';

var TextInput = require('./TextInput')

/**
 * An HTML <input type="url"> widget.
 * @constructor
 * @extends {TextInput}
 * @param {Object=} kwargs
 */
var URLInput = TextInput.extend({
  constructor: function URLInput(kwargs) {
    if (!(this instanceof URLInput)) { return new URLInput(kwargs) }
    TextInput.call(this, kwargs)
  }
, inputType: 'url'
})

module.exports = URLInput