'use strict';

var Input = require('./Input')

/**
 * An HTML <input type="hidden"> widget.
 * @constructor
 * @extends {Input}
 * @param {Object=} kwargs
 */
var HiddenInput = Input.extend({
  constructor: function HiddenInput(kwargs) {
    if (!(this instanceof HiddenInput)) { return new HiddenInput(kwargs) }
    Input.call(this, kwargs)
  }
, inputType: 'hidden'
, isHidden: true
})

module.exports = HiddenInput